
import { Circle, CircleMember } from '../types';

import { supabase } from './supabase';
import { socialRateLimiter, RateLimitError } from './socialRateLimiter';
import {
    validateCircleName,
    validateCircleDescription,
    validateCircleCode,
    validateChatMessage,
} from '../utils/inputValidation';
import { generateCircleCode } from '../utils/secureCodeGenerator';

export class CircleError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'CircleError';
    }
}

export const circleService = {
    /**
     * Create a new circle
     * 
     * Security improvements:
     * - Rate limited (5 per day)
     * - Input validation on name/description
     * - Cryptographically secure code generation
     */
    async createCircle(name: string, description?: string): Promise<Circle | null> {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new CircleError('User not authenticated', 'UNAUTHORIZED');

        // Rate limit check
        await socialRateLimiter.enforce('circleCreation', user.id);

        // Validate and sanitize inputs
        const nameValidation = validateCircleName(name);
        if (!nameValidation.valid) {
            throw new CircleError(nameValidation.error || 'Invalid circle name', 'VALIDATION_ERROR');
        }

        const descValidation = validateCircleDescription(description || '');
        if (!descValidation.valid) {
            throw new CircleError(descValidation.error || 'Invalid description', 'VALIDATION_ERROR');
        }

        // Generate secure code
        const code = generateCircleCode();

        const { data: circleData, error: circleError } = await supabase
            .from('circles')
            .insert({
                name: nameValidation.sanitized,
                code,
                description: descValidation.sanitized,
                created_by: user.id
            })
            .select()
            .single();

        if (circleError) {
            console.error('Error creating circle:', circleError);
            // Check for code collision and retry
            if (circleError.code === '23505' && circleError.message.includes('code')) {
                // Retry with new code (up to 3 attempts handled by secure generator)
                return this.createCircle(name, description);
            }
            throw new CircleError('Failed to create circle', 'DATABASE_ERROR');
        }

        // Add creator as owner
        const { error: memberError } = await supabase
            .from('circle_members')
            .insert({ circle_id: circleData.id, user_id: user.id, role: 'admin' });

        if (memberError) {
            console.error('Error adding creator as member:', memberError);
            throw memberError;
        }

        // System message
        await this.sendSystemMessage(circleData.id, `Circle "${name}" was created.`);

        return circleData;
    },

    /**
     * Join a circle by code
     * 
     * Security improvements:
     * - Rate limited (20 per day)
     * - Input validation on code format
     */
    async joinCircle(code: string): Promise<Circle | null> {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new CircleError('User not authenticated', 'UNAUTHORIZED');

        // Rate limit check
        await socialRateLimiter.enforce('circleJoin', user.id);

        // Validate code format
        const codeValidation = validateCircleCode(code);
        if (!codeValidation.valid) {
            throw new CircleError(codeValidation.error || 'Invalid code format', 'VALIDATION_ERROR');
        }

        const { data: circleData, error: findError } = await supabase
            .from('circles')
            .select('id, name, code, description, avatar_url, created_by, created_at')
            .eq('code', codeValidation.sanitized!)
            .single();

        if (findError || !circleData) throw new CircleError('Circle not found', 'NOT_FOUND');

        // Check if already a member
        const { data: existingMember } = await supabase
            .from('circle_members')
            .select('role')
            .eq('circle_id', circleData.id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingMember) throw new CircleError('Already a member of this circle', 'ALREADY_MEMBER');

        const { error: joinError } = await supabase
            .from('circle_members')
            .insert({ circle_id: circleData.id, user_id: user.id, role: 'member' });

        if (joinError) throw joinError;

        // Get user name for system message
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

        await this.sendSystemMessage(
            circleData.id,
            `${profile?.full_name || 'Someone'} joined the circle.`
        );

        return circleData;
    },

    /**
     * Get all circles for the current user
     */
    async getUserCircles(): Promise<Circle[]> {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return [];

        // Single query approach instead of N+1
        const { data, error } = await supabase
            .from('circle_members')
            .select(`
                role,
                circles (
                    id, name, code, description, avatar_url, created_by, created_at,
                    circle_members (count)
                )
            `)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching user circles:', error);
            return [];
        }

        const circles: Circle[] = data.map((row: any) => {
            const circle = row.circles as any;
            // The count is returned as an array of objects having a count property.
            const memberCount = circle.circle_members?.[0]?.count || 1;

            // Remove the nested circle_members to match the Circle interface
            const formattedCircle = { ...circle };
            delete formattedCircle.circle_members;

            return {
                ...formattedCircle,
                current_user_role: row.role,
                member_count: memberCount,
                weekly_xp: 0
            };
        });

        return circles;
    },

    /**
     * Leave a circle
     */
    async leaveCircle(circleId: string): Promise<void> {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();

        await supabase
            .from('circle_members')
            .delete()
            .eq('circle_id', circleId)
            .eq('user_id', user.id);

        await this.sendSystemMessage(circleId, `${profile?.full_name || 'Someone'} left the circle.`);
    },

    /**
     * Get all members of a circle with their profile data
     */
    async getCircleMembers(circleId: string, page: number = 1, limit: number = 50): Promise<CircleMember[]> {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error } = await supabase
            .from('circle_members')
            .select(`
                circle_id,
                user_id,
                role,
                joined_at,
                profiles!circle_members_user_id_profiles_fkey (
                    id,
                    full_name,
                    avatar_url,
                    xp,
                    level
                )
            `)
            .eq('circle_id', circleId)
            // Order by role and then joined_at if possible, otherwise just a stable sort
            .order('joined_at', { ascending: true })
            .range(from, to);

        if (error) {
            console.error('Error fetching circle members:', error);
            return [];
        }

        return data.map((row: any) => ({
            circle_id: row.circle_id,
            user_id: row.user_id,
            role: row.role,
            joined_at: row.joined_at,
            profile: row.profiles ? {
                full_name: (row.profiles as any).full_name,
                avatar_url: (row.profiles as any).avatar_url,
                xp: (row.profiles as any).xp || 0,
                level: (row.profiles as any).level || 1,
            } : null
        }));
    },

    /**
     * Get leaderboard for a specific circle (paginated)
     */
    async getCircleLeaderboard(circleId: string, page: number = 1, limit: number = 50): Promise<any[]> {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Perform an inner join on profiles directly from circle_members
        // to avoid selecting 10k users and putting them into an .in() array
        const { data, error } = await supabase
            .from('circle_members')
            .select(`
                profiles!inner (
                    id, full_name, avatar_url, xp, level
                )
            `)
            .eq('circle_id', circleId)
        // It's tricky to order by a joined table directly in standard PostgREST without a view
        // but we can try ordering by profiles(xp) if the schema allows it, OR
        // we create a custom view. Given current schema, querying profiles and joining circle_members
        // might be cleaner, but requires an implicit join or reverse query. Let's query profiles directly instead.

        // Better scalable approach: target the profiles table and inner join circle_members
        const { data: leaderboardData, error: lbError } = await supabase
            .from('profiles')
            .select(`
                id, full_name, avatar_url, xp, level,
                circle_members!inner (circle_id)
            `)
            .eq('circle_members.circle_id', circleId)
            .order('xp', { ascending: false })
            .range(from, to);

        if (lbError) {
            console.error('Error fetching circle leaderboard:', lbError);
            return [];
        }

        // Strip the circle_members join wrapper out of the returned data map
        return (leaderboardData || []).map((row: any) => {
            const { circle_members, ...profileData } = row;
            return profileData;
        });
    },

    // =============================================
    // Admin Operations
    // =============================================

    /**
     * Promote a member to admin
     */
    async promoteMember(circleId: string, userId: string): Promise<void> {
        await this._verifyAdmin(circleId);

        const { error } = await supabase
            .from('circle_members')
            .update({ role: 'admin' })
            .eq('circle_id', circleId)
            .eq('user_id', userId);

        if (error) throw new Error(`Failed to promote: ${error.message}`);

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle();
        await this.sendSystemMessage(circleId, `${profile?.full_name || 'A member'} was promoted to Admin.`);
    },

    /**
     * Demote an admin to member
     */
    async demoteMember(circleId: string, userId: string): Promise<void> {
        await this._verifyAdmin(circleId);

        const { error } = await supabase
            .from('circle_members')
            .update({ role: 'member' })
            .eq('circle_id', circleId)
            .eq('user_id', userId);

        if (error) throw new Error(`Failed to demote: ${error.message}`);

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle();
        await this.sendSystemMessage(circleId, `${profile?.full_name || 'An admin'} was demoted to member.`);
    },

    /**
     * Remove a member from the circle (Admin only)
     */
    async removeMember(circleId: string, userId: string): Promise<void> {
        await this._verifyAdmin(circleId);

        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle();

        const { error } = await supabase
            .from('circle_members')
            .delete()
            .eq('circle_id', circleId)
            .eq('user_id', userId);

        if (error) throw error;

        await this.sendSystemMessage(circleId, `${profile?.full_name || 'A member'} was removed from the circle.`);
    },

    /**
     * Update circle info (Admin only)
     */
    async updateCircle(circleId: string, updates: { name?: string; description?: string; chat_mode?: 'everyone' | 'admin_only' }): Promise<void> {
        await this._verifyAdmin(circleId);

        const { error } = await supabase
            .from('circles')
            .update(updates)
            .eq('id', circleId);

        if (error) throw new Error(`Failed to update circle: ${error.message}`);
    },

    /**
     * Delete the entire circle (Admin only)
     */
    async deleteCircle(circleId: string): Promise<void> {
        await this._verifyAdmin(circleId);

        // Delete messages first, then members, then circle
        await supabase.from('circle_messages').delete().eq('circle_id', circleId);
        const { error: deleteMembersError } = await supabase
            .from('circle_members').delete().eq('circle_id', circleId);
        if (deleteMembersError) throw deleteMembersError;

        const { error: deleteCircleError } = await supabase
            .from('circles').delete().eq('id', circleId);
        if (deleteCircleError) throw deleteCircleError;
    },

    /**
     * Get the chat mode setting for a circle
     */
    async getChatMode(circleId: string): Promise<'everyone' | 'admin_only'> {
        const { data, error } = await supabase
            .from('circles')
            .select('chat_mode')
            .eq('id', circleId)
            .maybeSingle();

        if (error || !data) return 'everyone';
        return data.chat_mode || 'everyone';
    },

    // =============================================
    // Chat Operations
    // =============================================

    /**
     * Send a message to a circle
     * 
     * Security improvements:
     * - Rate limited (100 per hour)
     * - Input validation and sanitization
     */
    async sendMessage(circleId: string, content: string): Promise<any> {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new CircleError('Not authenticated', 'UNAUTHORIZED');

        // Rate limit check
        await socialRateLimiter.enforce('messageSend', user.id);

        // Validate and sanitize message
        const messageValidation = validateChatMessage(content);
        if (!messageValidation.valid) {
            throw new CircleError(messageValidation.error || 'Invalid message', 'VALIDATION_ERROR');
        }

        const { data, error } = await supabase
            .from('circle_messages')
            .insert({
                circle_id: circleId,
                user_id: user.id,
                content: messageValidation.sanitized,
                is_system: false,
            })
            .select()
            .single();

        if (error) throw new CircleError(`Failed to send message: ${error.message}`, 'DATABASE_ERROR');
        return data;
    },

    /**
     * Send a system message (join/leave/promote notifications)
     */
    async sendSystemMessage(circleId: string, content: string): Promise<void> {
        try {
            // System messages bypass the RLS user_id check by using the current user
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            await supabase
                .from('circle_messages')
                .insert({
                    circle_id: circleId,
                    user_id: user.id,
                    content,
                    is_system: true,
                });
        } catch (e) {
            // Don't fail the main operation if system message fails
            console.warn('Failed to send system message:', e);
        }
    },

    /**
     * Subscribe to new messages in a circle
     */
    subscribeToMessages(circleId: string, callback: (message: any) => void): { unsubscribe: () => void } {
        const channel = supabase
            .channel(`circle-messages:${circleId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'circle_messages',
                    filter: `circle_id=eq.${circleId}`
                },
                (payload) => {
                    const newMessage = payload.new;

                    // With the denormalization trigger (enrich_circle_message), 
                    // sender_name and sender_avatar are already on the row!
                    // No need to query profiles individually here anymore.

                    const formattedMessage = {
                        id: newMessage.id,
                        circleId: newMessage.circle_id,
                        userId: newMessage.user_id,
                        content: newMessage.content,
                        isSystem: newMessage.is_system,
                        createdAt: newMessage.created_at,
                        senderName: newMessage.sender_name || 'Unknown',
                        senderAvatar: newMessage.sender_avatar || null,
                    };

                    callback(formattedMessage);
                }
            )
            .subscribe();

        return {
            unsubscribe: () => {
                supabase.removeChannel(channel);
            }
        };
    },

    /**
     * Get messages for a circle (paginated, newest first)
     */
    async getMessages(circleId: string, limit = 50, before?: string): Promise<any[]> {
        // Query denormalized columns directly
        let query = supabase
            .from('circle_messages')
            .select(`
                id,
                circle_id,
                user_id,
                content,
                is_system,
                created_at,
                sender_name,
                sender_avatar
            `)
            .eq('circle_id', circleId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (before) {
            query = query.lt('created_at', before);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }

        // Return in chronological order (oldest first) for display
        return (data || []).reverse().map((msg: any) => ({
            id: msg.id,
            circleId: msg.circle_id,
            userId: msg.user_id,
            content: msg.content,
            isSystem: msg.is_system,
            createdAt: msg.created_at,
            senderName: msg.sender_name || 'Unknown',
            senderAvatar: msg.sender_avatar || null,
        }));
    },

    /**
     * Delete a message (Admin only)
     * 
     * Security improvements:
     * - Verify admin permissions on the circle before deleting
     */
    async deleteMessage(messageId: string): Promise<void> {
        // Fetch message first to know which circle it belongs to
        const { data: msg, error: fetchError } = await supabase
            .from('circle_messages')
            .select('circle_id')
            .eq('id', messageId)
            .single();

        if (fetchError || !msg) {
            throw new Error("Message not found");
        }

        // Verify admin permissions
        await this._verifyAdmin(msg.circle_id);

        const { error } = await supabase
            .from('circle_messages')
            .delete()
            .eq('id', messageId);

        if (error) throw new Error(`Failed to delete message: ${error.message}`);
    },

    // =============================================
    // Internal Helpers
    // =============================================

    async _verifyAdmin(circleId: string): Promise<void> {
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (!currentUser) throw new Error('Not authenticated');

        const { data: myRole } = await supabase
            .from('circle_members')
            .select('role')
            .eq('circle_id', circleId)
            .eq('user_id', currentUser.id)
            .single();

        if (!myRole || !['admin', 'owner'].includes(myRole.role)) {
            throw new Error('Only admins can perform this action');
        }
    }
};

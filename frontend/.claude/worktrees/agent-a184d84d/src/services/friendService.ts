import { supabase } from './supabase';
import { socialRateLimiter, RateLimitError } from './socialRateLimiter';
import { validateFriendCode } from '../utils/inputValidation';
import { generateFriendCode } from '../utils/secureCodeGenerator';

export interface Friend {
    id: string;          // friendship row id
    friendId: string;    // the friend's user id
    name: string;
    avatarUrl?: string;
    friendCode?: string;
    totalXp: number;
    addedAt: string;
}

/**
 * Custom error class for friend-related errors
 */
export class FriendError extends Error {
    constructor(
        message: string,
        public code: FriendErrorCode,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'FriendError';
    }
}

export type FriendErrorCode =
    | 'UNAUTHORIZED'
    | 'INVALID_CODE'
    | 'CODE_NOT_FOUND'
    | 'ALREADY_FRIENDS'
    | 'SELF_ADD'
    | 'RATE_LIMITED'
    | 'DATABASE_ERROR';

/**
 * Generate a cryptographically secure friend code
 * Uses Web Crypto API instead of Math.random()
 */
function generateCode(): string {
    return generateFriendCode();
}

export const friendService = {

    /**
     * Get or create a unique friend code for the current user
     */
    async getOrCreateFriendCode(userId: string): Promise<string | null> {
        // 1. Check if user already has a code
        const { data: profile } = await supabase
            .from('profiles')
            .select('friend_code')
            .eq('id', userId)
            .single();

        if (profile?.friend_code) return profile.friend_code;

        // 2. Generate and save a new code (retry on collision)
        for (let attempt = 0; attempt < 5; attempt++) {
            const code = generateCode();
            const { error } = await supabase
                .from('profiles')
                .update({ friend_code: code })
                .eq('id', userId);

            if (!error) return code;
            if (error.code === '23505') continue; // unique violation, retry
            console.error('[FriendService] Failed to save code:', error);
            return null;
        }

        return null;
    },

    /**
     * Add a friend by their friend code
     * Includes rate limiting and input validation
     */
    async addFriendByCode(code: string): Promise<{ success: boolean; error?: string }> {
        // 1. Authenticate user
        const { data: user } = await supabase.auth.getUser();
        const myId = user?.user?.id;
        if (!myId) {
            return { success: false, error: 'You must be signed in.' };
        }

        // 2. Enforce rate limiting
        try {
            await socialRateLimiter.enforce('friendRequest', myId);
        } catch (error) {
            if (error instanceof RateLimitError) {
                return {
                    success: false,
                    error: `Too many friend requests. Please wait ${Math.ceil(error.retryAfterMs / 60000)} minutes.`
                };
            }
            throw error;
        }

        // 3. Validate and normalize the friend code
        const normalizedCode = code.toUpperCase().trim();
        const validation = validateFriendCode(normalizedCode);

        if (!validation.valid) {
            return { success: false, error: validation.error || 'Invalid friend code format.' };
        }

        // 4. Lookup user by friend_code
        const { data: target, error: lookupErr } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('friend_code', normalizedCode)
            .single();

        if (lookupErr || !target) {
            return { success: false, error: 'Friend code not found. Please check and try again.' };
        }

        // 5. Check if trying to add self
        if (myId === target.id) {
            return { success: false, error: "You can't add yourself!" };
        }

        // 6. Check if already friends
        const { data: existing } = await supabase
            .from('friends')
            .select('id')
            .or(`and(user_id.eq.${myId},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${myId})`)
            .limit(1);

        if (existing && existing.length > 0) {
            return { success: false, error: `${target.full_name || 'This user'} is already your friend!` };
        }

        // 7. Insert bidirectional friendship
        const { error: insertErr } = await supabase
            .from('friends')
            .insert([
                { user_id: myId, friend_id: target.id },
                { user_id: target.id, friend_id: myId }
            ]);

        if (insertErr) {
            console.error('[FriendService] Insert failed:', insertErr);
            return { success: false, error: 'Failed to add friend. Try again.' };
        }

        return { success: true };
    },

    /**
     * Get list of friends with profile info and XP
     */
    async getFriends(userId: string): Promise<Friend[]> {
        const { data, error } = await supabase
            .from('friends')
            .select(`
                id,
                friend_id,
                created_at,
                friend:profiles!friends_friend_id_fkey(
                    id,
                    full_name,
                    avatar_url,
                    friend_code,
                    xp
                )
            `)
            .eq('user_id', userId);

        if (error || !data) {
            console.warn('[FriendService] Failed to fetch friends:', error);
            return [];
        }

        return data.map((row: any) => {
            const profile = row.friend;
            return {
                id: row.id,
                friendId: row.friend_id,
                name: profile?.full_name || 'Anonymous',
                avatarUrl: profile?.avatar_url || undefined,
                friendCode: profile?.friend_code || undefined,
                totalXp: profile?.xp || 0,
                addedAt: row.created_at,
            };
        }).sort((a: Friend, b: Friend) => b.totalXp - a.totalXp);
    },

    /**
     * Remove a friendship
     */
    async removeFriend(friendId: string): Promise<boolean> {
        const { data: user } = await supabase.auth.getUser();
        const myId = user?.user?.id;
        if (!myId) return false;

        const { error } = await supabase
            .from('friends')
            .delete()
            .or(`and(user_id.eq.${myId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${myId})`);

        return !error;
    },

    /**
     * Respond to a friend request (accept or reject)
     * Note: This assumes we have a 'friend_requests' table or similar logic.
     * Since the current implementation creates bidirectional friends immediately in 'addFriendByCode',
     * this method is likely for a future 'request-based' flow.
     * 
     * However, for the Notification System, we need a way to handle 'friend_request' actions.
     * If the notification implies a pending request, we need a table for it.
     * 
     * FOR NOW: We will assume 'friend_request' notification is just a prompt to add them back.
     * The 'addFriendByCode' method checks if they are already friends.
     * So 'accept' here just means "Add them by ID".
     */
    async respondToRequest(requesterId: string, accept: boolean): Promise<boolean> {
        if (!accept) return true; // Just ignore

        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return false;

        // Add them back (create connection)
        const { error } = await supabase
            .from('friends')
            .insert([
                { user_id: user.user.id, friend_id: requesterId },
                { user_id: requesterId, friend_id: user.user.id }
            ]);

        if (error) {
            // Check if already exists
            if (error.code === '23505') return true;
            return false;
        }
        return true;
    }
};

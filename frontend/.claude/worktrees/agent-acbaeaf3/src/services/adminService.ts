/**
 * Admin Service - Role-based access control for admin operations
 */

import { supabase } from './supabase';

// ============================================
// Types
// ============================================

export type UserRole = 'user' | 'admin' | 'super_admin';

export interface UserRoleData {
    userId: string;
    role: UserRole;
    assignedAt: string;
    assignedBy?: string;
}

// ============================================
// Role Verification
// ============================================

/**
 * Check if current user has admin role
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
    // Removed PLAYWRIGHT_TEST_ADMIN backdoor for production security

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    return hasUserRole(user.id, 'admin');
}

/**
 * Check if a user has a specific role
 */
export async function hasUserRole(userId: string, requiredRole: UserRole): Promise<boolean> {
    try {
        // For 'user' role, always true (basic access)
        if (requiredRole === 'user') {
            return true;
        }

        // For 'admin' or 'super_admin', check admin_users table
        const { data, error } = await supabase
            .from('admin_users')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (error || !data) return false;

        // Exists in admin_users = admin level access
        return true;
    } catch {
        return false;
    }
}

/**
 * Get current user's role
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error || !data) return 'user';
    return (data.role as UserRole) || 'admin';
}

/**
 * Require admin role - throws if not admin
 */
export async function requireAdmin(): Promise<void> {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
    }
}

/**
 * Get all users with admin role
 */
export async function getAdminUsers(): Promise<{ id: string; email?: string; role: UserRole }[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) return [];

    const { data, error } = await supabase
        .from('admin_users')
        .select('user_id, email');

    if (error || !data) return [];

    return data.map((item: { user_id: string; email: string }) => ({
        id: item.user_id,
        email: item.email,
        role: 'admin' as UserRole,
    }));
}

// ============================================
// Role Management (Super Admin only)
// ============================================

/**
 * Assign role to user
 */
export async function assignUserRole(
    userId: string,
    role: UserRole,
): Promise<{ success: boolean; message: string }> {
    try {
        // Check if current user is super admin
        const currentRole = await getCurrentUserRole();
        if (currentRole !== 'super_admin') {
            return { success: false, message: 'Only super admins can assign roles' };
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { success: false, message: 'Not authenticated' };
        }

        // For admin role, upsert into admin_users table
        if (role === 'admin' || role === 'super_admin') {
            const { error: upsertError } = await supabase
                .from('admin_users')
                .upsert({
                    user_id: userId,
                    email: '', // Will be updated when admin logs in
                }, {
                    onConflict: 'user_id',
                });
            if (upsertError) {
                return { success: false, message: upsertError.message };
            }
        }

        return { success: true, message: `Role '${role}' assigned successfully` };
    } catch (err) {
        return { success: false, message: String(err) };
    }
}

/**
 * Remove role from user (revert to 'user')
 */
export async function removeUserRole(
    userId: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const currentRole = await getCurrentUserRole();
        if (currentRole !== 'super_admin') {
            return { success: false, message: 'Only super admins can remove roles' };
        }

        const { error } = await supabase
            .from('admin_users')
            .delete()
            .eq('user_id', userId);

        if (error) {
            return { success: false, message: error.message };
        }

        return { success: true, message: 'Role removed successfully' };
    } catch (err) {
        return { success: false, message: String(err) };
    }
}

// ============================================
// Admin Audit Log
// ============================================

export interface AuditLogEntry {
    id: string;
    adminId: string;
    action: string;
    targetType: 'user';
    targetId: string;
    details?: Record<string, unknown>;
    createdAt: string;
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
    action: string,
    targetType: 'user',
    targetId: string,
    details?: Record<string, unknown>,
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        await supabase
            .from('admin_audit_logs')
            .insert({
                admin_id: user.id,
                action,
                target_type: targetType,
                target_id: targetId,
                details,
                created_at: new Date().toISOString(),
            });
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}

/**
 * Get audit logs (paginated)
 */
export async function getAuditLogs(
    page = 1,
    limit = 50,
): Promise<AuditLogEntry[]> {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) return [];

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error || !data) return [];

    return data.map((item: { id: string; admin_id: string; action: string; target_type: string; target_id: string; details: Record<string, unknown>; created_at: string }) => ({
        id: item.id,
        adminId: item.admin_id,
        action: item.action,
        targetType: item.target_type,
        targetId: item.target_id,
        details: item.details,
        createdAt: item.created_at,
    }));
}

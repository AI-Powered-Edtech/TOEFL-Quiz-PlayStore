import { apiClient } from './apiClient';

export type UserRole = 'user' | 'admin' | 'super_admin';

export interface UserRoleData {
    userId: string;
    role: UserRole;
    assignedAt: string;
    assignedBy?: string;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
    const role = await getCurrentUserRole();
    return role === 'admin' || role === 'super_admin';
}

async function getCurrentUserId(): Promise<string | null> {
    try {
        const response = await apiClient.get<any>('/api/auth/profile');
        if (response.error || !response.data) return null;
        return response.data?.user?.id || response.data?.id || null;
    } catch {
        return null;
    }
}

export async function hasUserRole(userId: string, requiredRole: UserRole): Promise<boolean> {
    if (requiredRole === 'user') return true;

    // A more robust implementation would fetch the specific user's role from the backend.
    // For now, if checking the current user, use getCurrentUserRole.
    const currentUserId = await getCurrentUserId();
    if (currentUserId === userId) {
        const currentRole = await getCurrentUserRole();
        return currentRole === 'admin' || currentRole === 'super_admin';
    }

    // Otherwise, try to find them in the admin list
    const admins = await getAdminUsersList();
    const user = admins.find(a => a.id === userId);
    const userRole = user?.role || 'user';
    return userRole === 'admin' || userRole === 'super_admin';
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
    try {
        const token = localStorage.getItem('access_token');
        if (token) {
            const payloadB64 = token.split('.')[1];
            if (payloadB64) {
                const payloadStr = atob(payloadB64);
                const payload = JSON.parse(payloadStr);
                if (payload.role) {
                    return payload.role;
                }
            }
        }
        
        // Fallback to profile check if not in token
        const response = await apiClient.get<any>('/api/auth/profile');
        if (response.error || !response.data) return null;
        return response.data?.user?.role || response.data?.role || 'user';
    } catch (e) {
        return null;
    }
}

export async function requireAdmin(): Promise<void> {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
    }
}

export async function getAdminUsersList(): Promise<{ id: string; email?: string; role: UserRole }[]> {
    try {
        const response = await apiClient.get<any[]>('/api/admin/users');
        if (response.error || !response.data) return [];
        return response.data.map(item => ({
            id: item.user_id || item.id,
            email: item.email,
            role: item.role as UserRole
        }));
    } catch {
        return [];
    }
}

export async function assignUserRole(
    userId: string,
    role: UserRole,
): Promise<{ success: boolean; message: string }> {
    try {
        const response = await apiClient.post<any>('/api/admin/roles', { user_id: userId, role });
        if (response.error) {
            return { success: false, message: response.error.error || 'Failed to assign role' };
        }
        return { success: true, message: `Role '${role}' assigned successfully` };
    } catch (err) {
        return { success: false, message: String(err) };
    }
}

export async function removeUserRole(
    userId: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const response = await apiClient.delete<any>(`/api/admin/roles/${userId}`);
        if (response.error) {
            return { success: false, message: response.error.error || 'Failed to remove role' };
        }
        return { success: true, message: 'Role removed successfully' };
    } catch (err) {
        return { success: false, message: String(err) };
    }
}

export interface AuditLogEntry {
    id: string;
    adminId: string;
    action: string;
    targetType: 'user';
    targetId: string;
    details?: Record<string, unknown>;
    createdAt: string;
}

export async function logAdminAction(
    action: string,
    targetType: 'user',
    targetId: string,
    details?: Record<string, unknown>,
): Promise<void> {
    // Backend handles audit logs automatically for admin actions.
    // If a custom log is needed, we would add an API endpoint for it.
    console.warn('logAdminAction called, but backend handles this automatically:', action, targetId);
}

export async function getAuditLogs(
    page = 1,
    limit = 50,
): Promise<AuditLogEntry[]> {
    try {
        const response = await apiClient.get<any[]>('/api/admin/audit-logs');
        if (response.error || !response.data) return [];
        
        // Handle pagination locally since backend currently returns all
        const start = (page - 1) * limit;
        const end = start + limit;
        const logs = response.data.slice(start, end);

        return logs.map(item => ({
            id: item.id,
            adminId: item.admin_id,
            action: item.action,
            targetType: item.target_type as 'user',
            targetId: item.target_id,
            details: item.details,
            createdAt: item.created_at || item.createdAt,
        }));
    } catch {
        return [];
    }
}

export { isCurrentUserAdmin as isAdminUser };

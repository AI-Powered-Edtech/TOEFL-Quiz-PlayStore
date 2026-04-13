export type UserRole = 'user' | 'admin' | 'super_admin';

export interface UserRoleData {
    userId: string;
    role: UserRole;
    assignedAt: string;
    assignedBy?: string;
}

const ADMIN_USERS_KEY = 'admin_users';
const AUDIT_LOGS_KEY = 'admin_audit_logs';

const getAdminUsers = (): Record<string, UserRoleData> => {
    try {
        const stored = localStorage.getItem(ADMIN_USERS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

const saveAdminUsers = (users: Record<string, UserRoleData>): void => {
    localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(users));
};

const getAuditLogsStorage = (): any[] => {
    try {
        const stored = localStorage.getItem(AUDIT_LOGS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveAuditLogs = (logs: any[]): void => {
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
};

export async function isCurrentUserAdmin(): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    return hasUserRole(userId, 'admin');
}

async function getCurrentUserId(): Promise<string | null> {
    try {
        const token = localStorage.getItem('access_token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch('/api/auth/profile', { headers });
        if (!response.ok) return null;
        const data = await response.json();
        return data?.id || null;
    } catch {
        return null;
    }
}

export async function hasUserRole(userId: string, requiredRole: UserRole): Promise<boolean> {
    if (requiredRole === 'user') return true;

    const admins = getAdminUsers();
    const userRole = admins[userId]?.role;
    return userRole === 'admin' || userRole === 'super_admin';
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const admins = getAdminUsers();
    return admins[userId]?.role || 'user';
}

export async function requireAdmin(): Promise<void> {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
    }
}

export async function getAdminUsersList(): Promise<{ id: string; email?: string; role: UserRole }[]> {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) return [];

    const admins = getAdminUsers();
    return Object.entries(admins).map(([id, data]) => ({
        id,
        email: data.assignedBy,
        role: data.role
    }));
}

export async function assignUserRole(
    userId: string,
    role: UserRole,
): Promise<{ success: boolean; message: string }> {
    try {
        const currentRole = await getCurrentUserRole();
        if (currentRole !== 'super_admin') {
            return { success: false, message: 'Only super admins can assign roles' };
        }

        const userIdCurrent = await getCurrentUserId();
        if (!userIdCurrent) {
            return { success: false, message: 'Not authenticated' };
        }

        const admins = getAdminUsers();
        admins[userId] = {
            userId,
            role,
            assignedAt: new Date().toISOString(),
            assignedBy: userIdCurrent
        };
        saveAdminUsers(admins);

        return { success: true, message: `Role '${role}' assigned successfully` };
    } catch (err) {
        return { success: false, message: String(err) };
    }
}

export async function removeUserRole(
    userId: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const currentRole = await getCurrentUserRole();
        if (currentRole !== 'super_admin') {
            return { success: false, message: 'Only super admins can remove roles' };
        }

        const admins = getAdminUsers();
        delete admins[userId];
        saveAdminUsers(admins);

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
    const userId = await getCurrentUserId();
    if (!userId) return;

    try {
        const logs = getAuditLogsStorage();
        logs.unshift({
            id: crypto.randomUUID(),
            admin_id: userId,
            action,
            target_type: targetType,
            target_id: targetId,
            details,
            created_at: new Date().toISOString(),
        });

        if (logs.length > 1000) {
            logs.splice(1000);
        }
        saveAuditLogs(logs);
    } catch (error) {
        console.error('Failed to log admin action:', error);
    }
}

export async function getAuditLogs(
    page = 1,
    limit = 50,
): Promise<AuditLogEntry[]> {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) return [];

    const logs = getAuditLogsStorage();
    const start = (page - 1) * limit;
    const end = start + limit;

    return logs.slice(start, end).map((item: any) => ({
        id: item.id,
        adminId: item.admin_id,
        action: item.action,
        targetType: item.target_type,
        targetId: item.target_id,
        details: item.details,
        createdAt: item.created_at,
    }));
}

export { isCurrentUserAdmin as isAdminUser };

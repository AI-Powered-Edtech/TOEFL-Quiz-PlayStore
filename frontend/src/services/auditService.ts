export type AuditAction =
    | 'USER_BAN'
    | 'USER_UNBAN'
    | 'AI_QUOTA_RESET'
    | 'AI_QUOTA_ADD'
    | 'PEER_REVIEW_CANCEL'
    | 'PEER_REVIEWER_BAN'
    | 'PUSH_NOTIFICATION_SENT';

export interface AuditLogParams {
    action: AuditAction;
    target_id?: string;
    ip_address?: string;
    metadata?: Record<string, any>;
}

const AUDIT_KEY = 'audit_logs';

export const auditService = {
    async logAction(params: AuditLogParams): Promise<void> {
        try {
            const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
            logs.unshift({
                id: crypto.randomUUID(),
                ...params,
                timestamp: new Date().toISOString()
            });
            if (logs.length > 1000) logs.splice(1000);
            localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
        } catch (err) {
            console.error('[AuditService] Failed to log action:', err);
        }
    },

    async getLogs(limit = 100): Promise<any[]> {
        const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
        return logs.slice(0, limit);
    }
};

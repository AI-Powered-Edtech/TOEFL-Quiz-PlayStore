import { supabase } from './supabase';

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

export const auditService = {
    /**
     * Logs an admin action to the admin_audit_logs table.
     * The admin_id is automatically inferred from the active Supabase session.
     */
    async logAction(params: AuditLogParams): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('[AuditService] Attempted to log action without an active session.');
                return;
            }

            // In browser environments, fetching IP client-side can be unreliable or blocked by adblockers.
            // For now, we optionally pass it in, but usually this is better handled via Edge Functions.
            const { error } = await supabase
                .from('admin_audit_logs')
                .insert({
                    admin_id: user.id,
                    action: params.action,
                    target_id: params.target_id,
                    ip_address: params.ip_address || 'client-side',
                    metadata: params.metadata || {}
                });

            if (error) {
                console.error('[AuditService] Failed to insert audit log:', error);
            }
        } catch (err) {
            console.error('[AuditService] Unexpected error logging action:', err);
        }
    },

    /**
     * Gets recent audit logs (for display in the backoffice system monitor, potentially).
     */
    async getRecentLogs(limit = 100) {
        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};

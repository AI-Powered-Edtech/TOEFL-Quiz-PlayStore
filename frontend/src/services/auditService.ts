import { apiV2 } from './apiV2';
import { assertSafeId, getActorId, sqlText } from './securityUtils';

export type AuditAction =
  | 'USER_BAN' | 'USER_UNBAN' | 'AI_QUOTA_RESET' | 'AI_QUOTA_ADD'
  | 'PEER_REVIEW_CANCEL' | 'PEER_REVIEWER_BAN' | 'PUSH_NOTIFICATION_SENT'
  | 'ROLE_CHANGE' | 'TIER_CHANGE' | 'MODERATION_REPORT_resolved' | 'MODERATION_REPORT_dismissed'
  | 'QUESTION_DELETE' | 'CREATOR_REGISTER' | 'CREATOR_PAYOUT_REQUEST';

export interface AuditLogParams {
  actor_id?: string;
  action: AuditAction | string;
  target_type?: string;
  target_id?: string;
  metadata?: Record<string, any> | string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: string | null;
  created_at: string;
}

interface AuditListResponse { logs: AuditLogEntry[]; count: number; queried_at: string; }

export const auditService = {
  async logAction(params: AuditLogParams): Promise<void> {
    const body = {
      actor_id: assertSafeId(params.actor_id || getActorId(), 'actor_id'),
      action: sqlText(params.action, 80),
      target_type: sqlText(params.target_type || 'unknown', 40),
      target_id: params.target_id ? assertSafeId(params.target_id, 'target_id') : '',
      metadata: sqlText(typeof params.metadata === 'string' ? params.metadata : JSON.stringify(params.metadata || {}), 1000),
    };
    await apiV2.post('/api/v2/admin/audit/log', body);
  },

  async getLogs(limit = 100): Promise<AuditLogEntry[]> {
    const res = await apiV2.get<AuditListResponse>('/api/v2/admin/audit/logs');
    return Array.isArray(res?.logs) ? res.logs.slice(0, limit) : [];
  },
};

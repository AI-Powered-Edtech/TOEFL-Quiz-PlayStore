import { apiV2 } from './apiV2';
import { assertSafeId, getActorId, sqlText } from './securityUtils';

export type ModerationContentType = 'submission' | 'review' | 'profile';
export type ModerationReason = 'spam' | 'inappropriate' | 'offensive' | 'plagiarism' | 'low_quality' | 'incorrect_scoring' | 'other';
export type ModerationResolutionStatus = 'resolved' | 'dismissed';

export interface ModerationReportPayload {
  reporter_id: string;
  content_type: ModerationContentType;
  content_id: string;
  reason: ModerationReason;
  description?: string;
}
export interface ModerationSubmitResponse { ok: boolean; rows_affected: number; submitted_at: string; }
export interface PendingModerationReport {
  id: string; reporter_id: string; content_type: string; content_id: string; reason: string;
  description: string | null; status: string; created_at: string;
}
interface PendingListResponse { reports: PendingModerationReport[]; count: number; queried_at: string; }
interface ResolveResponse { ok: boolean; rows_affected: number; audited?: number; resolved_at: string; }

const ALLOWED_TYPES = new Set<ModerationContentType>(['submission', 'review', 'profile']);
const ALLOWED_REASONS = new Set<ModerationReason>(['spam', 'inappropriate', 'offensive', 'plagiarism', 'low_quality', 'incorrect_scoring', 'other']);
const ALLOWED_STATUS = new Set<ModerationResolutionStatus>(['resolved', 'dismissed']);

export class ModerationValidationError extends Error { constructor(message: string) { super(message); this.name = 'ModerationValidationError'; } }
export function sanitizeDescription(raw: string | undefined | null): string { return sqlText(raw || '', 500); }

export async function submitReportV2(payload: ModerationReportPayload): Promise<ModerationSubmitResponse> {
  if (!ALLOWED_TYPES.has(payload.content_type)) throw new ModerationValidationError(`Invalid content_type: ${payload.content_type}`);
  if (!ALLOWED_REASONS.has(payload.reason)) throw new ModerationValidationError(`Invalid reason: ${payload.reason}`);
  const body = {
    reporter_id: assertSafeId(payload.reporter_id, 'reporter_id'),
    content_type: payload.content_type,
    content_id: assertSafeId(payload.content_id, 'content_id'),
    reason: payload.reason,
    description: sanitizeDescription(payload.description),
  };
  return apiV2.post<ModerationSubmitResponse>('/api/v2/moderation/reports', body);
}

export async function fetchPendingReportsV2(): Promise<PendingModerationReport[]> {
  const res = await apiV2.get<PendingListResponse>('/api/v2/admin/moderation/reports');
  return Array.isArray(res?.reports) ? res.reports : [];
}

export async function resolveReportV2(id: string, status: ModerationResolutionStatus, note = '', moderatorId = getActorId()): Promise<ResolveResponse> {
  if (!ALLOWED_STATUS.has(status)) throw new ModerationValidationError(`Invalid status: ${status}`);
  return apiV2.post<ResolveResponse>('/api/v2/admin/moderation/reports/resolve', {
    id: assertSafeId(id, 'report_id'),
    status,
    resolved_by: assertSafeId(moderatorId, 'moderator_id'),
    resolution_note: sqlText(note, 500),
  });
}


export async function fetchMyReportsV2(reporterId: string): Promise<PendingModerationReport[]> {
  const res = await apiV2.post<PendingListResponse>('/api/v2/moderation/reports/me', {
    reporter_id: assertSafeId(reporterId, 'reporter_id'),
  });
  return Array.isArray(res?.reports) ? res.reports : [];
}

import {
    ContentReport,
    ReportReason,
    ModerationQueueItem,
    ModerationStats,
    UserModerationHistory
} from '../types/moderation';
import { moderateContent, sanitizeContent } from '../utils/contentModeration';
import { isCurrentUserAdmin } from './adminService';
import { apiClient } from './apiClient';
import { fetchMyReportsV2, fetchPendingReportsV2, resolveReportV2, submitReportV2 } from './moderationApiV2';

async function getCurrentUserId(): Promise<string | null> {
    try {
        const response = await apiClient.get<any>('/api/auth/profile');
        if (response.error || !response.data) return null;
        return response.data?.user?.id || response.data?.id || null;
    } catch { return null; }
}

export const submitReport = async (
    _reporterId: string,
    contentType: 'submission' | 'review',
    contentId: string,
    reason: ReportReason,
    description?: string
): Promise<ContentReport | null> => {
    try {
        const res = await submitReportV2({ reporter_id: _reporterId, content_type: contentType, content_id: contentId, reason: reason as any, description });
        if (!res.ok) return null;
        return { id: '', reporter_id: _reporterId, content_type: contentType, content_id: contentId, reason, description, status: 'pending', created_at: res.submitted_at } as ContentReport;
    } catch (error) {
        console.error('[Moderation] Submit report failed:', error);
        return null;
    }
};

export const getMyReports = async (
    reporterId: string,
    page: number = 1,
    limit: number = 20
): Promise<ContentReport[]> => {
    try {
        const rows = await fetchMyReportsV2(reporterId);
        const start = (page - 1) * limit;
        return rows.slice(start, start + limit).map((r: any) => ({
            id: r.id,
            reporter_id: r.reporter_id,
            content_type: r.content_type,
            content_id: r.content_id,
            reason: r.reason,
            description: r.description || undefined,
            status: r.status,
            resolved_by: r.resolved_by || undefined,
            resolution_note: r.resolution_note || undefined,
            created_at: r.created_at,
            resolved_at: r.resolved_at || undefined,
        })) as ContentReport[];
    } catch (error) {
        console.error('[Moderation] Get my reports failed:', error);
        return [];
    }
};

export const getModerationQueueItems = async (
    page: number = 1,
    limit: number = 20,
    status?: 'pending' | 'approved' | 'rejected'
): Promise<ModerationQueueItem[]> => {
    try {
        const statusQuery = status ? `&status=${status}` : '';
        const response = await apiClient.get<ModerationQueueItem[]>(`/api/admin-monitoring/moderation/reports?page=${page}&limit=${limit}${statusQuery}`);
        if (response.error || !response.data) return [];
        
        // Map backend report format to frontend queue format if necessary
        return response.data.map((item: any) => ({
            id: item.id,
            content_type: item.content_type,
            content_id: item.content_id,
            content_preview: item.content_preview || '',
            author_id: item.author_id || item.reporter_id || '',
            flags: item.flags || [],
            status: item.status,
            created_at: item.created_at || item.createdAt
        }));
    } catch (error) {
        console.error('[Moderation] Get queue failed:', error);
        return [];
    }
};

export const resolveReport = async (
    reportId: string,
    _moderatorId: string,
    action: 'approve' | 'reject' | 'dismiss',
    resolutionNote?: string
): Promise<boolean> => {
    try {
        const status = action === 'dismiss' ? 'dismissed' : 'resolved';
        const response = await resolveReportV2(reportId, status, resolutionNote || '', _moderatorId);
        return !!response.ok;
    } catch (error) {
        console.error('[Moderation] Resolve report failed:', error);
        return false;
    }
};

export const getModerationStats = async (): Promise<ModerationStats> => {
    try {
        const pending = await fetchPendingReportsV2();
        const reasonCounts = pending.reduce((acc: Record<string, number>, r) => { acc[r.reason] = (acc[r.reason] || 0) + 1; return acc; }, {});
        return {
            total_reports: pending.length,
            pending_reports: pending.length,
            resolved_today: 0,
            avg_resolution_time: 0,
            top_report_reasons: Object.entries(reasonCounts).map(([reason, count]) => ({ reason: reason as ReportReason, count }))
        };
    } catch (error) {
        console.error('[Moderation] Get stats failed:', error);
        return {
            total_reports: 0,
            pending_reports: 0,
            resolved_today: 0,
            avg_resolution_time: 0,
            top_report_reasons: []
        };
    }
};

export const autoModerate = async (
    contentType: 'submission' | 'review',
    contentId: string,
    content: string
): Promise<{ approved: boolean; flags: string[] }> => {
    try {
        // Auto-moderation can still use local utils for immediate feedback,
        // but it should also submit the result to the backend.
        const result = moderateContent(content, contentType === 'submission' ? 'essay' : 'feedback');

        // v2 does not need a server call for autoModerate yet; keep this local to avoid broken 8082 dependency.
        return {
            approved: result.isApproved,
            flags: result.flags.map((f: any) => f.message)
        };
    } catch (error) {
        console.error('[Moderation] Auto moderate failed:', error);
        return { approved: true, flags: [] };
    }
};

const updateReportCount = async (
    contentType: 'submission' | 'review',
    contentId: string
): Promise<void> => {
    console.log('[Moderation] Report count update skipped - backend handles this');
};

const handleContentAction = async (
    contentType: 'submission' | 'review',
    contentId: string,
    action: 'remove' | 'hide' | 'restore'
): Promise<void> => {
    console.log('[Moderation] Content action skipped - backend handles this');
};

const getContentAuthorId = async (
    contentType: 'submission' | 'review',
    contentId: string
): Promise<string> => {
    return '';
};

const updateUserModerationHistory = async (
    userId: string,
    wasUpheld: boolean
): Promise<void> => {
    if (!userId) return;
    console.log('[Moderation] User history update skipped - backend handles this');
};

export const getUserModerationHistory = async (
    userId: string
): Promise<UserModerationHistory | null> => {
    try {
        const response = await apiClient.get<UserModerationHistory>(`/api/moderation/users/${userId}/history`);
        if (response.error || !response.data) return null;
        return response.data;
    } catch (error) {
        console.error('[Moderation] Get user history failed:', error);
        return null;
    }
};

export const isUserInGoodStanding = async (userId: string): Promise<boolean> => {
    try {
        const history = await getUserModerationHistory(userId);
        if (!history) return true;
        if (history.warnings > 5) return false;
        return true;
    } catch (error) {
        return true;
    }
};

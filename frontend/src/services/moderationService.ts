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
        const response = await apiClient.post<ContentReport>('/api/moderation/reports', {
            content_type: contentType,
            content_id: contentId,
            reason,
            description
        });
        
        if (response.error || !response.data) {
            console.error('[Moderation] Submit report failed:', response.error);
            return null;
        }

        return response.data;
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
        const response = await apiClient.get<ContentReport[]>(`/api/moderation/reports/me?page=${page}&limit=${limit}`);
        if (response.error || !response.data) return [];
        return response.data;
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
        const response = await apiClient.patch<any>(`/api/admin-monitoring/moderation/reports/${reportId}`, {
            status,
            resolution_note: resolutionNote
        });
        
        if (response.error) {
            console.error('[Moderation] Resolve report failed:', response.error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[Moderation] Resolve report failed:', error);
        return false;
    }
};

export const getModerationStats = async (): Promise<ModerationStats> => {
    try {
        const response = await apiClient.get<ModerationStats>('/api/admin-monitoring/moderation/stats');
        if (response.error || !response.data) {
            return {
                total_reports: 0,
                pending_reports: 0,
                resolved_today: 0,
                avg_resolution_time: 0,
                top_report_reasons: []
            };
        }
        return response.data;
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

        const response = await apiClient.post<any>('/api/moderation/auto', {
            content_type: contentType,
            content_id: contentId,
            content_preview: content.substring(0, 200),
            flags: result.flags,
            status: result.isApproved ? 'approved' : 'pending'
        });

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

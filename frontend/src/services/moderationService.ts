import {
    ContentReport,
    ReportReason,
    ModerationQueueItem,
    ModerationStats,
    UserModerationHistory
} from '../types/moderation';
import { moderateContent, sanitizeContent } from '../utils/contentModeration';
import { isCurrentUserAdmin } from './adminService';

const REPORTS_KEY = 'content_reports';
const MODERATION_QUEUE_KEY = 'moderation_queue';
const USER_HISTORY_KEY = 'user_moderation_history';

const getReports = (): any[] => {
    try {
        const stored = localStorage.getItem(REPORTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveReports = (reports: any[]): void => {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

const getModerationQueue = (): any[] => {
    try {
        const stored = localStorage.getItem(MODERATION_QUEUE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveModerationQueue = (queue: any[]): void => {
    localStorage.setItem(MODERATION_QUEUE_KEY, JSON.stringify(queue));
};

const getUserHistory = (): Record<string, any> => {
    try {
        const stored = localStorage.getItem(USER_HISTORY_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
};

const saveUserHistory = (history: Record<string, any>): void => {
    localStorage.setItem(USER_HISTORY_KEY, JSON.stringify(history));
};

async function getCurrentUserId(): Promise<string | null> {
    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) return null;
        const data = await response.json();
        return data?.user?.id || null;
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
        const userId = await getCurrentUserId();
        if (!userId) {
            console.error('[Security] Unauthenticated report submission rejected');
            return null;
        }

        const reports = getReports();
        const existing = reports.find(r =>
            r.reporter_id === userId &&
            r.content_id === contentId &&
            r.content_type === contentType
        );

        if (existing) {
            console.warn('[Moderation] User has already reported this content');
            return null;
        }

        const report = {
            id: crypto.randomUUID(),
            reporter_id: userId,
            content_type: contentType,
            content_id: contentId,
            reason,
            description,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        reports.unshift(report);
        saveReports(reports);

        await updateReportCount(contentType, contentId);
        return report as ContentReport;
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
        const offset = (page - 1) * limit;
        const reports = getReports()
            .filter(r => r.reporter_id === reporterId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return reports.slice(offset, offset + limit) as ContentReport[];
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
        const offset = (page - 1) * limit;
        let queue = getModerationQueue().sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        if (status) {
            queue = queue.filter(q => q.status === status);
        }

        return queue.slice(offset, offset + limit) as ModerationQueueItem[];
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
        const userId = await getCurrentUserId();
        if (!userId) return false;

        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            console.error(`[Security] Unauthorized moderation attempt on report ${reportId}`);
            return false;
        }

        const reports = getReports();
        const reportIndex = reports.findIndex(r => r.id === reportId);

        if (reportIndex === -1) return false;

        reports[reportIndex] = {
            ...reports[reportIndex],
            status: action === 'dismiss' ? 'dismissed' : 'resolved',
            resolved_by: userId,
            resolution_note: resolutionNote,
            resolved_at: new Date().toISOString()
        };
        saveReports(reports);

        if (action === 'approve') {
            await handleContentAction(reports[reportIndex].content_type, reports[reportIndex].content_id, 'remove');
        }

        return true;
    } catch (error) {
        console.error('[Moderation] Resolve report failed:', error);
        return false;
    }
};

export const getModerationStats = async (): Promise<ModerationStats> => {
    try {
        const reports = getReports();
        const pending = reports.filter(r => r.status === 'pending').length;
        const today = new Date().toDateString();
        const resolvedToday = reports.filter(r =>
            r.resolved_at && new Date(r.resolved_at).toDateString() === today
        ).length;

        const reasonCounts: Record<string, number> = {};
        reports.forEach((r: any) => {
            reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
        });

        const top_reasons = Object.entries(reasonCounts)
            .map(([reason, count]) => ({ reason: reason as ReportReason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            total_reports: reports.length,
            pending_reports: pending,
            resolved_today: resolvedToday,
            avg_resolution_time: 0,
            top_report_reasons: top_reasons
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
        const result = moderateContent(content, contentType === 'submission' ? 'essay' : 'feedback');

        const queue = getModerationQueue();
        queue.unshift({
            id: crypto.randomUUID(),
            content_type: contentType,
            content_id: contentId,
            content_preview: content.substring(0, 200),
            flags: result.flags,
            status: result.isApproved ? 'approved' : 'pending',
            created_at: new Date().toISOString()
        });
        saveModerationQueue(queue);

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
    console.log('[Moderation] Report count update skipped - using local storage');
};

const handleContentAction = async (
    contentType: 'submission' | 'review',
    contentId: string,
    action: 'remove' | 'hide' | 'restore'
): Promise<void> => {
    console.log('[Moderation] Content action skipped - using local storage');
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
    console.log('[Moderation] User history update skipped - using local storage');
};

export const getUserModerationHistory = async (
    userId: string
): Promise<UserModerationHistory | null> => {
    try {
        const history = getUserHistory();
        return history[userId] || null;
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

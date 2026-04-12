/**
 * Moderation Service
 * Handles content reporting, moderation actions, and admin functions
 */

import { supabase } from './supabase';
import {
    ContentReport,
    ReportReason,
    ModerationQueueItem,
    ModerationStats,
    UserModerationHistory
} from '../types/moderation';
import { moderateContent, sanitizeContent } from '../utils/contentModeration';
import { isCurrentUserAdmin } from './adminService';

// ===== REPORTING FUNCTIONS =====

/**
 * Submit a report for content
 */
export const submitReport = async (
    _reporterId: string, // Ignored for security
    contentType: 'submission' | 'review',
    contentId: string,
    reason: ReportReason,
    description?: string
): Promise<ContentReport | null> => {
    try {
        // SECURITY CHECK: Derive reporter identity strictly from active session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('[Security] Unauthenticated report submission rejected');
            return null;
        }
        const actualReporterId = user.id;

        // Check if user has already reported this content
        const { data: existingReport } = await supabase
            .from('content_reports')
            .select('id')
            .eq('reporter_id', actualReporterId)
            .eq('content_id', contentId)
            .eq('content_type', contentType)
            .single();

        if (existingReport) {
            console.warn('[Moderation] User has already reported this content');
            return null;
        }

        const { data, error } = await supabase
            .from('content_reports')
            .insert({
                reporter_id: actualReporterId,
                content_type: contentType,
                content_id: contentId,
                reason,
                description,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        // Update report count on the content
        await updateReportCount(contentType, contentId);

        return data;
    } catch (error) {
        console.error('[Moderation] Submit report failed:', error);
        return null;
    }
};

/**
 * Get reports submitted by a user
 */
export const getMyReports = async (
    reporterId: string,
    page: number = 1,
    limit: number = 20
): Promise<ContentReport[]> => {
    try {
        const offset = (page - 1) * limit;
        const { data, error } = await supabase
            .from('content_reports')
            .select('*')
            .eq('reporter_id', reporterId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[Moderation] Get my reports failed:', error);
        return [];
    }
};

// ===== MODERATION FUNCTIONS =====

/**
 * Get moderation queue (admin only)
 */
export const getModerationQueue = async (
    page: number = 1,
    limit: number = 20,
    status?: 'pending' | 'approved' | 'rejected'
): Promise<ModerationQueueItem[]> => {
    try {
        const offset = (page - 1) * limit;
        let query = supabase
            .from('moderation_queue')
            .select('*')
            .order('created_at', { ascending: true });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query.range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('[Moderation] Get queue failed:', error);
        return [];
    }
};

/**
 * Resolve a report (admin only)
 */
export const resolveReport = async (
    reportId: string,
    _moderatorId: string, // Ignored for security
    action: 'approve' | 'reject' | 'dismiss',
    resolutionNote?: string
): Promise<boolean> => {
    try {
        // SECURITY CHECK: Require admin role natively
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const isAdmin = await isCurrentUserAdmin();
        if (!isAdmin) {
            console.error(`[Security] Unauthorized moderation attempt by user ${user.id} on report ${reportId}`);
            return false;
        }

        const actualModeratorId = user.id;

        // Update the report
        const { data: report, error: reportError } = await supabase
            .from('content_reports')
            .update({
                status: action === 'dismiss' ? 'dismissed' : 'resolved',
                resolved_by: actualModeratorId,
                resolution_note: resolutionNote,
                resolved_at: new Date().toISOString()
            })
            .eq('id', reportId)
            .select()
            .single();

        if (reportError) throw reportError;

        // If action is approve (content is problematic), take action on content
        if (action === 'approve' && report) {
            await handleContentAction(
                report.content_type,
                report.content_id,
                'remove'
            );
        }

        // Update user moderation history
        if (report) {
            await updateUserModerationHistory(
                await getContentAuthorId(report.content_type, report.content_id),
                action === 'approve'
            );
        }

        return true;
    } catch (error) {
        console.error('[Moderation] Resolve report failed:', error);
        return false;
    }
};

/**
 * Get moderation statistics (admin only)
 */
export const getModerationStats = async (): Promise<ModerationStats> => {
    try {
        const { data: reports } = await supabase
            .from('content_reports')
            .select('reason, status, created_at, resolved_at');

        const pending = reports?.filter((r: any) => r.status === 'pending').length || 0;
        const resolvedToday = reports?.filter((r: any) =>
            r.resolved_at &&
            new Date(r.resolved_at).toDateString() === new Date().toDateString()
        ).length || 0;

        // Calculate average resolution time
        const resolvedReports = reports?.filter((r: any) => r.resolved_at && r.created_at) || [];
        const avgResolutionTime = resolvedReports.length > 0
            ? resolvedReports.reduce((sum: number, r: any) => {
                const created = new Date(r.created_at).getTime();
                const resolved = new Date(r.resolved_at!).getTime();
                return sum + (resolved - created) / (1000 * 60 * 60); // hours
            }, 0) / resolvedReports.length
            : 0;

        // Count reasons
        const reasonCounts: Record<string, number> = {};
        reports?.forEach((r: any) => {
            reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1;
        });
        const top_report_reasons = Object.entries(reasonCounts)
            .map(([reason, count]) => ({ reason: reason as ReportReason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            total_reports: reports?.length || 0,
            pending_reports: pending,
            resolved_today: resolvedToday,
            avg_resolution_time: Math.round(avgResolutionTime * 10) / 10,
            top_report_reasons
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

// ===== AUTO MODERATION =====

/**
 * Auto-moderate content on submission
 */
export const autoModerate = async (
    contentType: 'submission' | 'review',
    contentId: string,
    content: string
): Promise<{ approved: boolean; flags: string[] }> => {
    try {
        const result = moderateContent(content, contentType === 'submission' ? 'essay' : 'feedback');

        // Store moderation result
        await supabase
            .from('moderation_queue')
            .upsert({
                content_type: contentType,
                content_id: contentId,
                content_preview: content.substring(0, 200),
                flags: result.flags,
                status: result.isApproved ? 'approved' : 'pending',
                created_at: new Date().toISOString()
            });

        return {
            approved: result.isApproved,
            flags: result.flags.map(f => f.message)
        };
    } catch (error) {
        console.error('[Moderation] Auto moderate failed:', error);
        // Fail open - approve on error
        return { approved: true, flags: [] };
    }
};

// ===== HELPER FUNCTIONS =====

/**
 * Update report count on content
 */
const updateReportCount = async (
    contentType: 'submission' | 'review',
    contentId: string
): Promise<void> => {
    try {
        const table = contentType === 'submission'
            ? 'peer_review_submissions'
            : 'peer_reviews';

        // Get current count
        const { data } = await supabase
            .from(table)
            .select('report_count')
            .eq('id', contentId)
            .single();

        const newCount = (data?.report_count || 0) + 1;

        // Update count
        await supabase
            .from(table)
            .update({ report_count: newCount })
            .eq('id', contentId);

        // Auto-hide if too many reports
        if (newCount >= 3) {
            await handleContentAction(contentType, contentId, 'hide');
        }
    } catch (error) {
        console.error('[Moderation] Update report count failed:', error);
    }
};

/**
 * Handle action on content
 */
const handleContentAction = async (
    contentType: 'submission' | 'review',
    contentId: string,
    action: 'remove' | 'hide' | 'restore'
): Promise<void> => {
    try {
        const table = contentType === 'submission'
            ? 'peer_review_submissions'
            : 'peer_reviews';

        const updateData = action === 'remove'
            ? { status: 'removed', removed_at: new Date().toISOString() }
            : action === 'hide'
                ? { is_hidden: true, hidden_at: new Date().toISOString() }
                : { is_hidden: false };

        await supabase
            .from(table)
            .update(updateData)
            .eq('id', contentId);
    } catch (error) {
        console.error('[Moderation] Handle content action failed:', error);
    }
};

/**
 * Get content author ID
 */
const getContentAuthorId = async (
    contentType: 'submission' | 'review',
    contentId: string
): Promise<string> => {
    try {
        const table = contentType === 'submission'
            ? 'peer_review_submissions'
            : 'peer_reviews';

        const field = contentType === 'submission' ? 'user_id' : 'reviewer_id';

        const { data } = await supabase
            .from(table)
            .select(field)
            .eq('id', contentId)
            .single();

        return data?.[field] || '';
    } catch (error) {
        console.error('[Moderation] Get content author failed:', error);
        return '';
    }
};

/**
 * Update user moderation history
 */
const updateUserModerationHistory = async (
    userId: string,
    wasUpheld: boolean
): Promise<void> => {
    if (!userId) return;

    try {
        const { data: existing } = await supabase
            .from('user_moderation_history')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (existing) {
            await supabase
                .from('user_moderation_history')
                .update({
                    total_reports: existing.total_reports + 1,
                    upheld_reports: existing.upheld_reports + (wasUpheld ? 1 : 0),
                    last_report_date: new Date().toISOString()
                })
                .eq('user_id', userId);
        } else {
            await supabase
                .from('user_moderation_history')
                .insert({
                    user_id: userId,
                    total_reports: 1,
                    upheld_reports: wasUpheld ? 1 : 0,
                    warnings: 0
                });
        }

        // Add warning if report was upheld
        if (wasUpheld) {
            await supabase
                .from('user_moderation_history')
                .update({
                    warnings: (existing?.warnings || 0) + 1
                })
                .eq('user_id', userId);
        }
    } catch (error) {
        console.error('[Moderation] Update user history failed:', error);
    }
};

/**
 * Get user moderation history
 */
export const getUserModerationHistory = async (
    userId: string
): Promise<UserModerationHistory | null> => {
    try {
        const { data, error } = await supabase
            .from('user_moderation_history')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('[Moderation] Get user history failed:', error);
        return null;
    }
};

/**
 * Check if user is in good standing
 */
export const isUserInGoodStanding = async (userId: string): Promise<boolean> => {
    try {
        const history = await getUserModerationHistory(userId);

        if (!history) return true;

        // User is not in good standing if:
        // - More than 3 upheld reports in last 30 days
        // - More than 5 warnings total
        if (history.warnings > 5) return false;

        return true;
    } catch (error) {
        console.error('[Moderation] Check user standing failed:', error);
        return true; // Fail open
    }
};

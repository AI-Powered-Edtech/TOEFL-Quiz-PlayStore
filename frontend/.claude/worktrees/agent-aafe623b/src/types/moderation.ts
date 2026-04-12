/**
 * Moderation Types
 * Type definitions for content moderation and reporting system
 */

export interface ContentReport {
    id: string;
    reporter_id: string;
    content_type: 'submission' | 'review';
    content_id: string;
    reason: ReportReason;
    description?: string;
    status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
    resolved_by?: string;
    resolution_note?: string;
    created_at: string;
    resolved_at?: string;
}

export type ReportReason = 
    | 'spam'
    | 'inappropriate'
    | 'offensive'
    | 'plagiarism'
    | 'low_quality'
    | 'incorrect_scoring'
    | 'other';

export interface ModerationAction {
    type: 'approve' | 'reject' | 'warn' | 'ban';
    reason: string;
    moderator_id: string;
    timestamp: string;
}

export interface ModerationQueueItem {
    id: string;
    content_type: 'submission' | 'review';
    content_id: string;
    content_preview: string;
    author_id: string;
    flags: ModerationFlag[];
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    reviewed_at?: string;
    reviewed_by?: string;
}

export interface ModerationFlag {
    type: 'spam' | 'profanity' | 'quality' | 'length' | 'structure' | 'user_report';
    severity: 'low' | 'medium' | 'high';
    message: string;
    details?: string;
}

export interface ModerationStats {
    total_reports: number;
    pending_reports: number;
    resolved_today: number;
    avg_resolution_time: number; // in hours
    top_report_reasons: { reason: ReportReason; count: number }[];
}

export interface UserModerationHistory {
    user_id: string;
    total_reports: number;
    upheld_reports: number;
    warnings: number;
    last_report_date?: string;
}

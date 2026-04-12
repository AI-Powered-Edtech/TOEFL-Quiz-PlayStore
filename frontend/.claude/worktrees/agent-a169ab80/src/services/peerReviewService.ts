import { peerReviewLogger } from '../utils/monitoring';
import { PeerReviewSubmission, PeerReview, ReviewerStats, InlineCorrection } from '../types';
import * as analytics from '../utils/analytics';

import { supabase } from './supabase';
import { notificationService } from './notificationService';
import { sanitizeText } from '../utils/inputValidation';

/**
 * Peer Review Service
 * Handles all peer review operations including submissions, reviews, and stats
 */

// ===== RATE LIMITING =====

/**
 * Check if user can submit more essays (rate limit: 5 per 24 hours)
 */
export const checkSubmissionLimit = async (userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    submissionsToday: number;
}> => {
    try {
        const { data, error } = await supabase
            .rpc('check_peer_review_submission_limit', { p_user_id: userId });

        if (error) throw error;

        if (data && data.length > 0) {
            return {
                allowed: data[0].allowed,
                remaining: data[0].remaining,
                submissionsToday: data[0].submissions_today
            };
        }

        // Fallback: allow submission if function fails
        return { allowed: true, remaining: 5, submissionsToday: 0 };
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Check limit failed:', error);
        // Fail open: allow submission on error
        return { allowed: true, remaining: 5, submissionsToday: 0 };
    }
};

/**
 * Trigger cleanup of expired claims
 * Calls the Edge Function to release claims older than 30 minutes
 * This is called automatically when loading the review queue
 */
export const triggerCleanup = async (): Promise<void> => {
    try {
        // Use environment variables for Supabase URL and Anon Key
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            peerReviewLogger.warn('[PeerReview] Missing Supabase environment variables, skipping cleanup trigger');
            return;
        }

        const functionUrl = `${supabaseUrl}/functions/v1/cleanup-expired-claims`;
        const anonKey = supabaseAnonKey;

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            console.log('[PeerReview] Cleanup triggered:', result);
        } else {
            peerReviewLogger.warn('[PeerReview] Cleanup failed:', response.status);
        }
    } catch (error) {
        // Fail silently - cleanup is not critical
        peerReviewLogger.warn('[PeerReview] Cleanup skipped:', (error as any)?.message);
    }
};

// ===== SUBMISSION FUNCTIONS =====

/**
 * Submit an essay for peer review
 */
export const submitEssay = async (
    userId: string,
    essayContent: string,
    prompt: string | null,
    taskType: 'Task 1' | 'Task 2',
    isAnonymous: boolean = false
): Promise<PeerReviewSubmission | null> => {
    try {
        // Check rate limit first
        const limitCheck = await checkSubmissionLimit(userId);
        if (!limitCheck.allowed) {
            peerReviewLogger.warn('[PeerReview] Rate limit exceeded:', limitCheck);
            throw new Error(`Daily submission limit reached (5 per day). You have ${limitCheck.remaining} submissions remaining.`);
        }

        const wordCount = essayContent.trim().split(/\s+/).length;

        const { estimateDifficulty } = await import('../utils/contentModeration');
        const difficultyLevel = estimateDifficulty(essayContent);

        const { data, error } = await supabase
            .from('peer_review_submissions')
            .insert({
                user_id: userId,
                essay_content: essayContent,
                prompt,
                task_type: taskType,
                word_count: wordCount,
                is_anonymous: isAnonymous,
                difficulty_level: difficultyLevel,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        console.log('[PeerReview] Essay submitted successfully. Remaining submissions:', limitCheck.remaining - 1);

        // Track submission analytics
        analytics.trackSubmission(userId, data.id, {
            taskType,
            wordCount
        }).catch(err => peerReviewLogger.error('[Analytics] Track submission failed:', err));

        return data;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Submit essay failed:', error);
        throw error; // Re-throw to allow UI to handle rate limit errors
    }
};

/**
 * Get review queue (essays available for review)
 * Excludes user's own submissions
 */
export const getReviewQueue = async (
    userId: string,
    page: number = 1,
    limit: number = 10
): Promise<PeerReviewSubmission[]> => {
    try {
        // Trigger cleanup of expired claims before fetching queue
        // This runs in background and doesn't block the queue fetch
        triggerCleanup().catch(err => peerReviewLogger.error('[PeerReview] Background cleanup failed:', err));

        const offset = (page - 1) * limit;
        const { data, error } = await supabase
            .from('peer_review_submissions')
            .select('*')
            .eq('status', 'pending')
            .is('claimed_by', null)
            .neq('user_id', userId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get queue failed:', error);
        return [];
    }
};

/**
 * Queue filters interface
 */
export interface QueueFilters {
    search: string;
    taskType: 'all' | 'Task 1' | 'Task 2';
    sortBy: 'newest' | 'oldest' | 'word_count_asc' | 'word_count_desc';
    difficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Get filtered review queue with search and filters
 */
export const getFilteredReviewQueue = async (
    userId: string,
    filters: QueueFilters,
    page: number = 1,
    limit: number = 10
): Promise<{ submissions: PeerReviewSubmission[]; total: number }> => {
    try {
        // Trigger cleanup of expired claims before fetching queue
        triggerCleanup().catch(err => peerReviewLogger.error('[PeerReview] Background cleanup failed:', err));

        const offset = (page - 1) * limit;

        // Build query
        let query = supabase
            .from('peer_review_submissions')
            .select('*', { count: 'exact' })
            .eq('status', 'pending')
            .is('claimed_by', null)
            .neq('user_id', userId);

        // Apply task type filter
        if (filters.taskType !== 'all') {
            query = query.eq('task_type', filters.taskType);
        }

        // Apply search filter
        if (filters.search.trim()) {
            const searchTerm = sanitizeText(filters.search.trim(), { maxLength: 100 }).replace(/[^\w\s-]/gi, '');
            if (searchTerm.length > 0) {
                query = query.or(`prompt.ilike.%${searchTerm}%,essay_content.ilike.%${searchTerm}%`);
            }
        }

        // Apply difficulty filter natively
        if (filters.difficulty !== 'all') {
            query = query.eq('difficulty_level', filters.difficulty);
        }

        // Apply sorting
        switch (filters.sortBy) {
            case 'newest':
                query = query.order('created_at', { ascending: false });
                break;
            case 'oldest':
                query = query.order('created_at', { ascending: true });
                break;
            case 'word_count_asc':
                query = query.order('word_count', { ascending: true });
                break;
            case 'word_count_desc':
                query = query.order('word_count', { ascending: false });
                break;
            default:
                query = query.order('created_at', { ascending: true });
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        return {
            submissions: data || [],
            total: count || 0
        };
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get filtered queue failed:', error);
        return { submissions: [], total: 0 };
    }
};

/**
 * Claim an essay for review
 */
export const claimEssay = async (
    submissionId: string,
    reviewerId: string
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('peer_review_submissions')
            .update({
                claimed_by: reviewerId,
                claimed_at: new Date().toISOString(),
                status: 'in_review'
            })
            .eq('id', submissionId)
            .is('claimed_by', null); // Prevent double-claiming

        if (error) throw error;

        // Track claim analytics
        analytics.trackClaim(reviewerId, submissionId).catch(err => peerReviewLogger.error('[Analytics] Track claim failed:', err));

        return true;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Claim essay failed:', error);
        return false;
    }
};

/**
 * Get user's own submissions
 */
export const getMySubmissions = async (
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<PeerReviewSubmission[]> => {
    try {
        const offset = (page - 1) * limit;
        const { data, error } = await supabase
            .from('peer_review_submissions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get my submissions failed:', error);
        return [];
    }
};

// ===== REVIEW FUNCTIONS =====

/**
 * Submit a review for an essay
 */
export const submitReview = async (
    submissionId: string,
    reviewerId: string,
    scores: {
        taskResponse: number;
        coherence: number;
        lexical: number;
        grammar: number;
    },
    feedback: {
        strengths: string;
        weaknesses: string;
        suggestions?: string;
    },
    inlineCorrections: InlineCorrection[],
    timeSpentSeconds: number
): Promise<PeerReview | null> => {
    try {
        // Calculate overall band (average of 4 scores)
        const overallBand = (
            (scores.taskResponse + scores.coherence + scores.lexical + scores.grammar) / 4
        ).toFixed(1);

        const { data, error } = await supabase
            .from('peer_reviews')
            .insert({
                submission_id: submissionId,
                reviewer_id: reviewerId,
                task_response_score: scores.taskResponse,
                coherence_score: scores.coherence,
                lexical_score: scores.lexical,
                grammar_score: scores.grammar,
                overall_band: parseFloat(overallBand),
                strengths: feedback.strengths,
                weaknesses: feedback.weaknesses,
                suggestions: feedback.suggestions,
                inline_corrections: inlineCorrections,
                time_spent_seconds: timeSpentSeconds
            })
            .select()
            .single();

        if (error) throw error;

        // Update submission status to completed
        const { data: submissionData } = await supabase
            .from('peer_review_submissions')
            .update({ status: 'completed' })
            .eq('id', submissionId)
            .select('user_id, prompt')
            .single();

        if (submissionData?.user_id) {
            try {
                await notificationService.createNotification({
                    user_id: submissionData.user_id,
                    type: 'peer_review',
                    title: 'Essay Review Completed',
                    message: `Your essay "${submissionData.prompt?.substring(0, 30)}${submissionData.prompt?.length > 30 ? '...' : ''}" received a Band ${overallBand} review!`,
                    data: {
                        submission_id: submissionId,
                        review_id: data.id,
                        band_score: overallBand
                    }
                });
            } catch (e) {
                peerReviewLogger.error('[PeerReview] Notification failed:', e);
            }
        }

        // Update reviewer stats
        await updateReviewerStats(reviewerId);

        // Track review analytics
        analytics.trackReview(reviewerId, submissionId, data.id, {
            timeSpent: timeSpentSeconds,
            overallBand: parseFloat(overallBand),
            inlineCorrectionsCount: inlineCorrections?.length || 0
        }).catch(err => peerReviewLogger.error('[Analytics] Track review failed:', err));

        return data;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Submit review failed:', error);
        return null;
    }
};

/**
 * Get reviews for a specific submission
 */
export const getReviewsForSubmission = async (
    submissionId: string
): Promise<PeerReview[]> => {
    try {
        const { data, error } = await supabase
            .from('peer_reviews')
            .select('*')
            .eq('submission_id', submissionId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get reviews failed:', error);
        return [];
    }
};

/**
 * Get reviews written by a user
 */
export const getMyReviews = async (
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<PeerReview[]> => {
    try {
        const offset = (page - 1) * limit;
        const { data, error } = await supabase
            .from('peer_reviews')
            .select('*')
            .eq('reviewer_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data || [];
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get my reviews failed:', error);
        return [];
    }
};

/**
 * Rate a review (by the essay author)
 */
export const rateReview = async (
    reviewId: string,
    userId: string,
    rating: number,
    comment?: string
): Promise<boolean> => {
    try {
        // SECURITY: Verify the user owns the submission being reviewed
        const { data: reviewData, error: reviewError } = await supabase
            .from('peer_reviews')
            .select('submission_id')
            .eq('id', reviewId)
            .single();

        if (reviewError || !reviewData) throw new Error('Review not found');

        const { data: submissionData } = await supabase
            .from('peer_review_submissions')
            .select('user_id')
            .eq('id', reviewData.submission_id)
            .single();

        if (!submissionData || submissionData.user_id !== userId) {
            throw new Error('Unauthorized to rate this review');
        }

        const { error } = await supabase
            .from('peer_reviews')
            .update({
                helpfulness_rating: rating,
                author_comment: comment
            })
            .eq('id', reviewId);

        if (error) throw error;

        // Update reviewer's average helpfulness
        const { data: review } = await supabase
            .from('peer_reviews')
            .select('reviewer_id')
            .eq('id', reviewId)
            .single();

        if (review) {
            await updateReviewerStats(review.reviewer_id);
        }

        return true;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Rate review failed:', error);
        return false;
    }
};

// ===== REVIEWER STATS FUNCTIONS =====

/**
 * Update reviewer statistics
 */
const updateReviewerStats = async (userId: string): Promise<void> => {
    try {
        const { error } = await supabase.rpc('calculate_reviewer_stats', {
            p_reviewer_id: userId
        });

        if (error) throw error;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Update stats failed:', error);
    }
};

/**
 * Get reviewer stats for a user
 */
export const getReviewerStats = async (
    userId: string
): Promise<ReviewerStats | null> => {
    try {
        const { data, error } = await supabase
            .from('reviewer_stats')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            // If table missing, return defaults
            if (error.code === '42P01') {
                return {
                    user_id: userId,
                    total_reviews: 0,
                    avg_helpfulness: 0,
                    xp_earned: 0,
                    tier: 'Novice'
                } as ReviewerStats;
            }
            peerReviewLogger.warn('[PeerReview] Get stats non-fatal error:', error.message);
            return null;
        }

        // If no stats exist, return defaults
        if (!data) {
            return {
                user_id: userId,
                total_reviews: 0,
                avg_helpfulness: 0,
                xp_earned: 0,
                tier: 'Novice'
            } as ReviewerStats;
        }

        return data;
    } catch (error) {
        peerReviewLogger.warn('[PeerReview] Get stats failed (using defaults):', (error as any)?.message);
        return null;
    }
};

/**
 * Get top reviewers (leaderboard)
 */
export const getTopReviewers = async (limit: number = 10): Promise<ReviewerStats[]> => {
    try {
        const { data, error } = await supabase
            .from('reviewer_stats')
            .select('*')
            .order('total_reviews', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get top reviewers failed:', error);
        return [];
    }
};

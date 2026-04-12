import { PeerReviewSubmission, PeerReview, ReviewerStats, InlineCorrection } from '../types';
import * as analytics from '../utils/analytics';
import { sanitizeText } from '../utils/inputValidation';
import { peerReviewLogger } from '../utils/monitoring';

import { notificationService } from './notificationService';

const SUBMISSIONS_KEY = 'peer_review_submissions_';
const REVIEWS_KEY = 'peer_reviews_';
const REVIEWER_STATS_KEY = 'reviewer_stats_';
const SUBMISSION_LIMITS_KEY = 'peer_review_limits_';

interface SubmissionLimit {
    userId: string;
    submissionsToday: number;
    lastResetDate: string;
}

const getSubmissionsKey = (userId: string): string => `${SUBMISSIONS_KEY}${userId}`;
const getReviewsKey = (userId: string): string => `${REVIEWS_KEY}${userId}`;
const getStatsKey = (userId: string): string => `${REVIEWER_STATS_KEY}${userId}`;
const getLimitsKey = (userId: string): string => `${SUBMISSION_LIMITS_KEY}${userId}`;

const getLocalSubmissions = (): PeerReviewSubmission[] => {
    try {
        const stored = localStorage.getItem('peer_review_all_submissions');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalSubmissions = (submissions: PeerReviewSubmission[]): void => {
    localStorage.setItem('peer_review_all_submissions', JSON.stringify(submissions));
};

const getLocalReviews = (): PeerReview[] => {
    try {
        const stored = localStorage.getItem('peer_review_all_reviews');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalReviews = (reviews: PeerReview[]): void => {
    localStorage.setItem('peer_review_all_reviews', JSON.stringify(reviews));
};

export const checkSubmissionLimit = async (userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    submissionsToday: number;
}> => {
    try {
        const limitsKey = getLimitsKey(userId);
        const today = new Date().toISOString().split('T')[0];
        
        let limits: SubmissionLimit = {
            userId,
            submissionsToday: 0,
            lastResetDate: today
        };

        const stored = localStorage.getItem(limitsKey);
        if (stored) {
            limits = JSON.parse(stored);
            if (limits.lastResetDate !== today) {
                limits.submissionsToday = 0;
                limits.lastResetDate = today;
            }
        }

        const allowed = limits.submissionsToday < 5;
        return {
            allowed,
            remaining: Math.max(0, 5 - limits.submissionsToday),
            submissionsToday: limits.submissionsToday
        };
    } catch (error) {
        return { allowed: true, remaining: 5, submissionsToday: 0 };
    }
};

export const triggerCleanup = async (): Promise<void> => {
    console.log('[PeerReview] Cleanup skipped - using local storage');
};

export const submitEssay = async (
    userId: string,
    essayContent: string,
    prompt: string | null,
    taskType: 'Task 1' | 'Task 2',
    isAnonymous: boolean = false
): Promise<PeerReviewSubmission | null> => {
    try {
        const limitCheck = await checkSubmissionLimit(userId);
        if (!limitCheck.allowed) {
            throw new Error(`Daily submission limit reached (5 per day). You have ${limitCheck.remaining} submissions remaining.`);
        }

        const wordCount = essayContent.trim().split(/\s+/).length;
        const { estimateDifficulty } = await import('../utils/contentModeration');
        const difficultyLevel = estimateDifficulty(essayContent);

        const submission: PeerReviewSubmission = {
            id: crypto.randomUUID(),
            user_id: userId,
            essay_content: essayContent,
            prompt,
            task_type: taskType,
            word_count: wordCount,
            is_anonymous: isAnonymous,
            difficulty_level: difficultyLevel,
            status: 'pending',
            created_at: new Date().toISOString()
        } as PeerReviewSubmission;

        const submissions = getLocalSubmissions();
        submissions.unshift(submission);
        saveLocalSubmissions(submissions);

        const limitsKey = getLimitsKey(userId);
        const today = new Date().toISOString().split('T')[0];
        const limits: SubmissionLimit = {
            userId,
            submissionsToday: limitCheck.submissionsToday + 1,
            lastResetDate: today
        };
        localStorage.setItem(limitsKey, JSON.stringify(limits));

        analytics.trackSubmission(userId, submission.id, { taskType, wordCount }).catch(() => {});

        return submission;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Submit essay failed:', error as any);
        throw error;
    }
};

export const getReviewQueue = async (
    userId: string,
    page: number = 1,
    limit: number = 10
): Promise<PeerReviewSubmission[]> => {
    try {
        const offset = (page - 1) * limit;
        const submissions = getLocalSubmissions();
        
        const queue = submissions.filter(s => 
            s.status === 'pending' && 
            !s.claimed_by && 
            s.user_id !== userId
        ).slice(offset, offset + limit);

        return queue;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get queue failed:', error as any);
        return [];
    }
};

export interface QueueFilters {
    search: string;
    taskType: 'all' | 'Task 1' | 'Task 2';
    sortBy: 'newest' | 'oldest' | 'word_count_asc' | 'word_count_desc';
    difficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
}

export const getFilteredReviewQueue = async (
    userId: string,
    filters: QueueFilters,
    page: number = 1,
    limit: number = 10
): Promise<{ submissions: PeerReviewSubmission[]; total: number }> => {
    try {
        const offset = (page - 1) * limit;
        let submissions = getLocalSubmissions().filter(s => 
            s.status === 'pending' && 
            !s.claimed_by && 
            s.user_id !== userId
        );

        if (filters.taskType !== 'all') {
            submissions = submissions.filter(s => s.task_type === filters.taskType);
        }

        if (filters.search.trim()) {
            const searchTerm = sanitizeText(filters.search.trim(), { maxLength: 100 });
            submissions = submissions.filter(s => 
                s.prompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.essay_content?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filters.difficulty !== 'all') {
            submissions = submissions.filter(s => s.difficulty_level === filters.difficulty);
        }

        switch (filters.sortBy) {
            case 'newest':
                submissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
            case 'oldest':
                submissions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                break;
            case 'word_count_asc':
                submissions.sort((a, b) => (a.word_count || 0) - (b.word_count || 0));
                break;
            case 'word_count_desc':
                submissions.sort((a, b) => (b.word_count || 0) - (a.word_count || 0));
                break;
        }

        const total = submissions.length;
        return {
            submissions: submissions.slice(offset, offset + limit),
            total
        };
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get filtered queue failed:', error as any);
        return { submissions: [], total: 0 };
    }
};

export const claimEssay = async (
    submissionId: string,
    reviewerId: string
): Promise<boolean> => {
    try {
        const submissions = getLocalSubmissions();
        const index = submissions.findIndex(s => s.id === submissionId && !s.claimed_by);
        
        if (index === -1) return false;

        submissions[index] = {
            ...submissions[index],
            claimed_by: reviewerId,
            claimed_at: new Date().toISOString(),
            status: 'in_review'
        };
        saveLocalSubmissions(submissions);

        analytics.trackClaim(reviewerId, submissionId).catch(() => {});
        return true;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Claim essay failed:', error as any);
        return false;
    }
};

export const getMySubmissions = async (
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<PeerReviewSubmission[]> => {
    try {
        const offset = (page - 1) * limit;
        const submissions = getLocalSubmissions()
            .filter(s => s.user_id === userId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return submissions.slice(offset, offset + limit);
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get my submissions failed:', error as any);
        return [];
    }
};

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
        const overallBand = ((scores.taskResponse + scores.coherence + scores.lexical + scores.grammar) / 4).toFixed(1);

        const review: PeerReview = {
            id: crypto.randomUUID(),
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
            time_spent_seconds: timeSpentSeconds,
            created_at: new Date().toISOString()
        } as PeerReview;

        const reviews = getLocalReviews();
        reviews.unshift(review);
        saveLocalReviews(reviews);

        const submissions = getLocalSubmissions();
        const subIndex = submissions.findIndex(s => s.id === submissionId);
        if (subIndex !== -1) {
            submissions[subIndex].status = 'completed';
            saveLocalSubmissions(submissions);

            const submissionData = submissions[subIndex];
            if (submissionData.user_id) {
                try {
                    await notificationService.createNotification({
                        user_id: submissionData.user_id,
                        type: 'peer_review',
                        title: 'Essay Review Completed',
                        message: `Your essay received a Band ${overallBand} review!`,
                        data: {
                            submission_id: submissionId,
                            review_id: review.id,
                            band_score: overallBand
                        }
                    });
                } catch (e) {
                    peerReviewLogger.error('[PeerReview] Notification failed:', e);
                }
            }
        }

        await updateReviewerStats(reviewerId);
        analytics.trackReview(reviewerId, submissionId, review.id, {
            timeSpent: timeSpentSeconds,
            overallBand: parseFloat(overallBand),
            inlineCorrectionsCount: inlineCorrections?.length || 0
        }).catch(() => {});

        return review;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Submit review failed:', error as any);
        return null;
    }
};

export const getReviewsForSubmission = async (
    submissionId: string
): Promise<PeerReview[]> => {
    try {
        const reviews = getLocalReviews()
            .filter(r => r.submission_id === submissionId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return reviews;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get reviews failed:', error as any);
        return [];
    }
};

export const getMyReviews = async (
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<PeerReview[]> => {
    try {
        const offset = (page - 1) * limit;
        const reviews = getLocalReviews()
            .filter(r => r.reviewer_id === userId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return reviews.slice(offset, offset + limit);
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get my reviews failed:', error as any);
        return [];
    }
};

export const rateReview = async (
    reviewId: string,
    userId: string,
    rating: number,
    comment?: string
): Promise<boolean> => {
    try {
        const reviews = getLocalReviews();
        const reviewIndex = reviews.findIndex(r => r.id === reviewId);

        if (reviewIndex === -1) return false;

        const submissions = getLocalSubmissions();
        const submission = submissions.find(s => s.id === reviews[reviewIndex].submission_id);

        if (!submission || submission.user_id !== userId) {
            throw new Error('Unauthorized to rate this review');
        }

        reviews[reviewIndex].helpfulness_rating = rating;
        reviews[reviewIndex].author_comment = comment;
        saveLocalReviews(reviews);

        if (reviews[reviewIndex].reviewer_id) {
            await updateReviewerStats(reviews[reviewIndex].reviewer_id);
        }

        return true;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Rate review failed:', error as any);
        return false;
    }
};

const updateReviewerStats = async (userId: string): Promise<void> => {
    try {
        const reviews = getLocalReviews().filter(r => r.reviewer_id === userId);
        
        const stats: ReviewerStats = {
            user_id: userId,
            total_reviews: reviews.length,
            avg_helpfulness: reviews.filter(r => r.helpfulness_rating).reduce((sum, r) => sum + (r.helpfulness_rating || 0), 0) / Math.max(1, reviews.filter(r => r.helpfulness_rating).length),
            xp_earned: reviews.length * 10,
            tier: reviews.length >= 50 ? 'Expert' : reviews.length >= 20 ? 'Advanced' : reviews.length >= 5 ? 'Intermediate' : 'Novice'
        } as ReviewerStats;

        localStorage.setItem(getStatsKey(userId), JSON.stringify(stats));
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Update stats failed:', error as any);
    }
};

export const getReviewerStats = async (userId: string): Promise<ReviewerStats | null> => {
    try {
        const stored = localStorage.getItem(getStatsKey(userId));
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            user_id: userId,
            total_reviews: 0,
            avg_helpfulness: 0,
            xp_earned: 0,
            tier: 'Novice'
        } as ReviewerStats;
    } catch (error) {
        return null;
    }
};

export const getTopReviewers = async (limit: number = 10): Promise<ReviewerStats[]> => {
    try {
        const allStats: ReviewerStats[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(REVIEWER_STATS_KEY)) {
                const stats = JSON.parse(localStorage.getItem(key) || '{}');
                allStats.push(stats);
            }
        }
        return allStats
            .sort((a, b) => (b.total_reviews || 0) - (a.total_reviews || 0))
            .slice(0, limit);
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get top reviewers failed:', error as any);
        return [];
    }
};

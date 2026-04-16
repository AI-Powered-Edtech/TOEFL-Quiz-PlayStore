import { PeerReviewSubmission, PeerReview, ReviewerStats, InlineCorrection } from '../types';
import * as analytics from '../utils/analytics';
import { sanitizeText } from '../utils/inputValidation';
import { peerReviewLogger } from '../utils/monitoring';
import { offlineQueue } from './offlineQueueService';
import { apiClient } from './apiClient';

import { socialService } from './social';

export const checkSubmissionLimit = async (userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    submissionsToday: number;
}> => {
    try {
        const res = await apiClient.get<{ allowed: boolean; remaining: number; submissionsToday: number }>(`/api/writing/peer-review/limits/${userId}`);
        if (res.data) {
            return res.data;
        }
        return { allowed: true, remaining: 5, submissionsToday: 0 };
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

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

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
            created_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString()
        } as PeerReviewSubmission;

        // Optimistic cache using offline queue
        await offlineQueue.enqueue({
            service: 'peerReview',
            method: 'submitEssayApi',
            params: {
                essay_content: essayContent,
                prompt,
                task_type: taskType,
                is_anonymous: isAnonymous
            },
            priority: 1
        });

        // Or we can directly call API if online, offlineQueue processes later if offline
        if (navigator.onLine) {
            const res = await apiClient.post<PeerReviewSubmission>('/api/writing/peer-review/submissions', {
                essay_content: essayContent,
                prompt,
                task_type: taskType,
                is_anonymous: isAnonymous
            });
            if (res.data) {
                Object.assign(submission, res.data);
            }
        }

        // Limit check is handled by backend now.

        analytics.trackSubmission(userId, submission.id, { taskType, wordCount }).catch(() => {});

        return submission;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Submit essay failed:', error as any);
        throw error;
    }
};

// Required method for offlineQueueService execution
export const submitEssayApi = async (data: any) => {
    await apiClient.post('/api/writing/peer-review/submissions', data);
};

export const getReviewQueue = async (
    userId: string,
    page: number = 1,
    limit: number = 10
): Promise<PeerReviewSubmission[]> => {
    try {
        const res = await apiClient.get<PeerReviewSubmission[]>('/api/writing/peer-review/queue');
        if (res.data) {
            const offset = (page - 1) * limit;
            return res.data.slice(offset, offset + limit);
        }
        return [];
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
        const res = await apiClient.get<PeerReviewSubmission[]>('/api/writing/peer-review/queue');
        if (!res.data) {
            return { submissions: [], total: 0 };
        }

        let submissions = res.data.filter(s => 
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
        const res = await apiClient.patch(`/api/writing/peer-review/submissions/${submissionId}/claim`);
        if (res.error) return false;

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
        const res = await apiClient.get<PeerReviewSubmission[]>('/api/writing/peer-review/my-submissions');
        if (res.data) {
            return res.data.slice(offset, offset + limit);
        }
        return [];
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

        // Optimistic cache using offline queue
        await offlineQueue.enqueue({
            service: 'peerReview',
            method: 'submitReviewApi',
            params: {
                submission_id: submissionId,
                task_response_score: scores.taskResponse,
                coherence_score: scores.coherence,
                lexical_score: scores.lexical,
                grammar_score: scores.grammar,
                strengths: feedback.strengths,
                weaknesses: feedback.weaknesses,
                suggestions: feedback.suggestions,
                inline_corrections: JSON.stringify(inlineCorrections),
                time_spent_seconds: timeSpentSeconds
            },
            priority: 1
        });

        if (navigator.onLine) {
            const res = await apiClient.post<any>('/api/writing/peer-review/reviews', {
                submission_id: submissionId,
                task_response_score: scores.taskResponse,
                coherence_score: scores.coherence,
                lexical_score: scores.lexical,
                grammar_score: scores.grammar,
                strengths: feedback.strengths,
                weaknesses: feedback.weaknesses,
                suggestions: feedback.suggestions,
                inline_corrections: JSON.stringify(inlineCorrections),
                time_spent_seconds: timeSpentSeconds
            });
            if (res.data && res.data.id) {
                review.id = res.data.id;
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

// Required method for offlineQueueService execution
export const submitReviewApi = async (data: any) => {
    await apiClient.post('/api/writing/peer-review/reviews', data);
};

export const getReviewsForSubmission = async (
    submissionId: string
): Promise<PeerReview[]> => {
    try {
        const res = await apiClient.get<PeerReview[]>(`/api/writing/peer-review/submissions/${submissionId}/reviews`);
        if (res.data) {
            return res.data;
        }
        return [];
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
        const res = await apiClient.get<PeerReview[]>('/api/writing/peer-review/my-reviews');
        if (res.data) {
            return res.data.slice(offset, offset + limit);
        }
        return [];
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
        const res = await apiClient.patch(`/api/writing/peer-review/reviews/${reviewId}/rate`, {
            rating,
            comment
        });
        
        if (res.error) return false;

        return true;
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Rate review failed:', error as any);
        return false;
    }
};

const updateReviewerStats = async (userId: string): Promise<void> => {
    // Stats are now updated on the backend when a review is submitted
};

export const getReviewerStats = async (userId: string): Promise<ReviewerStats | null> => {
    try {
        const res = await apiClient.get<ReviewerStats>(`/api/writing/peer-review/users/${userId}/stats`);
        if (res.data) {
            return res.data;
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
        const res = await apiClient.get<ReviewerStats[]>(`/api/writing/peer-review/top-reviewers?limit=${limit}`);
        if (res.data) {
            return res.data;
        }
        return [];
    } catch (error) {
        peerReviewLogger.error('[PeerReview] Get top reviewers failed:', error as any);
        return [];
    }
};

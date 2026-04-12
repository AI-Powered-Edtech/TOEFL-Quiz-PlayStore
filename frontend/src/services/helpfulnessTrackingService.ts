import { PeerReview, ReviewerStats } from '../types';

export interface HelpfulnessFeedback {
    reviewId: string;
    submissionId: string;
    reviewerId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    helpfulAspects: string[];
    improvementSuggestions?: string;
    createdAt: string;
}

export interface QualityMetrics {
    totalHelpfulnessScore: number;
    totalRatings: number;
    averageRating: number;
    ratingsDistribution: Record<number, number>;
    recentRatings: number[];
    trend: 'improving' | 'stable' | 'declining';
}

const FEEDBACK_KEY = 'peer_review_helpfulness';

const getFeedbackStorage = (): HelpfulnessFeedback[] => {
    try {
        const stored = localStorage.getItem(FEEDBACK_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveFeedbackStorage = (feedback: HelpfulnessFeedback[]): void => {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));
};

export const submitHelpfulnessFeedback = async (
    reviewId: string,
    submissionId: string,
    reviewerId: string,
    rating: 1 | 2 | 3 | 4 | 5,
    helpfulAspects: string[],
    improvementSuggestions?: string
): Promise<{ success: boolean; error?: string }> => {
    const existing = getFeedbackStorage();
    const alreadyRated = existing.some(f => f.reviewId === reviewId);
    
    if (alreadyRated) {
        return { success: false, error: 'Already rated this review' };
    }

    const feedback: HelpfulnessFeedback = {
        reviewId,
        submissionId,
        reviewerId,
        rating,
        helpfulAspects,
        improvementSuggestions,
        createdAt: new Date().toISOString(),
    };

    existing.push(feedback);
    saveFeedbackStorage(existing);

    await updateReviewerStatsAfterFeedback(reviewerId);

    return { success: true };
};

export const getHelpfulnessFeedback = (reviewId: string): HelpfulnessFeedback | undefined => {
    const all = getFeedbackStorage();
    return all.find(f => f.reviewId === reviewId);
};

export const getReviewerFeedbacks = (reviewerId: string): HelpfulnessFeedback[] => {
    const all = getFeedbackStorage();
    return all.filter(f => f.reviewerId === reviewerId);
};

export const calculateQualityMetrics = (reviewerId: string): QualityMetrics => {
    const feedbacks = getReviewerFeedbacks(reviewerId);
    
    if (feedbacks.length === 0) {
        return {
            totalHelpfulnessScore: 0,
            totalRatings: 0,
            averageRating: 0,
            ratingsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            recentRatings: [],
            trend: 'stable',
        };
    }

    const totalScore = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const avgRating = totalScore / feedbacks.length;
    
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach(f => {
        distribution[f.rating] = (distribution[f.rating] || 0) + 1;
    });

    const recent = feedbacks.slice(-10).map(f => f.rating);
    
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recent.length >= 6) {
        const firstHalf = recent.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
        const secondHalf = recent.slice(-3).reduce((a, b) => a + b, 0) / 3;
        
        if (secondHalf - firstHalf >= 0.5) {
            trend = 'improving';
        } else if (firstHalf - secondHalf >= 0.5) {
            trend = 'declining';
        }
    }

    return {
        totalHelpfulnessScore: totalScore,
        totalRatings: feedbacks.length,
        averageRating: Math.round(avgRating * 10) / 10,
        ratingsDistribution: distribution,
        recentRatings: recent,
        trend,
    };
};

export const updateReviewerStatsAfterFeedback = async (reviewerId: string): Promise<ReviewerStats> => {
    const feedbacks = getReviewerFeedbacks(reviewerId);
    const totalReviews = feedbacks.length;
    
    const avgHelpfulness = totalReviews > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalReviews
        : 0;

    const statsKey = `reviewer_stats_${reviewerId}`;
    let stats: ReviewerStats = {
        user_id: reviewerId,
        total_reviews: totalReviews,
        avg_helpfulness: Math.round(avgHelpfulness * 10) / 10,
        xp_earned: 0,
        tier: 'Novice',
        updated_at: new Date().toISOString(),
    };

    const stored = localStorage.getItem(statsKey);
    if (stored) {
        stats = { ...JSON.parse(stored), ...stats };
        stats.total_reviews = totalReviews;
        stats.avg_helpfulness = Math.round(avgHelpfulness * 10) / 10;
        stats.updated_at = new Date().toISOString();
    }

    localStorage.setItem(statsKey, JSON.stringify(stats));
    return stats;
};

export const getHelpfulAspectsOptions = (): string[] => [
    'Clear explanations',
    'Specific examples',
    'Actionable suggestions',
    'Grammar corrections',
    'Vocabulary improvements',
    'Structural feedback',
    'Encouraging tone',
    'Detailed rubric breakdown',
];

export const isHelpfulnessEligible = (review: PeerReview): boolean => {
    const createdAt = new Date(review.created_at);
    const now = new Date();
    const hoursSinceReview = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceReview >= 24 && hoursSinceReview <= 168;
};

export const getPendingFeedbacks = (userId: string): PeerReview[] => {
    const allReviews = JSON.parse(localStorage.getItem('peer_review_all_reviews') || '[]');
    const feedback = getFeedbackStorage();
    const ratedReviewIds = new Set(feedback.map(f => f.reviewId));
    
    const userSubmissions = JSON.parse(localStorage.getItem('peer_review_all_submissions') || '[]')
        .filter((s: any) => s.user_id === userId)
        .map((s: any) => s.id);

    return allReviews
        .filter((r: PeerReview) => userSubmissions.includes(r.submission_id))
        .filter((r: PeerReview) => !ratedReviewIds.has(r.id))
        .filter((r: PeerReview) => isHelpfulnessEligible(r))
        .slice(0, 5);
};
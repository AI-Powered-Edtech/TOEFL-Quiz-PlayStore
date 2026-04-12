import { supabase } from '../services/supabase';

/**
 * Analytics tracking utility for Peer Review system
 * 
 * Tracks events to gain visibility into system usage and performance.
 * All tracking is non-blocking and fails silently to avoid disrupting user experience.
 */

export type AnalyticsEventType = 'submission' | 'claim' | 'review' | 'rating' | 'navigate';

export interface AnalyticsEvent {
    eventType: AnalyticsEventType;
    userId?: string;
    submissionId?: string;
    reviewId?: string;
    metadata?: Record<string, any>;
}

/**
 * Track an analytics event
 * 
 * @param event - Event details to track
 * @returns Promise that resolves when event is tracked (or fails silently)
 */
export const trackEvent = async (event: AnalyticsEvent): Promise<void> => {
    try {
        let userId = event.userId;
        if (!userId) {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id;
        }

        if (!userId) {
            // console.warn('[Analytics] Skipped event (no user):', event.eventType);
            return;
        }

        const { error } = await supabase
            .from('peer_review_analytics')
            .insert({
                event_type: event.eventType,
                user_id: userId,
                submission_id: event.submissionId || null,
                review_id: event.reviewId || null,
                metadata: event.metadata || {}
            });
        // ...

        if (error) {
            // Silently warn — table may not exist yet
            console.warn('[Analytics] Track skipped (table may not exist):', error.code);
        }
    } catch (error) {
        // Fail silently - analytics should never disrupt user experience
    }
};

/**
 * Track essay submission
 */
export const trackSubmission = async (
    userId: string,
    submissionId: string,
    metadata?: { taskType?: string; wordCount?: number }
): Promise<void> => {
    await trackEvent({
        eventType: 'submission',
        userId,
        submissionId,
        metadata
    });
};

/**
 * Track essay claim
 */
export const trackClaim = async (
    userId: string,
    submissionId: string,
    metadata?: { previousStatus?: string }
): Promise<void> => {
    await trackEvent({
        eventType: 'claim',
        userId,
        submissionId,
        metadata
    });
};

/**
 * Track review submission
 */
export const trackReview = async (
    userId: string,
    submissionId: string,
    reviewId: string,
    metadata?: {
        timeSpent?: number;
        overallBand?: number;
        inlineCorrectionsCount?: number;
    }
): Promise<void> => {
    await trackEvent({
        eventType: 'review',
        userId,
        submissionId,
        reviewId,
        metadata
    });
};

/**
 * Track review rating
 */
export const trackRating = async (
    userId: string,
    reviewId: string,
    metadata?: {
        helpful?: boolean;
        submissionId?: string;
    }
): Promise<void> => {
    await trackEvent({
        eventType: 'rating',
        userId,
        reviewId,
        metadata
    });
};

/**
 * Get analytics summary for a user
 * 
 * @param userId - User ID to get analytics for
 * @returns Analytics summary with event counts
 */
export const getUserAnalytics = async (userId: string): Promise<{
    submissions: number;
    claims: number;
    reviews: number;
    ratings: number;
} | null> => {
    try {
        const { data, error } = await supabase
            .from('peer_review_analytics')
            .select('event_type')
            .eq('user_id', userId);

        if (error) {
            console.warn('[Analytics] Get user analytics skipped (table may not exist):', error.code);
            return { submissions: 0, claims: 0, reviews: 0, ratings: 0 };
        }

        const summary = {
            submissions: 0,
            claims: 0,
            reviews: 0,
            ratings: 0
        };

        data?.forEach((event: { event_type: string }) => {
            if (event.event_type === 'submission') summary.submissions++;
            if (event.event_type === 'claim') summary.claims++;
            if (event.event_type === 'review') summary.reviews++;
            if (event.event_type === 'rating') summary.ratings++;
        });

        return summary;
    } catch (error) {
        console.error('[Analytics] Unexpected error:', error);
        return null;
    }
};

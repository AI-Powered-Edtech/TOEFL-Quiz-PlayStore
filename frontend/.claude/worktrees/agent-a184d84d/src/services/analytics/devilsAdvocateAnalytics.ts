/**
 * Analytics tracking for Devil's Advocate feature
 * Tracks user engagement and feature usage metrics
 */

export type DevilsAdvocateEventType =
    | 'challenge_generated'
    | 'defense_submitted'
    | 'session_completed';

export interface DevilsAdvocateEventMetadata {
    argumentLength?: number;
    defenseLength?: number;
    score?: number;
    isSuccessful?: boolean;
    timeSpentSeconds?: number;
}

/**
 * Track Devil's Advocate events
 * In development: logs to console
 * In production: can be extended to send to analytics service (PostHog, Mixpanel, etc.)
 */
export const trackDevilsAdvocateEvent = async (
    eventType: DevilsAdvocateEventType,
    metadata: DevilsAdvocateEventMetadata = {}
): Promise<void> => {
    try {
        const event = {
            type: `devils_advocate_${eventType}`,
            metadata,
            timestamp: new Date().toISOString(),
        };

        // Log to console in development
        const isDevelopment = typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1');

        if (isDevelopment) {
            console.log('[Analytics] Devils Advocate:', eventType, metadata);
        }

        // TODO: Send to analytics service in production
        // Example integrations:
        // - Supabase: await supabase.from('analytics_events').insert(event);
        // - PostHog: posthog.capture(event.type, event.metadata);
        // - Mixpanel: mixpanel.track(event.type, event.metadata);

    } catch (error) {
        // Fail silently - analytics should never break user experience
        console.warn('Failed to track analytics event:', error);
    }
};

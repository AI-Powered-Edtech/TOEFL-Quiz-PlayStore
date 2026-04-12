export type AuthEventType = 
    | 'guest_login'
    | 'guest_heart_used'
    | 'guest_heart_depleted'
    | 'guest_conversion_prompt'
    | 'guest_signup_attempt'
    | 'guest_signup_success'
    | 'guest_signup_failure'
    | 'oauth_login_start'
    | 'oauth_login_success'
    | 'oauth_login_failure'
    | 'email_login_success'
    | 'email_login_failure'
    | 'email_register_success'
    | 'email_register_failure'
    | 'logout'
    | 'session_expired'
    | 'token_refresh'
    | 'token_refresh_failure';

export interface AuthAnalyticsEvent {
    eventType: AuthEventType;
    userId?: string;
    guestId?: string;
    metadata?: Record<string, unknown>;
    timestamp?: number;
}

export interface AuthAnalyticsSummary {
    totalGuestLogins: number;
    totalGuestHeartUsage: number;
    totalConversions: number;
    conversionRate: number;
    oauthLogins: number;
    emailLogins: number;
    registrations: number;
}

export const trackAuthEvent = async (event: AuthAnalyticsEvent): Promise<void> => {
    try {
        const eventData = {
            event_type: event.eventType,
            user_id: event.userId || null,
            guest_id: event.guestId || getOrCreateGuestId(),
            metadata: {
                ...event.metadata,
                timestamp: event.timestamp || Date.now(),
                session_id: getOrCreateSessionId(),
            },
        };

        console.log('[AuthAnalytics]', event.eventType, eventData);

    } catch (error) {
        console.warn('[AuthAnalytics] Track failed:', error);
    }
};

export const trackGuestLogin = (metadata?: { source?: string }): Promise<void> => {
    return trackAuthEvent({
        eventType: 'guest_login',
        metadata,
    });
};

export const trackGuestHeartUsed = (feature: string, remainingHearts: number): Promise<void> => {
    return trackAuthEvent({
        eventType: 'guest_heart_used',
        metadata: {
            feature,
            remaining_hearts: remainingHearts,
        },
    });
};

export const trackGuestHeartDepleted = (feature: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'guest_heart_depleted',
        metadata: {
            feature,
            timestamp: Date.now(),
        },
    });
};

export const trackGuestConversionPrompt = (trigger: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'guest_conversion_prompt',
        metadata: { trigger },
    });
};

export const trackGuestSignupAttempt = (method: 'email' | 'google'): Promise<void> => {
    return trackAuthEvent({
        eventType: 'guest_signup_attempt',
        metadata: { method },
    });
};

export const trackGuestSignupSuccess = (userId: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'guest_signup_success',
        userId,
    });
};

export const trackGuestSignupFailure = (method: string, reason: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'guest_signup_failure',
        metadata: { method, reason },
    });
};

export const trackOAuthLoginStart = (provider: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'oauth_login_start',
        metadata: { provider },
    });
};

export const trackOAuthLoginSuccess = (userId: string, provider: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'oauth_login_success',
        userId,
        metadata: { provider },
    });
};

export const trackOAuthLoginFailure = (provider: string, error: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'oauth_login_failure',
        metadata: { provider, error },
    });
};

export const trackEmailLogin = (success: boolean, userId?: string): Promise<void> => {
    return trackAuthEvent({
        eventType: success ? 'email_login_success' : 'email_login_failure',
        userId,
    });
};

export const trackEmailRegister = (success: boolean, userId?: string): Promise<void> => {
    return trackAuthEvent({
        eventType: success ? 'email_register_success' : 'email_register_failure',
        userId,
    });
};

export const trackLogout = (userId: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'logout',
        userId,
    });
};

export const trackSessionExpired = (userId: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'session_expired',
        userId,
    });
};

export const trackTokenRefresh = (success: boolean, userId?: string): Promise<void> => {
    return trackAuthEvent({
        eventType: success ? 'token_refresh' : 'token_refresh_failure',
        userId,
    });
};

export const trackSessionExpiredEvent = (userId: string): Promise<void> => {
    return trackAuthEvent({
        eventType: 'session_expired',
        userId,
    });
};

function getOrCreateGuestId(): string {
    const GUEST_ID_KEY = 'toefl_guest_id';
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
}

function getOrCreateSessionId(): string {
    const SESSION_ID_KEY = 'toefl_session_id';
    let sessionId = localStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
}

export const getAuthAnalyticsSummary = async (): Promise<AuthAnalyticsSummary | null> => {
    try {
        const guestLogins = localStorage.getItem('auth_event_guest_login') || '0';
        const heartUsage = localStorage.getItem('auth_event_guest_heart_used') || '0';
        const conversions = localStorage.getItem('auth_event_guest_signup_success') || '0';

        return {
            totalGuestLogins: parseInt(guestLogins, 10),
            totalGuestHeartUsage: parseInt(heartUsage, 10),
            totalConversions: parseInt(conversions, 10),
            conversionRate: parseInt(conversions, 10) / Math.max(1, parseInt(guestLogins, 10)),
            oauthLogins: 0,
            emailLogins: 0,
            registrations: 0,
        };
    } catch {
        return null;
    }
};
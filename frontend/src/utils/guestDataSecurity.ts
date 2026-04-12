import { isGuestUser, clearGuestData, getGuestUsageStats, type GuestUsageStats } from '../hooks/useFreePlanHearts';
import { trackGuestSignupSuccess } from './authAnalytics';

export const GUEST_DATA_KEYS = [
    'guest_hearts_count',
    'guest_hearts_reset_date',
    'guest_activity_log',
    'toefl_guest_id',
    'toefl_session_id',
];

export interface GuestDataPolicy {
    canSaveProgress: boolean;
    canUseAI: boolean;
    canAccessPremium: boolean;
    maxDailyHearts: number;
    maxDailyQuizzes: number;
}

export const GUEST_DATA_POLICY: GuestDataPolicy = {
    canSaveProgress: false,
    canUseAI: true,
    canAccessPremium: false,
    maxDailyHearts: 5,
    maxDailyQuizzes: 3,
};

export const getGuestDataPolicy = (): GuestDataPolicy => {
    return { ...GUEST_DATA_POLICY };
};

export const isLocalOnlyData = (key: string): boolean => {
    return GUEST_DATA_KEYS.some(localKey => 
        key === localKey || key.startsWith('guest_') || key.startsWith('toefl_guest')
    );
};

export const cleanGuestDataOnAuth = async (userId: string): Promise<void> => {
    clearGuestData();
    await trackGuestSignupSuccess(userId);
};

export const isGuestDataSyncSafe = async (): Promise<boolean> => {
    return isGuestUser();
};

export const getGuestSafeData = (): Record<string, unknown> => {
    if (!isGuestUser()) return {};

    try {
        return {
            guest_hearts_count: localStorage.getItem('guest_hearts_count'),
            guest_hearts_reset_date: localStorage.getItem('guest_hearts_reset_date'),
        };
    } catch {
        return {};
    }
};

export const validateGuestAction = (action: string): { allowed: boolean; reason?: string } => {
    const policy = getGuestDataPolicy();
    const guestStats = getGuestUsageStats();

    const actionLimits: Record<string, { max: number; current: number }> = {
        'ai_chat': { 
            max: policy.maxDailyHearts, 
            current: guestStats.featuresUsed.filter(f => f === 'ai_chat').length 
        },
        'quiz': { 
            max: policy.maxDailyQuizzes, 
            current: guestStats.featuresUsed.filter(f => f === 'quiz').length 
        },
    };

    const limit = actionLimits[action];
    if (limit && limit.current >= limit.max) {
        return {
            allowed: false,
            reason: `Daily limit reached for ${action}. Create an account to continue.`,
        };
    }

    return { allowed: true };
};

export const sanitizeGuestDataForSync = (data: Record<string, unknown>): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
        if (!isLocalOnlyData(key)) {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

export const clearAllLocalData = (): void => {
    GUEST_DATA_KEYS.forEach(key => {
        localStorage.removeItem(key);
    });
    
    localStorage.removeItem('toefl_guest_id');
    localStorage.removeItem('toefl_session_id');
    
    sessionStorage.clear();
};
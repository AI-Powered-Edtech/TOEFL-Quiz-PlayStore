import { useCallback, useMemo, useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { 
    canAccessFeature, 
    type FeatureAccess, 
    type GatedFeature,
    type SubscriptionTier 
} from '../services/subscriptionService';
import { isGuestUser, getGuestUsageStats, type GuestUsageStats } from '../hooks/useFreePlanHearts';

export interface GuestPolicyConfig {
    enforceOnGuest: boolean;
    enforceOnFree: boolean;
    allowWithoutHearts: boolean;
    maxDailyGuestHearts: number;
}

const DEFAULT_GUEST_POLICY: GuestPolicyConfig = {
    enforceOnGuest: true,
    enforceOnFree: true,
    allowWithoutHearts: false,
    maxDailyGuestHearts: 5,
};

export interface PolicyCheckResult {
    allowed: boolean;
    reason?: string;
    requiresAuth?: boolean;
    requiresUpgrade?: boolean;
    upgradeToTier?: SubscriptionTier;
    heartsRequired?: number;
    showPaywall?: boolean;
}

const FEATURE_GUEST_LIMITS: Record<string, { maxDaily: number; requiresAuth: boolean }> = {
    'quiz': { maxDaily: 3, requiresAuth: false },
    'writing_gym': { maxDaily: 2, requiresAuth: false },
    'simulation': { maxDaily: 1, requiresAuth: true },
    'cefr_test': { maxDaily: 1, requiresAuth: true },
    'ai_chat': { maxDaily: 3, requiresAuth: false },
    'peer_review': { maxDaily: 1, requiresAuth: false },
};

export const useGuestPolicy = (feature: string, customPolicy?: Partial<GuestPolicyConfig>) => {
    const { user, isAuthenticated } = useAuthStore();
    const [guestStats, setGuestStats] = useState<GuestUsageStats | null>(null);

    const policy = useMemo(() => ({
        ...DEFAULT_GUEST_POLICY,
        ...customPolicy,
    }), [customPolicy]);

    useEffect(() => {
        if (!isAuthenticated) {
            setGuestStats(getGuestUsageStats());
        }
    }, [isAuthenticated]);

    const checkPolicy = useCallback(async (): Promise<PolicyCheckResult> => {
        // Bypass for Dev Mode
        if (import.meta.env.DEV) {
            return { allowed: true };
        }

        const isGuest = !isAuthenticated;
        const featureLimit = FEATURE_GUEST_LIMITS[feature];

        if (isGuest && featureLimit?.requiresAuth) {
            return {
                allowed: false,
                reason: `Feature "${feature}" requires account`,
                requiresAuth: true,
                showPaywall: true,
            };
        }

        if (isGuest && featureLimit) {
            const todayUsage = guestStats?.featuresUsed.filter(f => f === feature).length || 0;
            if (todayUsage >= featureLimit.maxDaily) {
                return {
                    allowed: false,
                    reason: `Daily limit reached for ${feature}`,
                    requiresAuth: true,
                    heartsRequired: policy.maxDailyGuestHearts,
                    showPaywall: true,
                };
            }
        }

        const featureMap: Record<string, GatedFeature> = {
            'quiz': 'unlimited_quizzes',
            'writing_gym': 'writing_gym_advanced',
            'simulation': 'full_simulation',
            'cefr_test': 'cefr_test',
            'ai_chat': 'ai_chat',
            'peer_review': 'peer_review',
            'essay_dojo': 'essay_dojo',
            'pdf_upload': 'pdf_upload',
        };

        const gatedFeature = featureMap[feature];
        if (gatedFeature) {
            const access = await canAccessFeature(gatedFeature);
            if (!access.allowed) {
                return {
                    allowed: false,
                    reason: access.reason,
                    requiresUpgrade: true,
                    upgradeToTier: access.upgradeTo,
                    showPaywall: true,
                };
            }
        }

        return { allowed: true };
    }, [isAuthenticated, feature, guestStats, policy]);

    const enforcePolicy = useCallback(async (onDenied?: (result: PolicyCheckResult) => void): Promise<boolean> => {
        const result = await checkPolicy();
        if (!result.allowed && onDenied) {
            onDenied(result);
        }
        return result.allowed;
    }, [checkPolicy]);

    const canGuestUse = useCallback((action: string): boolean => {
        // Bypass for Dev Mode
        if (import.meta.env.DEV) return true;

        if (isAuthenticated) return true;
        
        const limit = FEATURE_GUEST_LIMITS[action];
        if (!limit) return true;
        
        const usage = guestStats?.featuresUsed.filter(f => f === action).length || 0;
        return usage < limit.maxDaily;
    }, [isAuthenticated, guestStats]);

    return {
        checkPolicy,
        enforcePolicy,
        canGuestUse,
        isGuest: !isAuthenticated,
        guestStats,
        renderGuestFallback: () => {
            if (isAuthenticated) return null;
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Guest Limit Reached</h3>
                    <p className="text-gray-600 mb-4">You've reached your daily limit for this feature.</p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                        Sign In to Continue
                    </button>
                </div>
            );
        }
    };
};

export const checkFeatureAccess = async (feature: string, isAuthenticated: boolean): Promise<FeatureAccess> => {
    // Bypass for Dev Mode
    if (import.meta.env.DEV) {
        return { allowed: true };
    }

    if (!isAuthenticated) {
        const guestLimit = FEATURE_GUEST_LIMITS[feature];
        if (guestLimit?.requiresAuth) {
            return {
                allowed: false,
                reason: 'Account required',
            };
        }
    }

    const featureMap: Record<string, GatedFeature> = {
        'quiz': 'unlimited_quizzes',
        'writing_gym': 'writing_gym_advanced',
        'simulation': 'full_simulation',
        'cefr_test': 'cefr_test',
        'ai_chat': 'ai_chat',
        'peer_review': 'peer_review',
    };

    const gatedFeature = featureMap[feature];
    if (gatedFeature) {
        return canAccessFeature(gatedFeature);
    }

    return { allowed: true };
};

export const GUEST_POLICY_LIMITS = FEATURE_GUEST_LIMITS;
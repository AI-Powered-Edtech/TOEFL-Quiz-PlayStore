import { useState, useEffect, useCallback } from 'react';
import authService from '../services/auth';
import { useAuthStore } from '../stores/useAuthStore';
import {
    getUserTier,
    getTokenUsage,
    canAccessFeature,
    consumeToken,
    clearTierCache,
    getTierDisplayName,
    getTierColor,
    getTierIcon,
    getTierPrice,
    type SubscriptionTier,
    type TokenUsage,
    type GatedFeature,
    type FeatureAccess,
} from '../services/subscriptionService';

interface UseSubscriptionReturn {
    tier: SubscriptionTier;
    tierName: string;
    tierColor: string;
    tierIcon: string;
    tierPrice: string;
    loading: boolean;
    tokenUsage: TokenUsage;
    checkAccess: (feature: GatedFeature) => Promise<FeatureAccess>;
    useToken: (feature?: string) => Promise<{ allowed: boolean; usage: TokenUsage }>;
    refresh: () => Promise<void>;
    isPaid: boolean;
    isC2: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
    const [tier, setTier] = useState<SubscriptionTier>('free');
    const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
        tokens_used: 0,
        tokens_limit: 15,
        remaining: 15,
        percentage: 0,
    });
    const [loading, setLoading] = useState(true);
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            if (!isAuthenticated) {
                setTier('free');
                setTokenUsage({ tokens_used: 0, tokens_limit: 15, remaining: 15, percentage: 0 });
                return;
            }
            const currentTier = await getUserTier();
            setTier(currentTier);
            const usage = await getTokenUsage();
            setTokenUsage(usage);
        } catch (err) {
            console.error('[useSubscription] Refresh error:', err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        refresh();

        const handleSubscriptionChanged = () => refresh();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') refresh();
        };
        window.addEventListener('subscription:changed', handleSubscriptionChanged);
        document.addEventListener('visibilitychange', handleVisibility);

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible' && authService.isAuthenticated()) refresh();
        }, 60000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('subscription:changed', handleSubscriptionChanged);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [refresh]);

    const checkAccess = useCallback(async (feature: GatedFeature): Promise<FeatureAccess> => {
        return canAccessFeature(feature);
    }, []);

    const useToken = useCallback(async (feature?: string) => {
        const result = await consumeToken(feature);
        setTokenUsage(result.usage);
        return result;
    }, []);

    return {
        tier,
        tierName: getTierDisplayName(tier),
        tierColor: getTierColor(tier),
        tierIcon: getTierIcon(tier),
        tierPrice: getTierPrice(tier),
        loading,
        tokenUsage,
        checkAccess,
        useToken,
        refresh,
        isPaid: tier !== 'free',
        isC2: tier === 'c2',
    };
}

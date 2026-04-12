import { useState, useEffect, useCallback } from 'react';
import authService from '../services/auth';
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

    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            const currentTier = await getUserTier();
            setTier(currentTier);
            const usage = await getTokenUsage();
            setTokenUsage(usage);
        } catch (err) {
            console.error('[useSubscription] Refresh error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();

        const interval = setInterval(refresh, 60000);
        return () => clearInterval(interval);
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

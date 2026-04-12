/**
 * useSubscription Hook
 * 
 * React hook providing subscription state to components.
 * Auto-refreshes on auth state changes.
 */

import { useState, useEffect, useCallback } from 'react';
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
import { supabase } from '../services/supabase';

interface UseSubscriptionReturn {
    /** Current tier */
    tier: SubscriptionTier;
    /** Display-friendly tier info */
    tierName: string;
    tierColor: string;
    tierIcon: string;
    tierPrice: string;
    /** Whether data is loading */
    loading: boolean;
    /** Token usage for today */
    tokenUsage: TokenUsage;
    /** Check if a feature is accessible */
    checkAccess: (feature: GatedFeature) => Promise<FeatureAccess>;
    /** Consume 1 AI token, returns if allowed */
    useToken: (feature?: string) => Promise<{ allowed: boolean; usage: TokenUsage }>;
    /** Refresh subscription data */
    refresh: () => Promise<void>;
    /** Whether user is on a paid plan */
    isPaid: boolean;
    /** Whether user is on the highest plan */
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

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            clearTierCache();
            refresh();
        });

        return () => subscription.unsubscribe();
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

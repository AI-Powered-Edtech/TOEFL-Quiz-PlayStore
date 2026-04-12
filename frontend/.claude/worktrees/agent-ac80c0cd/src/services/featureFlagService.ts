// Feature Flag Service
// Provides gradual rollout and A/B testing capabilities

import { supabase } from './supabase';

interface FeatureFlag {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    rollout_percent: number;
    allowed_users: string[];
    created_at: string;
    updated_at: string;
}

class FeatureFlagService {
    private cache: Map<string, FeatureFlag> = new Map();
    private cacheExpiry: Map<string, number> = new Map();
    private cacheTTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Check if a feature is enabled for a specific user
     */
    async isEnabled(flagName: string, userId?: string): Promise<boolean> {
        try {
            const flag = await this.getFlag(flagName);

            if (!flag) {
                console.warn(`[FeatureFlags] Flag not found: ${flagName}`);
                return false;
            }

            // If flag is globally disabled, return false
            if (!flag.enabled) {
                return false;
            }

            // If user is in target list, always enable
            if (userId && flag.allowed_users && flag.allowed_users.includes(userId)) {
                return true;
            }

            // If 100% rollout, enable for everyone
            if (flag.rollout_percent >= 100) {
                return true;
            }

            // If 0% rollout, disable for everyone (except target users)
            if (flag.rollout_percent <= 0) {
                return false;
            }

            // Percentage-based rollout with consistent hashing
            if (userId) {
                return this.isUserInRollout(userId, flagName, flag.rollout_percent);
            }

            // No user ID, use random (not consistent across sessions)
            return Math.random() * 100 < flag.rollout_percent;
        } catch (error) {
            console.error(`[FeatureFlags] Error checking flag ${flagName}:`, error);
            return false; // Fail closed
        }
    }

    /**
     * Get flag from cache or database
     */
    private async getFlag(flagName: string): Promise<FeatureFlag | null> {
        // Check cache first
        const cached = this.cache.get(flagName);
        const expiry = this.cacheExpiry.get(flagName);

        if (cached && expiry && Date.now() < expiry) {
            return cached;
        }

        // Fetch from database
        const { data, error } = await supabase
            .from('feature_flags')
            .select('*')
            .eq('name', flagName)
            .maybeSingle();

        if (error) {
            console.error(`[FeatureFlags] Database error:`, error);
            return null;
        }

        if (!data) {
            return null;
        }

        // Update cache
        this.cache.set(flagName, data);
        this.cacheExpiry.set(flagName, Date.now() + this.cacheTTL);

        return data;
    }

    /**
     * Consistent hash-based rollout
     * Same user ID + flag name = same result
     */
    private isUserInRollout(userId: string, flagName: string, percentage: number): boolean {
        const hash = this.hashString(`${userId}:${flagName}`);
        const bucket = hash % 100;
        return bucket < percentage;
    }

    /**
     * Simple string hash function
     * Returns a number between 0 and MAX_SAFE_INTEGER
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Clear cache (useful for testing or forcing refresh)
     */
    clearCache(): void {
        this.cache.clear();
        this.cacheExpiry.clear();
    }

    /**
     * Get all flags (for admin UI)
     */
    async getAllFlags(): Promise<FeatureFlag[]> {
        const { data, error } = await supabase
            .from('feature_flags')
            .select('*')
            .order('name');

        if (error) {
            console.error('[FeatureFlags] Error fetching all flags:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Update flag (admin only)
     */
    async updateFlag(
        flagName: string,
        updates: Partial<Pick<FeatureFlag, 'enabled' | 'rollout_percent' | 'allowed_users'>>
    ): Promise<boolean> {
        const { error } = await supabase
            .from('feature_flags')
            .update(updates)
            .eq('name', flagName);

        if (error) {
            console.error(`[FeatureFlags] Error updating flag ${flagName}:`, error);
            return false;
        }

        // Clear cache for this flag
        this.cache.delete(flagName);
        this.cacheExpiry.delete(flagName);

        return true;
    }
}

export const featureFlagService = new FeatureFlagService();

// Convenience methods for specific features
export const isIELTSParagraphEnabled = (userId?: string) => featureFlagService.isEnabled('ielts_paragraph_enabled', userId);
export const isMasonEnabled = (userId?: string) => featureFlagService.isEnabled('mason_enabled', userId);
export const isLogicWeaverEnabled = (userId?: string) => featureFlagService.isEnabled('logic_weaver_enabled', userId);

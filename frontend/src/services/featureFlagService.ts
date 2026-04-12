// Feature Flag Service
// Provides gradual rollout and A/B testing capabilities

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

const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
    'new_ielts_interface': {
        id: 'new_ielts_interface',
        name: 'new_ielts_interface',
        description: 'New IELTS Writing interface',
        enabled: true,
        rollout_percent: 100,
        allowed_users: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    'ai_explanations': {
        id: 'ai_explanations',
        name: 'ai_explanations',
        description: 'AI-powered explanations',
        enabled: true,
        rollout_percent: 100,
        allowed_users: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    'peer_review_v2': {
        id: 'peer_review_v2',
        name: 'peer_review_v2',
        description: 'New peer review system',
        enabled: true,
        rollout_percent: 100,
        allowed_users: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    'writing_gym_v3': {
        id: 'writing_gym_v3',
        name: 'writing_gym_v3',
        description: 'New Writing Gym features',
        enabled: true,
        rollout_percent: 100,
        allowed_users: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    'social_features': {
        id: 'social_features',
        name: 'social_features',
        description: 'Social and leaderboard features',
        enabled: true,
        rollout_percent: 100,
        allowed_users: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
};

class FeatureFlagService {
    private cache: Map<string, FeatureFlag> = new Map();
    private cacheExpiry: Map<string, number> = new Map();
    private cacheTTL = 5 * 60 * 1000;

    async isEnabled(flagName: string, userId?: string): Promise<boolean> {
        try {
            const flag = await this.getFlag(flagName);

            if (!flag) {
                console.warn(`[FeatureFlags] Flag not found: ${flagName}, defaulting to false`);
                return false;
            }

            if (!flag.enabled) {
                return false;
            }

            if (userId && flag.allowed_users?.includes(userId)) {
                return true;
            }

            if (flag.rollout_percent >= 100) {
                return true;
            }

            if (flag.rollout_percent <= 0) {
                return false;
            }

            if (userId) {
                return this.isUserInRollout(userId, flagName, flag.rollout_percent);
            }

            return Math.random() * 100 < flag.rollout_percent;
        } catch (error) {
            console.error(`[FeatureFlags] Error checking flag ${flagName}:`, error);
            return false;
        }
    }

    private async getFlag(flagName: string): Promise<FeatureFlag | null> {
        const cached = this.cache.get(flagName);
        const expiry = this.cacheExpiry.get(flagName);

        if (cached && expiry && Date.now() < expiry) {
            return cached;
        }

        const stored = localStorage.getItem(`feature_flag_${flagName}`);
        if (stored) {
            try {
                const flag = JSON.parse(stored);
                this.cache.set(flagName, flag);
                this.cacheExpiry.set(flagName, Date.now() + this.cacheTTL);
                return flag;
            } catch {
                // Fall through to default
            }
        }

        const defaultFlag = DEFAULT_FLAGS[flagName];
        if (defaultFlag) {
            this.cache.set(flagName, defaultFlag);
            this.cacheExpiry.set(flagName, Date.now() + this.cacheTTL);
            return defaultFlag;
        }

        return null;
    }

    private isUserInRollout(userId: string, flagName: string, percent: number): boolean {
        let hash = 0;
        const str = `${userId}:${flagName}`;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        const bucket = Math.abs(hash % 100);
        return bucket < percent;
    }

    async getAllFlags(): Promise<FeatureFlag[]> {
        return Object.values(DEFAULT_FLAGS);
    }

    async setFlag(flagName: string, enabled: boolean): Promise<void> {
        const flag = await this.getFlag(flagName);
        if (flag) {
            const updated = { ...flag, enabled, updated_at: new Date().toISOString() };
            localStorage.setItem(`feature_flag_${flagName}`, JSON.stringify(updated));
            this.cache.set(flagName, updated);
            this.cacheExpiry.set(flagName, Date.now() + this.cacheTTL);
        }
    }

    clearCache(): void {
        this.cache.clear();
        this.cacheExpiry.clear();
    }
}

export const featureFlagService = new FeatureFlagService();

export const isIELTSParagraphEnabled = async (userId?: string): Promise<boolean> => {
    return featureFlagService.isEnabled('new_ielts_interface', userId);
};

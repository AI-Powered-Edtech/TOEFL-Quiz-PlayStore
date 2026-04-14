import api from './apiClient';

export type SubscriptionTier = 'free' | 'basic' | 'c2';

export interface TokenUsage {
  tokens_used: number;
  tokens_limit: number;
  remaining: number;
  percentage: number;
}

export type GatedFeature =
  | 'ai_chat'
  | 'essay_evaluation'
  | 'peer_review'
  | 'cefr_simulation'
  | 'pdf_upload'
  | 'unlimited_quizzes'
  | 'essay_dojo'
  | 'writing_gym_advanced'
  | 'cefr_test'
  | 'full_simulation'
  | 'listening_audio'
  | 'ai_generation'
  | 'skill_module_read';

export interface FeatureAccess {
  allowed: boolean;
  reason?: string;
  upgradeTo?: SubscriptionTier;
}

const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: 15,
  basic: 500,
  c2: 5000,
};

let cachedTier: SubscriptionTier = 'free';
let cachedUsage: TokenUsage | null = null;

export const getUserTier = async (): Promise<SubscriptionTier> => {
    return 'c2';
};

export const getTokenUsage = async (): Promise<TokenUsage> => {
    return {
        tokens_used: 0,
        tokens_limit: 5000,
        remaining: 5000,
        percentage: 0
    };
};

export const canAccessFeature = async (feature: GatedFeature): Promise<FeatureAccess> => {
  const tier = await getUserTier();

  const featureTiers: Record<GatedFeature, SubscriptionTier> = {
    ai_chat: 'free',
    essay_evaluation: 'free',
    peer_review: 'free',
    cefr_simulation: 'basic',
    pdf_upload: 'basic',
    unlimited_quizzes: 'c2',
    essay_dojo: 'basic',
    writing_gym_advanced: 'basic',
    cefr_test: 'basic',
    full_simulation: 'basic',
    listening_audio: 'free',
    ai_generation: 'basic',
    skill_module_read: 'free',
  };

  const requiredTier = featureTiers[feature];
  const tierOrder: SubscriptionTier[] = ['free', 'basic', 'c2'];

  if (tierOrder.indexOf(tier) >= tierOrder.indexOf(requiredTier)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `This feature requires ${requiredTier} plan`,
    upgradeTo: requiredTier,
  };
};

export const consumeToken = async (feature?: string, _options?: { strict: boolean }): Promise<{ allowed: boolean; usage: TokenUsage }> => {
  const usage = await getTokenUsage();
  const tier = await getUserTier();
  const limit = TIER_LIMITS[tier];

  if (usage.tokens_used >= limit) {
    return { allowed: false, usage };
  }

  return { allowed: true, usage };
};

export const recordFeatureUsage = async (feature: string): Promise<void> => {
  try {
    await consumeToken(feature);
  } catch (err) {
    console.warn('[subscriptionService] recordFeatureUsage error:', err);
  }
};

export const clearTierCache = () => {
  cachedTier = 'free';
  cachedUsage = null;
};

export const getTierDisplayName = (tier: SubscriptionTier): string => {
  const names: Record<SubscriptionTier, string> = {
    free: 'Free',
    basic: 'Basic',
    c2: 'C2 Pro',
  };
  return names[tier];
};

export const getTierColor = (tier: SubscriptionTier): string => {
  const colors: Record<SubscriptionTier, string> = {
    free: 'gray',
    basic: 'blue',
    c2: 'purple',
  };
  return colors[tier];
};

export const getTierIcon = (tier: SubscriptionTier): string => {
  const icons: Record<SubscriptionTier, string> = {
    free: 'Star',
    basic: 'Zap',
    c2: 'Crown',
  };
  return icons[tier];
};

export const getTierPrice = (tier: SubscriptionTier): string => {
  const prices: Record<SubscriptionTier, string> = {
    free: 'Rp 0',
    basic: 'Rp 16.500/bulan',
    c2: 'Rp 165.000/bulan',
  };
  return prices[tier];
};

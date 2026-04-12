/**
 * Subscription Service
 * 
 * Centralized logic for subscription tier checks, AI token management,
 * and feature usage tracking.
 * 
 * Tiers:
 * - free:  15 AI tokens/day, 1 CEFR test/month, no Full Sim, Mason-only Writing Gym
 * - basic: 500 AI tokens/day, 1 CEFR/week, 1 Full Sim/week, all features
 * - c2:    5000 AI tokens/day (unlimited fair use), unlimited CEFR/Sim (1/day)
 */

import { supabase } from './supabase';
import { hasUserRole } from './adminService';
import { notificationService } from './notificationService';

// ============================================
// Types
// ============================================

export type SubscriptionTier = 'free' | 'basic' | 'c2';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'grace_period';

export interface Subscription {
    id: string;
    user_id: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    provider: 'google_play' | 'manual' | 'promo' | null;
    provider_subscription_id: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    created_at: string;
    updated_at: string;
}

export interface TokenUsage {
    tokens_used: number;
    tokens_limit: number;
    remaining: number;
    percentage: number;
}

export type GatedFeature =
    | 'full_simulation'
    | 'cefr_test'
    | 'listening_audio'
    | 'writing_gym_advanced'   // Logic Weaver, Complexity Ladder, etc.
    | 'essay_dojo'
    | 'ai_generation'
    | 'skill_module_read'
    | 'ai_chat';

export interface FeatureAccess {
    allowed: boolean;
    reason?: string;
    upgradeRequired?: SubscriptionTier;
    usageInfo?: string;
}

// ============================================
// Constants
// ============================================

const TOKEN_LIMITS: Record<SubscriptionTier, number> = {
    free: 15,
    basic: 500,
    c2: 5000,
};

const CEFR_LIMITS: Record<SubscriptionTier, { count: number; period: 'month' | 'week' | 'day' }> = {
    free: { count: 1, period: 'month' },
    basic: { count: 1, period: 'week' },
    c2: { count: 1, period: 'day' },
};

const SIM_LIMITS: Record<SubscriptionTier, { count: number; period: 'week' | 'day' } | null> = {
    free: null, // locked entirely
    basic: { count: 1, period: 'week' },
    c2: { count: 1, period: 'day' },
};

const SKILL_MODULE_LIMITS: Record<SubscriptionTier, { count: number; period: 'day' } | null> = {
    free: { count: 3, period: 'day' }, // 3 modules per day for free
    basic: null, // unlimited
    c2: null, // unlimited
};

// ============================================
// Cache
// ============================================

let cachedTier: SubscriptionTier | null = null;
let cachedTierExpiry = 0;
const CACHE_TTL = 60_000; // 1 minute

// ============================================
// Core Functions
// ============================================

/**
 * Get the current user's subscription tier.
 * Uses cache to avoid repeated DB calls.
 */
export async function getUserTier(userId?: string): Promise<SubscriptionTier> {
    if (cachedTier && Date.now() < cachedTierExpiry) {
        return cachedTier;
    }

    try {
        let uid = userId;
        if (!uid) {
            const { data: { user } } = await supabase.auth.getUser();
            uid = user?.id;
        }

        if (!uid) return 'free';

        // Admins automatically get 'c2' tier privileges
        try {
            const isAdmin = await hasUserRole(uid, 'admin');
            if (isAdmin) {
                cachedTier = 'c2';
                cachedTierExpiry = Date.now() + CACHE_TTL;
                return 'c2';
            }
        } catch {
            // ignore error and continue checking profile
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', uid)
            .maybeSingle();

        if (error || !data) {
            console.warn('[Subscription] Failed to fetch tier:', error?.message);
            return 'free';
        }

        const tier = (data.subscription_tier as SubscriptionTier) || 'free';
        cachedTier = tier;
        cachedTierExpiry = Date.now() + CACHE_TTL;
        return tier;
    } catch (err) {
        console.error('[Subscription] Error getting tier:', err);
        return 'free';
    }
}

/**
 * Get the full subscription record for a user.
 */
export async function getSubscription(userId?: string): Promise<Subscription | null> {
    try {
        let uid = userId;
        if (!uid) {
            const { data: { user } } = await supabase.auth.getUser();
            uid = user?.id;
        }
        if (!uid) return null;

        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', uid)
            .maybeSingle();

        if (error) {
            console.error('[Subscription] Error:', error.message);
            return null;
        }
        return data;
    } catch (err) {
        console.error('[Subscription] Error getting subscription:', err);
        return null;
    }
}

/**
 * Clear the tier cache (call after subscription changes).
 */
export function clearTierCache(): void {
    cachedTier = null;
    cachedTierExpiry = 0;
}

// ============================================
// AI Token Management
// ============================================

/**
 * Get today's token usage for the current user.
 */
export async function getTokenUsage(userId?: string): Promise<TokenUsage> {
    try {
        let uid = userId;
        if (!uid) {
            const { data: { user } } = await supabase.auth.getUser();
            uid = user?.id;
        }
        if (!uid) return { tokens_used: 0, tokens_limit: 15, remaining: 15, percentage: 0 };

        const tier = await getUserTier(uid);
        const limit = TOKEN_LIMITS[tier];
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const { data, error } = await supabase
            .from('ai_token_usage')
            .select('tokens_used')
            .eq('user_id', uid)
            .eq('date', today)
            .maybeSingle();

        if (error) {
            console.warn('[Subscription] Token usage fetch error:', error.message);
        }

        const used = data?.tokens_used || 0;
        return {
            tokens_used: used,
            tokens_limit: limit,
            remaining: Math.max(0, limit - used),
            percentage: Math.min(100, Math.round((used / limit) * 100)),
        };
    } catch (err) {
        console.error('[Subscription] Error getting token usage:', err);
        return { tokens_used: 0, tokens_limit: 15, remaining: 15, percentage: 0 };
    }
}

/**
 * Consume an AI token. Returns true if allowed, false if limit reached.
 */
export async function consumeToken(
    feature?: string,
    options?: { strict?: boolean }
): Promise<{ allowed: boolean; usage: TokenUsage }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { allowed: false, usage: { tokens_used: 0, tokens_limit: 0, remaining: 0, percentage: 100 } };

        const tier = await getUserTier(user.id);
        const limit = TOKEN_LIMITS[tier];
        const today = new Date().toISOString().split('T')[0];

        // Upsert: increment tokens_used or create new row
        const { data: existing } = await supabase
            .from('ai_token_usage')
            .select('id, tokens_used')
            .eq('user_id', user.id)
            .eq('date', today)
            .maybeSingle();

        let newUsed: number;

        if (existing) {
            if (existing.tokens_used >= limit) {
                return {
                    allowed: false,
                    usage: {
                        tokens_used: existing.tokens_used,
                        tokens_limit: limit,
                        remaining: 0,
                        percentage: 100,
                    },
                };
            }
            newUsed = existing.tokens_used + 1;
            await supabase
                .from('ai_token_usage')
                .update({ tokens_used: newUsed, updated_at: new Date().toISOString(), feature: feature || null })
                .eq('id', existing.id);
        } else {
            newUsed = 1;
            await supabase
                .from('ai_token_usage')
                .insert({
                    user_id: user.id,
                    date: today,
                    tokens_used: 1,
                    tokens_limit: limit,
                    feature: feature || null,
                });
        }

        // Trigger warning notification safely in the background exactly when crossing 80%
        const warningThreshold = Math.floor(limit * 0.8);
        if (newUsed === warningThreshold && limit > 0) {
            notificationService.createNotification({
                user_id: user.id,
                type: 'ai_quota_warning',
                title: 'AI Quota Running Low',
                message: `You have used ${newUsed} out of ${limit} daily tokens. Upgrade for more!`,
                data: { url: '/settings/subscription' }
            }).catch(err => console.error('[Subscription] Failed to trigger quota warning notification:', err));
        }

        return {
            allowed: true,
            usage: {
                tokens_used: newUsed,
                tokens_limit: limit,
                remaining: Math.max(0, limit - newUsed),
                percentage: Math.min(100, Math.round((newUsed / limit) * 100)),
            },
        };
    } catch (err) {
        console.error('[Subscription] Error consuming token:', err);
        // In strict mode, fail closed for expensive AI operations
        if (options?.strict) {
            const fallbackLimit = TOKEN_LIMITS.free;
            return {
                allowed: false,
                usage: {
                    tokens_used: fallbackLimit,
                    tokens_limit: fallbackLimit,
                    remaining: 0,
                    percentage: 100,
                },
            };
        }
        // Default behaviour: fail open but log the error
        return { allowed: true, usage: { tokens_used: 0, tokens_limit: TOKEN_LIMITS.free, remaining: TOKEN_LIMITS.free, percentage: 0 } };
    }
}

// ============================================
// Feature Usage Tracking (CEFR / Full Sim)
// ============================================

/**
 * Check how many times a feature has been used in the current period.
 */
async function getFeatureUsageCount(
    userId: string,
    feature: 'cefr_test' | 'full_simulation' | 'skill_module_read',
    period: 'month' | 'week' | 'day'
): Promise<number> {
    const now = new Date();
    let periodStart: Date;

    switch (period) {
        case 'day':
            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week': {
            const dayOfWeek = now.getDay();
            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
            break;
        }
        case 'month':
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
    }

    const { count, error } = await supabase
        .from('feature_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('feature', feature)
        .gte('used_at', periodStart.toISOString());

    if (error) {
        console.error('[Subscription] Feature usage count error:', error.message);
        return 0;
    }

    return count || 0;
}

/**
 * Record a feature usage event.
 */
export async function recordFeatureUsage(feature: 'cefr_test' | 'full_simulation' | 'skill_module_read'): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const tier = await getUserTier(user.id);
        const periodType = feature === 'cefr_test'
            ? CEFR_LIMITS[tier].period
            : feature === 'skill_module_read'
                ? 'day'
                : (SIM_LIMITS[tier]?.period || 'week');

        await supabase.from('feature_usage').insert({
            user_id: user.id,
            feature,
            period_type: periodType,
        });
    } catch (err) {
        console.error('[Subscription] Error recording feature usage:', err);
    }
}

// ============================================
// Feature Access Checks
// ============================================

/**
 * Central feature access gate.
 * Returns whether a feature is accessible for the current user.
 */
export async function canAccessFeature(feature: GatedFeature): Promise<FeatureAccess> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { allowed: false, reason: 'Login diperlukan' };

        const tier = await getUserTier(user.id);

        switch (feature) {
            case 'full_simulation': {
                if (tier === 'free') {
                    return {
                        allowed: false,
                        reason: 'Full Simulation hanya tersedia untuk paket Basic atau C2',
                        upgradeRequired: 'basic',
                    };
                }
                const limit = SIM_LIMITS[tier]!;
                const usageCount = await getFeatureUsageCount(user.id, 'full_simulation', limit.period);
                if (usageCount >= limit.count) {
                    return {
                        allowed: false,
                        reason: tier === 'basic'
                            ? 'Kamu sudah menggunakan 1x Full Simulation minggu ini'
                            : 'Kamu sudah menggunakan Full Simulation hari ini',
                        usageInfo: `${usageCount}/${limit.count} ${limit.period === 'week' ? 'minggu' : 'hari'} ini`,
                    };
                }
                return { allowed: true };
            }

            case 'cefr_test': {
                const cefrLimit = CEFR_LIMITS[tier];
                const usageCount = await getFeatureUsageCount(user.id, 'cefr_test', cefrLimit.period);
                if (usageCount >= cefrLimit.count) {
                    const periodLabel = cefrLimit.period === 'month' ? 'bulan' : cefrLimit.period === 'week' ? 'minggu' : 'hari';
                    return {
                        allowed: false,
                        reason: `Kamu sudah menggunakan ${cefrLimit.count}x CEFR Test ${periodLabel} ini`,
                        upgradeRequired: tier === 'free' ? 'basic' : tier === 'basic' ? 'c2' : undefined,
                        usageInfo: `${usageCount}/${cefrLimit.count} ${periodLabel} ini`,
                    };
                }
                return { allowed: true };
            }

            case 'listening_audio': {
                if (tier === 'free') {
                    return {
                        allowed: false,
                        reason: 'Fitur audio/listening hanya tersedia untuk paket Basic atau C2',
                        upgradeRequired: 'basic',
                    };
                }
                return { allowed: true };
            }

            case 'writing_gym_advanced': {
                if (tier === 'free') {
                    return {
                        allowed: false,
                        reason: 'Fitur Writing Gym lanjutan terkunci. Selesaikan The Mason terlebih dahulu atau upgrade ke Basic',
                        upgradeRequired: 'basic',
                    };
                }
                return { allowed: true };
            }

            case 'essay_dojo': {
                // Essay Dojo available for all, but consumes tokens
                return { allowed: true };
            }

            case 'ai_generation': {
                const usage = await getTokenUsage(user.id);
                if (usage.remaining <= 0) {
                    return {
                        allowed: false,
                        reason: `Token AI harian habis (${usage.tokens_used}/${usage.tokens_limit})`,
                        upgradeRequired: tier === 'free' ? 'basic' : tier === 'basic' ? 'c2' : undefined,
                        usageInfo: `${usage.tokens_used}/${usage.tokens_limit} token hari ini`,
                    };
                }
                return { allowed: true };
            }

            case 'skill_module_read': {
                if (tier !== 'free') return { allowed: true }; // Unlimited for Basic/C2

                const limit = SKILL_MODULE_LIMITS.free!;
                const usageCount = await getFeatureUsageCount(user.id, 'skill_module_read', 'day');

                if (usageCount >= limit.count) {
                    return {
                        allowed: false,
                        reason: 'Batas harian membaca modul telah tercapai. Upgrade untuk akses tanpa batas.',
                        upgradeRequired: 'basic',
                        usageInfo: `${usageCount}/${limit.count} hari ini`,
                    };
                }
                return { allowed: true };
            }

            case 'ai_chat': {
                if (tier === 'free') {
                    return {
                        allowed: false,
                        reason: 'Fitur AI Chat ("Ask AI") hanya tersedia untuk paket Basic atau C2',
                        upgradeRequired: 'basic',
                    };
                }

                // AI Chat consumes normal tokens for Basic and uses tokens as anti-spam for C2
                const limit = TOKEN_LIMITS[tier];
                // we won't strictly block here, it'll be gated on consumeToken, but we block if totally out
                const usage = await getTokenUsage(user.id);
                if (usage.remaining <= 0) {
                    return {
                        allowed: false,
                        reason: `Token AI harian habis (${usage.tokens_used}/${limit})`,
                        usageInfo: `${usage.tokens_used}/${limit} token`,
                    };
                }
                return { allowed: true };
            }

            default:
                return { allowed: true };
        }
    } catch (err) {
        console.error('[Subscription] Access check error:', err);
        // Fail open for better UX
        return { allowed: true };
    }
}

// ============================================
// Tier Display Helpers
// ============================================

export function getTierDisplayName(tier: SubscriptionTier): string {
    switch (tier) {
        case 'free': return 'Free';
        case 'basic': return 'Basic';
        case 'c2': return 'C2 Pro';
    }
}

export function getTierColor(tier: SubscriptionTier): string {
    switch (tier) {
        case 'free': return '#6B7280';
        case 'basic': return '#3B82F6';
        case 'c2': return '#F59E0B';
    }
}

export function getTierIcon(tier: SubscriptionTier): string {
    switch (tier) {
        case 'free': return '🆓';
        case 'basic': return '💎';
        case 'c2': return '👑';
    }
}

export function getTierPrice(tier: SubscriptionTier): string {
    switch (tier) {
        case 'free': return 'Gratis';
        case 'basic': return 'Rp 16.500/bulan';
        case 'c2': return 'Rp 165.000/bulan';
    }
}

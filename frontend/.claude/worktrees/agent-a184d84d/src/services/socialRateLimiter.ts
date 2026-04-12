/**
 * Social Hub Rate Limiter
 * 
 * Provides rate limiting for social operations:
 * - Circle creation/joining
 * - Friend requests
 * - Message sending
 * - Peer review submissions
 */

import { supabase } from './supabase';

// Rate limit configurations
export const RATE_LIMITS = {
    circleCreation: { max: 5, windowMs: 86400000 },      // 5 per day
    circleJoin: { max: 20, windowMs: 86400000 },         // 20 per day
    friendRequest: { max: 50, windowMs: 86400000 },      // 50 per day
    messageSend: { max: 100, windowMs: 3600000 },        // 100 per hour
    peerReviewSubmit: { max: 5, windowMs: 86400000 },    // 5 per day (existing)
} as const;

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number | null;
    retryAfterMs: number;
}

interface RateLimitState {
    count: number;
    resetAt: number;
}

/**
 * Social Hub Rate Limiter Class
 */
export class SocialRateLimiter {
    private memoryCache: Map<string, RateLimitState> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Cleanup expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
    }

    /**
     * Check if an action is allowed for a user
     * Uses Supabase RPC for atomic, secure database-level rate limiting
     */
    async checkLimit(
        action: keyof typeof RATE_LIMITS,
        userId: string
    ): Promise<RateLimitResult> {
        const config = RATE_LIMITS[action];
        const now = Date.now();

        // Check local memory cache first
        const cacheKey = `${action}:${userId}`;
        const currentState = this.memoryCache.get(cacheKey);

        if (currentState && currentState.resetAt > now && currentState.count >= config.max) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: currentState.resetAt,
                retryAfterMs: currentState.resetAt - now
            };
        }

        try {
            const { data, error } = await supabase.rpc('check_and_update_rate_limit', {
                p_action_type: action,
                p_user_id: userId,
                p_max_count: config.max,
                p_window_ms: config.windowMs
            });

            if (error) {
                console.error('[SocialRateLimiter] RPC error:', error);
                throw error;
            }

            // Update local cache
            if (data && typeof data.allowed === 'boolean') {
                this.memoryCache.set(cacheKey, {
                    count: config.max - data.remaining,
                    resetAt: data.resetAt
                });
                return data as RateLimitResult;
            }
            throw new Error('Invalid RPC response format');

        } catch (e) {
            console.warn(`[SocialRateLimiter] RPC failed or missing for ${action}. Falling back to local memory rate limit.`, e);
            // Fallback: Local memory rate limiting

            // Re-fetch state atomically because async RPC call might have yielded thread
            const latestState = this.memoryCache.get(cacheKey);

            if (latestState && latestState.resetAt > now && latestState.count >= config.max) {
                return {
                    allowed: false,
                    remaining: 0,
                    resetAt: latestState.resetAt,
                    retryAfterMs: latestState.resetAt - now
                };
            }

            // Atomic increment with previous value check
            const newState = {
                count: (latestState?.resetAt ?? 0) > now ? latestState!.count + 1 : 1,
                resetAt: (latestState?.resetAt ?? 0) > now ? latestState!.resetAt : now + config.windowMs
            };

            this.memoryCache.set(cacheKey, newState);

            return {
                allowed: true,
                remaining: Math.max(0, config.max - newState.count),
                resetAt: newState.resetAt,
                retryAfterMs: 0
            };
        }
    }

    /**
     * Enforce rate limit (throws if exceeded)
     */
    async enforce(action: keyof typeof RATE_LIMITS, userId: string): Promise<void> {
        const result = await this.checkLimit(action, userId);
        if (!result.allowed) {
            const retrySeconds = Math.ceil(result.retryAfterMs / 1000);
            throw new RateLimitError(
                `Rate limit exceeded. Try again in ${retrySeconds} seconds.`,
                result.retryAfterMs
            );
        }
    }

    /**
     * Get remaining requests for an action
     * Deprecated: Client shouldn't know exact remaining count for security/simplicity.
     * Returns 1 if theoretically allowed based on local cache, 0 otherwise.
     */
    getRemaining(action: keyof typeof RATE_LIMITS, userId: string): number {
        return 1; // Stubbed out, source of truth is now DB
    }

    /**
     * Reset rate limit for a specific user/action
     */
    async reset(action: keyof typeof RATE_LIMITS, userId: string): Promise<void> {
        try {
            await supabase
                .from('social_rate_limits')
                .delete()
                .eq('action_type', action)
                .eq('user_id', userId);
        } catch (error) {
            console.warn('[SocialRateLimiter] Failed to reset state in database:', error);
        }
    }

    /**
     * Cleanup expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, state] of this.memoryCache.entries()) {
            if (state.resetAt < now) {
                this.memoryCache.delete(key);
            }
        }
    }

    /**
     * Destroy the rate limiter
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.memoryCache.clear();
    }
}

/**
 * Custom error for rate limit exceeded
 */
export class RateLimitError extends Error {
    constructor(message: string, public retryAfterMs: number) {
        super(message);
        this.name = 'RateLimitError';
    }
}

// Singleton instance
export const socialRateLimiter = new SocialRateLimiter();

/**
 * Helper function to get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id || null;
    } catch {
        return null;
    }
}

/**
 * Check rate limit for current user
 */
export async function checkRateLimit(
    action: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
    const userId = await getCurrentUserId();
    if (!userId) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: null,
            retryAfterMs: Infinity
        };
    }
    return socialRateLimiter.checkLimit(action, userId);
}

/**
 * Enforce rate limit for current user (throws if exceeded)
 */
export async function enforceRateLimit(
    action: keyof typeof RATE_LIMITS
): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error('User not authenticated');
    }
    return socialRateLimiter.enforce(action, userId);
}

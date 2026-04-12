/**
 * Rate Limiter Implementation
 * 
 * Prevents API abuse by limiting requests per user per time window.
 * Uses sliding window algorithm via Supabase RPC for accurate, race-condition-free rate limiting.
 * State persists to Supabase for survival across restarts.
 * 
 * @example
 * const limiter = new RateLimiter(10, 3600000); // 10 requests per hour
 * 
 * const canProceed = await limiter.checkLimit(userId);
 * if (!canProceed) {
 *   throw new RateLimitError('Rate limit exceeded');
 * }
 */

import { supabase } from '../services/supabase';

export interface RateLimitInfo {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;  // Seconds until next request allowed
}

export class RateLimitError extends Error {
    constructor(
        message: string,
        public info: RateLimitInfo
    ) {
        super(message);
        this.name = 'RateLimitError';
    }
}

export class RateLimiter {
    private readonly maxRequests: number;
    private readonly windowMs: number;
    private readonly limiterName: string;

    constructor(
        maxRequests: number,
        windowMs: number,
        _enableCleanup: boolean = true, // Maintained for backwards compatibility, though cleanup is handled by DB sliding window now
        limiterName: string = 'default'
    ) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.limiterName = limiterName;
    }

    /**
     * Check if user has exceeded rate limit
     * Uses atomic DB RPC to prevent race conditions
     * @returns RateLimitInfo with allowed status and remaining requests
     */
    async checkLimit(userId: string): Promise<RateLimitInfo> {
        try {
            const { data, error } = await supabase.rpc('check_and_consume_rate_limit', {
                p_user_id: userId,
                p_limiter_name: this.limiterName,
                p_max_requests: this.maxRequests,
                p_window_ms: this.windowMs
            });

            if (error) {
                console.error(`[RateLimiter:${this.limiterName}] RPC error:`, error);
                throw error;
            }

            return data as RateLimitInfo;
        } catch (err) {
            console.error(`[RateLimiter:${this.limiterName}] Failed to check limit for ${userId}:`, err);
            // Fail open on DB error so we don't block users if metrics DB goes down
            return {
                allowed: true,
                limit: this.maxRequests,
                remaining: 1,
                resetTime: Date.now() + this.windowMs
            };
        }
    }

    /**
     * Enforce rate limit - throws error if limit exceeded
     */
    async enforce(userId: string): Promise<void> {
        const info = await this.checkLimit(userId);

        if (!info.allowed) {
            throw new RateLimitError(
                `Rate limit exceeded. Try again in ${info.retryAfter} seconds.`,
                info
            );
        }
    }

    // These methods are kept for backwards compatibility but rely on asynchronous DB fetches if truly needed
    // Otherwise they return optimistic values. True source of truth is the RPC call above.

    /**
     * Get remaining requests for user (optimistic fast return, call checkLimit for true state)
     */
    getRemainingRequests(_userId: string): number {
        // We cannot synchronously know this with DB-backed rate limiter without making a call
        return this.maxRequests;
    }

    /**
     * Get time until next request allowed (optimistic fast return)
     */
    getRetryAfter(_userId: string): number {
        return 0;
    }

    /**
     * Reset limit for specific user (admin action)
     */
    async resetUser(userId: string): Promise<void> {
        await supabase.from('rate_limit_state')
            .delete()
            .eq('limiter_name', this.limiterName)
            .eq('user_id', userId);
        console.log(`[RateLimiter] Reset limit for user: ${userId}`);
    }

    /**
     * Clear all limits
     */
    async clearAll(): Promise<void> {
        await supabase.from('rate_limit_state')
            .delete()
            .eq('limiter_name', this.limiterName);
        console.log('[RateLimiter] All limits cleared');
    }

    getStats() {
        return {
            totalUsers: 0,
            usersAtLimit: 0,
            totalRequests: 0,
            averageRequestsPerUser: 0,
        }
    }

    /**
     * Stop cleanup interval (No-op now)
     */
    destroy(): void {
        // No-op
    }
}

// Singleton instances for Logic Weaver and other features
export const logicWeaverRateLimiter = new RateLimiter(
    10,        // 10 requests
    3600000,   // per hour
    true,      // enable cleanup
    'logic_weaver'  // limiter name for persistence
);

export const advocateRateLimiter = new RateLimiter(
    10,        // 10 requests
    3600000,   // per hour
    true,      // enable cleanup
    'devils_advocate'  // limiter name for persistence
);

export const masonRateLimiter = new RateLimiter(
    20,        // 20 requests
    3600000,   // per hour (more lenient for Mason)
    true,      // enable cleanup
    'mason'    // limiter name for persistence
);

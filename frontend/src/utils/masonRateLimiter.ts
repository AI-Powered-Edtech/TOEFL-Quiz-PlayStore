// Rate Limiter Utility
// Protects against exceeding Groq API rate limits (60 req/min)

import { supabase } from '../services/supabase';
import type { RateLimitConfig, RateLimitEntry, RateLimitResult } from '../types/mason';

export class MasonRateLimiter {
    private store = new Map<string, RateLimitEntry>();
    private readonly config: RateLimitConfig;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(config: RateLimitConfig) {
        this.config = config;

        // Cleanup expired entries every minute
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    /**
     * Check if a request is allowed for a given user
     * @param userId - User identifier for rate limiting
     * @returns Object with allowed status and optional retry time
     */
    async check(userId: string): Promise<RateLimitResult> {
        const now = Date.now();
        const entry = this.store.get(userId);

        // No entry or window expired - allow and create new entry
        if (!entry || now > entry.resetAt) {
            this.store.set(userId, {
                count: 1,
                resetAt: now + this.config.windowMs
            });
            return { allowed: true };
        }

        // Rate limit exceeded
        if (entry.count >= this.config.maxRequests) {
            const retryAfter = entry.resetAt - now;
            console.warn(`[RateLimit] User ${userId} exceeded limit. Retry after ${retryAfter}ms`);
            return {
                allowed: false,
                retryAfter
            };
        }

        // Increment count and allow
        entry.count++;
        return { allowed: true };
    }

    /**
     * Cleanup expired entries from the store
     */
    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.store.entries()) {
            if (now > entry.resetAt) {
                try {
                    this.store.delete(key);
                } catch (e: unknown) {
                    // Error connecting to KV, fallback to local memory limit
                    console.warn('[RateLimiter] Redis connection failed, falling back to local memory limits', e);
                }
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[RateLimit] Cleaned ${cleaned} expired entries`);
        }
    }

    /**
     * Get current rate limit status for a user
     */
    getStatus(userId: string): { count: number; remaining: number; resetAt: number } | null {
        const entry = this.store.get(userId);
        if (!entry) return null;

        return {
            count: entry.count,
            remaining: Math.max(0, this.config.maxRequests - entry.count),
            resetAt: entry.resetAt
        };
    }

    /**
     * Reset rate limit for a specific user (for testing)
     */
    reset(userId: string): void {
        this.store.delete(userId);
    }

    /**
     * Cleanup interval on destroy
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.store.clear();
    }
}

// Export singleton instance
// Groq Free plan: 30 RPM for llama-3.1-8b-instant
// Use 25 for safety margin to avoid hitting 429s
export const groqRateLimiter = new MasonRateLimiter({
    maxRequests: 25,
    windowMs: 60000 // 1 minute
});

// Helper to get current user ID
export async function getCurrentUserId(): Promise<string> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.id || 'anonymous';
    } catch (e) {
        console.warn('[RateLimit] Failed to get user ID from session');
        return 'anonymous';
    }
}

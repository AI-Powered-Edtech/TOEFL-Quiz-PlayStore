/**
 * Social Hub Rate Limiter
 * Provides rate limiting for social operations
 */

export { RateLimitError } from '../utils/RateLimiter';

export const RATE_LIMITS = {
    circleCreation: { max: 5, windowMs: 86400000 },
    circleJoin: { max: 20, windowMs: 86400000 },
    friendRequest: { max: 50, windowMs: 86400000 },
    messageSend: { max: 100, windowMs: 3600000 },
    peerReviewSubmit: { max: 5, windowMs: 86400000 },
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

export class SocialRateLimiter {
    private memoryCache: Map<string, RateLimitState> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
    }

    async checkLimit(
        action: keyof typeof RATE_LIMITS,
        userId: string
    ): Promise<RateLimitResult> {
        const key = `${action}:${userId}`;
        const config = RATE_LIMITS[action];
        const now = Date.now();

        let state = this.memoryCache.get(key);

        if (!state || now >= state.resetAt) {
            state = {
                count: 0,
                resetAt: now + config.windowMs
            };
        }

        if (state.count >= config.max) {
            return {
                allowed: false,
                remaining: 0,
                resetAt: state.resetAt,
                retryAfterMs: state.resetAt - now
            };
        }

        state.count++;
        this.memoryCache.set(key, state);

        return {
            allowed: true,
            remaining: config.max - state.count,
            resetAt: state.resetAt,
            retryAfterMs: 0
        };
    }

    async enforce(
        action: keyof typeof RATE_LIMITS,
        userId: string
    ): Promise<void> {
        const result = await this.checkLimit(action, userId);
        if (!result.allowed) {
            const minutes = Math.ceil(result.retryAfterMs / 60000);
            throw new Error(`Rate limit exceeded. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        }
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, state] of this.memoryCache.entries()) {
            if (now >= state.resetAt) {
                this.memoryCache.delete(key);
            }
        }
    }

    resetUser(userId: string): void {
        for (const key of this.memoryCache.keys()) {
            if (key.endsWith(`:${userId}`)) {
                this.memoryCache.delete(key);
            }
        }
    }

    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

export const socialRateLimiter = new SocialRateLimiter();

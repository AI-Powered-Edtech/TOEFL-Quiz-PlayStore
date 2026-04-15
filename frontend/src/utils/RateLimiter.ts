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
    private store = new Map<string, { count: number; resetTime: number }>();

    constructor(
        maxRequests: number,
        windowMs: number,
        _enableCleanup: boolean = true,
        limiterName: string = 'default'
    ) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.limiterName = limiterName;
    }

    async checkLimit(userId: string): Promise<RateLimitInfo> {
        const now = Date.now();
        const key = `${this.limiterName}:${userId}`;
        const entry = this.store.get(key);

        if (!entry || now >= entry.resetTime) {
            const resetTime = now + this.windowMs;
            this.store.set(key, { count: 1, resetTime });
            return {
                allowed: true,
                limit: this.maxRequests,
                remaining: this.maxRequests - 1,
                resetTime
            };
        }

        if (entry.count >= this.maxRequests) {
            const retryAfterMs = Math.max(0, entry.resetTime - now);
            return {
                allowed: false,
                limit: this.maxRequests,
                remaining: 0,
                resetTime: entry.resetTime,
                retryAfter: Math.ceil(retryAfterMs / 1000),
            };
        }

        entry.count += 1;
        this.store.set(key, entry);

        return {
            allowed: true,
            limit: this.maxRequests,
            remaining: Math.max(0, this.maxRequests - entry.count),
            resetTime: entry.resetTime
        };
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

    getRemainingRequests(userId: string): number {
        const now = Date.now();
        const key = `${this.limiterName}:${userId}`;
        const entry = this.store.get(key);
        if (!entry || now >= entry.resetTime) return this.maxRequests;
        return Math.max(0, this.maxRequests - entry.count);
    }

    getRetryAfter(userId: string): number {
        const now = Date.now();
        const key = `${this.limiterName}:${userId}`;
        const entry = this.store.get(key);
        if (!entry || now >= entry.resetTime) return 0;
        return Math.max(0, Math.ceil((entry.resetTime - now) / 1000));
    }

    /**
     * Reset limit for specific user (admin action)
     */
    async resetUser(userId: string): Promise<void> {
        this.store.delete(`${this.limiterName}:${userId}`);
    }

    /**
     * Clear all limits
     */
    async clearAll(): Promise<void> {
        const prefix = `${this.limiterName}:`;
        for (const k of this.store.keys()) {
            if (k.startsWith(prefix)) this.store.delete(k);
        }
    }

    getStats() {
        const prefix = `${this.limiterName}:`;
        const now = Date.now();
        let totalUsers = 0;
        let usersAtLimit = 0;
        let totalRequests = 0;

        for (const [k, v] of this.store.entries()) {
            if (!k.startsWith(prefix)) continue;
            if (now >= v.resetTime) continue;
            totalUsers += 1;
            totalRequests += v.count;
            if (v.count >= this.maxRequests) usersAtLimit += 1;
        }

        return {
            totalUsers,
            usersAtLimit,
            totalRequests,
            averageRequestsPerUser: totalUsers > 0 ? totalRequests / totalUsers : 0,
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

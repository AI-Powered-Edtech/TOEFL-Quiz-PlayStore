interface RateLimitEntry {
    count: number;
    resetAt: number;
}

class RateLimiter {
    private limits: Map<string, RateLimitEntry> = new Map();
    private maxRequests: number;
    private windowMs: number;

    constructor(maxRequests: number = 10, windowMs: number = 3600000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
        const now = Date.now();
        const entry = this.limits.get(key);

        if (!entry || now > entry.resetAt) {
            // New window
            this.limits.set(key, { count: 1, resetAt: now + this.windowMs });
            return { allowed: true, remaining: this.maxRequests - 1, resetAt: now + this.windowMs };
        }

        if (entry.count >= this.maxRequests) {
            // Rate limit exceeded
            return { allowed: false, remaining: 0, resetAt: entry.resetAt };
        }

        // Increment count
        entry.count++;
        this.limits.set(key, entry);
        return { allowed: true, remaining: this.maxRequests - entry.count, resetAt: entry.resetAt };
    }

    reset(key: string): void {
        this.limits.delete(key);
    }
}

// 10 requests per hour for Devil's Advocate
export const advocateRateLimiter = new RateLimiter(10, 3600000);

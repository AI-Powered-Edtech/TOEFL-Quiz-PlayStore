interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class AICache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private storageKey: string;
    private ttl: number;

    constructor(storageKey: string, ttlMs: number = 86400000) {
        this.storageKey = storageKey;
        this.ttl = ttlMs;
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const entries = JSON.parse(stored);
                Object.entries(entries).forEach(([key, value]) => {
                    this.cache.set(key, value as CacheEntry<T>);
                });
                this.cleanup();
            }
        } catch (error) {
            console.warn(`Failed to load cache from storage (${this.storageKey}):`, error);
        }
    }

    private saveToStorage(): void {
        try {
            const entries = Object.fromEntries(this.cache.entries());
            localStorage.setItem(this.storageKey, JSON.stringify(entries));
        } catch (error) {
            console.warn(`Failed to save cache to storage (${this.storageKey}):`, error);
        }
    }

    private cleanup(): void {
        const now = Date.now();
        let cleaned = false;

        this.cache.forEach((entry, key) => {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned = true;
            }
        });

        if (cleaned) {
            this.saveToStorage();
        }
    }

    private hashKey(input: string): string {
        // Simple hash function for cache key
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    get(key: string): T | null {
        const cacheKey = this.hashKey(key);
        const entry = this.cache.get(cacheKey);

        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(cacheKey);
            this.saveToStorage();
            return null;
        }

        return entry.data;
    }

    set(key: string, data: T): void {
        const cacheKey = this.hashKey(key);
        this.cache.set(cacheKey, {
            data,
            expiresAt: Date.now() + this.ttl,
        });
        this.saveToStorage();
    }

    clear(): void {
        this.cache.clear();
        localStorage.removeItem(this.storageKey);
    }

    size(): number {
        this.cleanup(); // Clean up expired entries first
        return this.cache.size;
    }
}

import { AdvocateChallenge, AdvocateDefenseResult } from '../types';

// Export cache instances for Devil's Advocate
// 24 hour TTL for both challenges and evaluations
export const challengeCache = new AICache<AdvocateChallenge>('devils-advocate-challenges', 86400000);
export const evaluationCache = new AICache<AdvocateDefenseResult>('devils-advocate-evaluations', 86400000);

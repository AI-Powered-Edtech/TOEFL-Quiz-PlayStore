/**
 * Cache Service - Browser-compatible caching using Memory and LocalStorage
 * Replaces server-side Redis implementation for client-side usage
 */
import { cacheLogger } from '../utils/monitoring';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class CacheService {
    private memoryCache = new Map<string, CacheEntry<any>>();
    private storageKeyPrefix = 'streamquiz_cache_';

    constructor() {
        // Optional: Load from localStorage on init? 
        // For now, we start verify-fresh, but we could implement persistence.
        this.cleanup();
    }

    /**
     * Get cached value by key
     * Checks memory cache first, then localStorage
     */
    async get<T>(key: string): Promise<T | null> {
        // Layer 1: Memory cache (fastest)
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry) {
            if (Date.now() < memoryEntry.timestamp + memoryEntry.ttl) {
                cacheLogger.metric('Cache hit (memory)', { key });
                return memoryEntry.data;
            } else {
                this.memoryCache.delete(key);
            }
        }

        // Layer 2: LocalStorage
        try {
            const storedItem = localStorage.getItem(this.storageKeyPrefix + key);
            if (storedItem) {
                const entry: CacheEntry<T> = JSON.parse(storedItem);
                if (Date.now() < entry.timestamp + entry.ttl) {
                    cacheLogger.metric('Cache hit (storage)', { key });
                    // Warm up memory
                    this.memoryCache.set(key, entry);
                    return entry.data;
                } else {
                    localStorage.removeItem(this.storageKeyPrefix + key);
                }
            }
        } catch (e) {
            console.warn('[Cache] LocalStorage read failed', e);
        }

        cacheLogger.metric('Cache miss', { key });
        return null;
    }

    /**
     * Set cache value with TTL
     */
    async set<T>(key: string, value: T, ttl: number = 3600000): Promise<void> {
        const entry: CacheEntry<T> = {
            data: value,
            timestamp: Date.now(),
            ttl,
        };

        // Layer 1: Memory
        this.memoryCache.set(key, entry);

        // Layer 2: LocalStorage
        try {
            localStorage.setItem(this.storageKeyPrefix + key, JSON.stringify(entry));
        } catch (e) {
            console.warn('[Cache] LocalStorage write failed', e);
        }
    }

    /**
     * Invalidate cache by pattern
     * Note: key matching in localStorage is O(N)
     */
    async invalidate(pattern: string): Promise<void> {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        const regex = new RegExp(`^${regexPattern}$`);

        // Clear Memory
        for (const key of this.memoryCache.keys()) {
            if (regex.test(key)) {
                this.memoryCache.delete(key);
            }
        }

        // Clear LocalStorage
        try {
            // Iterate backwards to avoid index issues when removing
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storageKeyPrefix)) {
                    const pureKey = key.slice(this.storageKeyPrefix.length);
                    if (regex.test(pureKey)) {
                        localStorage.removeItem(key);
                    }
                }
            }
        } catch (e) {
            console.warn('[Cache] LocalStorage cleanup failed', e);
        }
    }

    /**
     * Clear all caches
     */
    async clearAll(): Promise<void> {
        this.memoryCache.clear();
        try {
            // Only remove our keys
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storageKeyPrefix)) {
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            console.warn('[Cache] LocalStorage clear failed', e);
        }
    }

    /**
     * Cleanup expired entries
     */
    private cleanup() {
        // Cleanup logic could go here
        // For localStorage, we might lazily clean on access or set a simplified garbage collector
    }
}

// Singleton instance
export const cacheService = new CacheService();

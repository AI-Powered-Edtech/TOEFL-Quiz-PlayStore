import { supabase } from './supabase';

// ============ TYPES ============

export interface UnifiedLeaderboardEntry {
    rank: number;
    userId: string;
    userName: string;
    avatarUrl?: string;
    totalXp: number;
    quizXp: number;
    writingXp: number;
    essayXp: number;
    streak: number;
}

type TimeFilter = 'week' | 'month' | 'all';

// ============ CACHE CONFIGURATION ============

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

// Cache TTL in milliseconds
const CACHE_TTL = {
    leaderboard: 5 * 60 * 1000,  // 5 minutes for full leaderboard
    userRank: 2 * 60 * 1000,     // 2 minutes for user rank
    profiles: 10 * 60 * 1000,    // 10 minutes for profiles
    xpData: 3 * 60 * 1000,       // 3 minutes for XP aggregations
} as const;

// In-memory cache
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get data from cache if valid, otherwise return null
 */
function getFromCache<T>(key: string): T | null {
    const entry = cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
        return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}

/**
 * Store data in cache with TTL
 */
function setCache<T>(key: string, data: T, ttlMs: number): void {
    const now = Date.now();
    cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttlMs,
    });
}

/**
 * Invalidate all cache entries matching a pattern
 */
function invalidateCachePattern(pattern: string): void {
    for (const key of cache.keys()) {
        if (key.startsWith(pattern)) {
            cache.delete(key);
        }
    }
}

/**
 * Clear all cache entries
 */
export function clearLeaderboardCache(): void {
    cache.clear();
}

// ============ SERVICE ============

export const leaderboardService = {

    /**
     * Get unified leaderboard aggregating XP from all sources
     * Uses caching to reduce database load
     */
    async getUnifiedLeaderboard(
        timeFilter: TimeFilter = 'all',
        limit: number = 50
    ): Promise<UnifiedLeaderboardEntry[]> {
        const cacheKey = `leaderboard:${timeFilter}:${limit}`;

        // Check cache first
        const cached = getFromCache<UnifiedLeaderboardEntry[]>(cacheKey);
        if (cached) {
            return cached;
        }

        // With the new schema, we rely on the `profiles` table which has `xp`, `quiz_xp`, `writing_xp`, `essay_xp`
        let query = supabase
            .from('profiles')
            .select('id, full_name, avatar_url, xp, quiz_xp, writing_xp, essay_xp')
            .order('xp', { ascending: false })
            .limit(limit);

        // Note: For timeFilter ('week', 'month'), it would require a slightly different approach
        // such as a daily aggregate table. For now, we will just use the global XP.
        // If strict time filtering is required, a materialized view in the DB is needed.

        const { data, error } = await query;

        if (error || !data) {
            console.error('Failed to fetch leaderboard:', error);
            return [];
        }

        const entries: UnifiedLeaderboardEntry[] = data.map((profile, index) => ({
            rank: index + 1,
            userId: profile.id,
            userName: profile.full_name || 'Anonymous',
            avatarUrl: profile.avatar_url || undefined,
            totalXp: profile.xp || 0,
            quizXp: profile.quiz_xp || 0,
            writingXp: profile.writing_xp || 0,
            essayXp: profile.essay_xp || 0,
            streak: 0 // TODO: real streak calc
        }));

        // Cache the result
        setCache(cacheKey, entries, CACHE_TTL.leaderboard);

        return entries;
    },

    /**
     * Get current user's rank
     */
    async getUserRank(
        userId: string,
        timeFilter: TimeFilter = 'all'
    ): Promise<UnifiedLeaderboardEntry | null> {
        const cacheKey = `userRank:${userId}:${timeFilter}`;

        // Check cache first
        const cached = getFromCache<UnifiedLeaderboardEntry | null>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // Get full leaderboard (which is cached)
        const leaderboard = await this.getUnifiedLeaderboard(timeFilter, 999);
        const result = leaderboard.find(e => e.userId === userId) || null;

        // Cache the result
        setCache(cacheKey, result, CACHE_TTL.userRank);

        return result;
    },

    /**
     * Force refresh the leaderboard (call after XP changes)
     */
    async refreshLeaderboard(timeFilter: TimeFilter = 'all'): Promise<void> {
        invalidateCachePattern('leaderboard:');
        invalidateCachePattern('userRank:');
        invalidateCachePattern('xpData:');
        // Pre-fetch and cache
        await this.getUnifiedLeaderboard(timeFilter, 50);
    },

    // ============ PRIVATE HELPERS ============

    _getDateFilter(timeFilter: TimeFilter): string | null {
        const now = new Date();
        if (timeFilter === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return weekAgo.toISOString();
        }
        if (timeFilter === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return monthAgo.toISOString();
        }
        return null; // all time
    },

    /**
     * Get cache statistics for monitoring
     */
    _getCacheStats(): { size: number; keys: string[] } {
        return {
            size: cache.size,
            keys: Array.from(cache.keys()),
        };
    }
};

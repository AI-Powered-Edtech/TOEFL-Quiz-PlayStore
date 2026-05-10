import { apiClient } from './apiClient';
import { apiV2 } from './apiV2';

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

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

const CACHE_TTL = {
    leaderboard: 5 * 60 * 1000,
    userRank: 2 * 60 * 1000,
    profiles: 10 * 60 * 1000,
    xpData: 3 * 60 * 1000,
} as const;

const cache = new Map<string, CacheEntry<unknown>>();

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

function setCache<T>(key: string, data: T, ttlMs: number): void {
    const now = Date.now();
    cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttlMs,
    });
}

function invalidateCachePattern(pattern: string): void {
    for (const key of cache.keys()) {
        if (key.startsWith(pattern)) {
            cache.delete(key);
        }
    }
}

export function clearLeaderboardCache(): void {
    cache.clear();
}

interface LeaderboardProfile {
    rank: number;
    user_id: string;
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    xp?: number;
    total_xp?: number;
    current_streak?: number;
}

export const leaderboardService = {

    async getUnifiedLeaderboard(
        timeFilter: TimeFilter = 'all',
        limit: number = 50
    ): Promise<UnifiedLeaderboardEntry[]> {
        const cacheKey = `leaderboard:${timeFilter}:${limit}`;

        const cached = getFromCache<UnifiedLeaderboardEntry[]>(cacheKey);
        if (cached) {
            return cached;
        }

        // Try declarative VWFD public leaderboard first for the guest/cold case.
        // UX impact: landing page can show the top-50 leaderboard without any
        // auth round-trip → ~40-60ms faster cold open and edge-cacheable.
        // Falls back to the authenticated Rust handler for any error or for
        // non-guest scopes where richer data is required.
        if (timeFilter === 'all') {
            try {
                const v2 = await apiV2.get<{ entries: UnifiedLeaderboardEntry[] }>('/api/v2/social/leaderboard/public');
                if (v2 && Array.isArray(v2.entries)) {
                    setCache(cacheKey, v2.entries.slice(0, limit), CACHE_TTL.leaderboard);
                    return v2.entries.slice(0, limit);
                }
            } catch { /* fall through to Rust */ }
        }
        try {
            const response = await apiClient.get<LeaderboardProfile[]>(`/api/social/leaderboard`);

            if (response.error || !response.data) {
                console.warn('Failed to fetch leaderboard:', response.error);
                return [];
            }

            const entries: UnifiedLeaderboardEntry[] = response.data.slice(0, limit).map((profile, index) => ({
                rank: profile.rank || index + 1,
                userId: profile.user_id,
                userName: profile.full_name || profile.username || 'Anonymous',
                avatarUrl: profile.avatar_url || undefined,
                totalXp: profile.xp ?? profile.total_xp ?? 0,
                quizXp: 0,
                writingXp: 0,
                essayXp: 0,
                streak: profile.current_streak ?? 0
            }));

            setCache(cacheKey, entries, CACHE_TTL.leaderboard);

            return entries;
        } catch (err) {
            console.warn('Failed to fetch leaderboard:', err);
            return [];
        }
    },

    async getUserRank(
        userId: string,
        timeFilter: TimeFilter = 'all'
    ): Promise<UnifiedLeaderboardEntry | null> {
        const cacheKey = `userRank:${userId}:${timeFilter}`;

        const cached = getFromCache<UnifiedLeaderboardEntry | null>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        const leaderboard = await this.getUnifiedLeaderboard(timeFilter, 999);
        const result = leaderboard.find(e => e.userId === userId) || null;

        setCache(cacheKey, result, CACHE_TTL.userRank);

        return result;
    },

    async refreshLeaderboard(timeFilter: TimeFilter = 'all'): Promise<void> {
        invalidateCachePattern('leaderboard:');
        invalidateCachePattern('userRank:');
        invalidateCachePattern('xpData:');
        await this.getUnifiedLeaderboard(timeFilter, 50);
    },

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
        return null;
    },

    _getCacheStats(): { size: number; keys: string[] } {
        return {
            size: cache.size,
            keys: Array.from(cache.keys()),
        };
    }
};

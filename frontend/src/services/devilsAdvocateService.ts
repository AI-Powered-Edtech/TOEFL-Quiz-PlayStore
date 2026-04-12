import { AdvocateChallenge, AdvocateDefenseResult, DevilsAdvocateSession } from '../types';
import { challengeCache, evaluationCache } from '../utils/aiCache';
import { advocateRateLimiter } from '../utils/RateLimiter';

const SESSIONS_KEY = 'devils_advocate_sessions_';

const getSessionsKey = (userId: string): string => `${SESSIONS_KEY}${userId}`;

const getLocalSessions = (userId: string): DevilsAdvocateSession[] => {
    try {
        const stored = localStorage.getItem(getSessionsKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveLocalSessions = (userId: string, sessions: DevilsAdvocateSession[]): void => {
    localStorage.setItem(getSessionsKey(userId), JSON.stringify(sessions));
};

export const devilsAdvocateService = {

    async generateChallenge(userArgument: string, userId?: string): Promise<AdvocateChallenge> {
        const cached = challengeCache.get(userArgument);
        if (cached) {
            console.log('[DevilsAdvocate] Using cached challenge');
            return cached;
        }

        const key = userId || 'anonymous';
        const rateLimit = await advocateRateLimiter.checkLimit(key);

        if (!rateLimit.allowed) {
            const resetIn = Math.ceil((rateLimit.resetTime - Date.now()) / 60000);
            throw new Error(
                `Rate limit exceeded. Please try again in ${resetIn} minute${resetIn > 1 ? 's' : ''}.`
            );
        }

        try {
            const { generateDevilsAdvocateChallenge } = await import('./groq/generators');
            const result = await generateDevilsAdvocateChallenge(userArgument);
            challengeCache.set(userArgument, result);
            return result;
        } catch (error) {
            console.error('Failed to generate challenge:', error);
            throw error;
        }
    },

    async evaluateDefense(
        originalClaim: string,
        counterPoint: string,
        userDefense: string
    ): Promise<AdvocateDefenseResult> {
        const cacheKey = `${originalClaim}|${counterPoint}|${userDefense}`;
        const cached = evaluationCache.get(cacheKey);
        if (cached) {
            console.log('[DevilsAdvocate] Using cached evaluation');
            return cached;
        }

        try {
            const { evaluateAdvocateDefense } = await import('./groq/generators');
            const result = await evaluateAdvocateDefense(originalClaim, counterPoint, userDefense);
            evaluationCache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Failed to evaluate defense:', error);
            throw error;
        }
    },

    async saveSession(
        userId: string | null,
        sessionData: Partial<DevilsAdvocateSession>
    ): Promise<string> {
        if (!userId) return crypto.randomUUID();

        try {
            const sessions = getLocalSessions(userId);
            const newSession = {
                id: crypto.randomUUID(),
                user_id: userId,
                ...sessionData,
                created_at: new Date().toISOString()
            } as DevilsAdvocateSession;

            sessions.unshift(newSession);
            if (sessions.length > 50) sessions.splice(50);
            saveLocalSessions(userId, sessions);

            return newSession.id!;
        } catch (error) {
            console.error('Failed to save session:', error);
            throw error;
        }
    },

    async updateSession(
        sessionId: string,
        updates: Partial<DevilsAdvocateSession>
    ): Promise<void> {
        console.log('[DevilsAdvocate] Session update skipped - using local storage');
    },

    async getUserSessions(userId: string, limit: number = 10): Promise<DevilsAdvocateSession[]> {
        const sessions = getLocalSessions(userId);
        return sessions
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
            .slice(0, limit);
    },

    async getSessionStats(userId: string): Promise<{
        total_sessions: number;
        successful_defenses: number;
        average_score: number;
    }> {
        const sessions = getLocalSessions(userId);
        const withScore = sessions.filter(s => s.score !== undefined);

        const successful = sessions.filter((s: any) => s.is_successful).length;
        const avgScore = withScore.length > 0
            ? withScore.reduce((sum, s) => sum + (s.score || 0), 0) / withScore.length
            : 0;

        return {
            total_sessions: sessions.length,
            successful_defenses: successful,
            average_score: Math.round(avgScore),
        };
    },
};

import { AdvocateChallenge, AdvocateDefenseResult, DevilsAdvocateSession } from '../types';
import { challengeCache, evaluationCache } from '../utils/aiCache';
import { advocateRateLimiter } from '../utils/rateLimiter';

import { supabase } from './supabase';

/**
 * Service for Devil's Advocate feature
 * Handles AI challenge generation, defense evaluation, and session management
 */
export const devilsAdvocateService = {
    /**
     * Generate AI challenge for user's argument
     */
    async generateChallenge(userArgument: string, userId?: string): Promise<AdvocateChallenge> {
        // Check cache first
        const cached = challengeCache.get(userArgument);
        if (cached) {
            console.log('[DevilsAdvocate] Using cached challenge');
            return cached;
        }

        // Rate limit check
        const key = userId || 'anonymous';
        const rateLimit = advocateRateLimiter.check(key);

        if (!rateLimit.allowed) {
            const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 60000);
            throw new Error(
                `Rate limit exceeded. Please try again in ${resetIn} minute${resetIn > 1 ? 's' : ''}.`
            );
        }

        try {
            const { generateDevilsAdvocateChallenge } = await import('./groq/generators');
            const result = await generateDevilsAdvocateChallenge(userArgument);

            // Cache the result
            challengeCache.set(userArgument, result);

            return result;
        } catch (error) {
            console.error('Failed to generate challenge:', error);
            throw error;
        }
    },

    /**
     * Evaluate user's defense
     */
    async evaluateDefense(
        originalClaim: string,
        counterPoint: string,
        userDefense: string
    ): Promise<AdvocateDefenseResult> {
        // Create cache key from all inputs
        const cacheKey = `${originalClaim}|${counterPoint}|${userDefense}`;

        // Check cache first
        const cached = evaluationCache.get(cacheKey);
        if (cached) {
            console.log('[DevilsAdvocate] Using cached evaluation');
            return cached;
        }

        try {
            const { evaluateAdvocateDefense } = await import('./groq/generators');
            const result = await evaluateAdvocateDefense(originalClaim, counterPoint, userDefense);

            // Cache the result
            evaluationCache.set(cacheKey, result);

            return result;
        } catch (error) {
            console.error('Failed to evaluate defense:', error);
            throw error;
        }
    },

    /**
     * Save session to database
     */
    async saveSession(
        userId: string | null,
        sessionData: Partial<DevilsAdvocateSession>
    ): Promise<string> {
        const { data, error } = await supabase
            .from('devils_advocate_sessions')
            .insert({
                user_id: userId,
                ...sessionData,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Failed to save session:', error);
            throw error;
        }

        return data.id;
    },

    /**
     * Update existing session
     */
    async updateSession(
        sessionId: string,
        updates: Partial<DevilsAdvocateSession>
    ): Promise<void> {
        const { error } = await supabase
            .from('devils_advocate_sessions')
            .update(updates)
            .eq('id', sessionId);

        if (error) {
            console.error('Failed to update session:', error);
            throw error;
        }
    },

    /**
     * Get user's session history
     */
    async getUserSessions(userId: string, limit: number = 10): Promise<DevilsAdvocateSession[]> {
        const { data, error } = await supabase
            .from('devils_advocate_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Failed to fetch sessions:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get session statistics
     */
    async getSessionStats(userId: string): Promise<{
        total_sessions: number;
        successful_defenses: number;
        average_score: number;
    }> {
        const { data, error } = await supabase
            .from('devils_advocate_sessions')
            .select('is_successful, score')
            .eq('user_id', userId)
            .not('score', 'is', null);

        if (error || !data) {
            return { total_sessions: 0, successful_defenses: 0, average_score: 0 };
        }

        const successful = data.filter(s => s.is_successful).length;
        const avgScore = data.length > 0
            ? data.reduce((sum, s) => sum + (s.score || 0), 0) / data.length
            : 0;

        return {
            total_sessions: data.length,
            successful_defenses: successful,
            average_score: Math.round(avgScore),
        };
    },
};

// Mason Session Persistence Service
// Handles session state persistence with Supabase + localStorage fallback

import type { MasonSessionState, MasonGameState } from '../types/mason';

import { supabase } from './supabase';

const SESSION_STORAGE_KEY = 'mason_active_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export class MasonSessionService {
    /**
     * Create a new session in database
     */
    async createSession(
        userId: string,
        exerciseId: string,
        skillId: string
    ): Promise<MasonSessionState> {
        const sessionId = crypto.randomUUID();

        const sessionState: MasonSessionState = {
            sessionId,
            userId,
            exerciseId,
            skillId,
            gameState: {
                currentLevel: 1,
                placedItems: [],
                lives: 3,
                score: 0,
                combo: 0,
                status: 'playing',
                timeRemaining: 180,
                maxTime: 180,
                powerUps: { reveal: 2, freeze: 1, shuffle: 3, hint: 5 },
                streakBonus: 1
            },
            startTime: Date.now(),
            lastUpdated: Date.now(),
            status: 'in_progress'
        };

        // Save to Supabase (only for authenticated users whose ID matches auth.uid)
        const { data: authData } = await supabase.auth.getSession();
        const authUid = authData.session?.user?.id;
        if (authData.session && authUid === userId) {
            try {
                const { error } = await supabase
                    .from('mason_sessions')
                    .insert({
                        id: sessionId,
                        user_id: userId,
                        exercise_id: exerciseId,
                        skill_id: skillId,
                        current_level: 1,
                        placed_items: [],
                        lives: 3,
                        score: 0,
                        combo: 0,
                        start_time: sessionState.startTime, // bigint in DB
                        last_updated: new Date(sessionState.lastUpdated).toISOString(), // timestamp in DB
                        status: 'in_progress'
                    });

                if (error) {
                    console.error('[MasonSession] Failed to create session in DB:', error);
                    // Continue with localStorage only
                }
            } catch (e) {
                console.warn('[MasonSession] DB unavailable, using localStorage only');
            }
        }

        // Always save to localStorage as backup
        this.saveToLocalStorage(sessionState);

        return sessionState;
    }

    /**
     * Save current game state
     */
    async saveState(
        sessionId: string,
        gameState: MasonGameState
    ): Promise<void> {
        const now = Date.now();

        // Update in Supabase
        try {
            const { data } = await supabase.auth.getSession();
            const authUid = data.session?.user?.id;
            if (data.session && authUid) {
                const { error } = await supabase
                    .from('mason_sessions')
                    .update({
                        current_level: gameState.currentLevel,
                        placed_items: gameState.placedItems,
                        lives: gameState.lives,
                        score: gameState.score,
                        combo: gameState.combo,
                        last_updated: new Date(now).toISOString()
                    })
                    .eq('id', sessionId);

                if (error) {
                    console.error('[MasonSession] Failed to save state to DB:', error);
                }
            }
        } catch (e) {
            console.warn('[MasonSession] DB unavailable for state save');
        }

        // Update localStorage
        const localSession = this.getFromLocalStorage();
        if (localSession && localSession.sessionId === sessionId) {
            localSession.gameState = gameState;
            localSession.lastUpdated = now;
            this.saveToLocalStorage(localSession);
        }
    }

    /**
     * Get active session for a user
     */
    async getActiveSession(userId: string): Promise<MasonSessionState | null> {
        // Try localStorage first (faster)
        const localSession = this.getFromLocalStorage();
        if (localSession && localSession.userId === userId && !this.isExpired(localSession)) {
            return localSession;
        }

        // Fallback to Supabase
        try {
            const { data: authData } = await supabase.auth.getSession();
            if (!authData.session) return null; // Guest user check

            const { data, error } = await supabase
                .from('mason_sessions')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'in_progress')
                .order('last_updated', { ascending: false })
                .limit(1);

            if (error) {
                console.error('[MasonSession] Failed to fetch session from DB:', error);
                return null;
            }

            if (!data || data.length === 0) {
                return null;
            }

            const sessionData = data[0];
            const sessionState: MasonSessionState = {
                sessionId: sessionData.id,
                userId: sessionData.user_id,
                exerciseId: sessionData.exercise_id,
                skillId: sessionData.skill_id,
                gameState: {
                    currentLevel: sessionData.current_level,
                    placedItems: sessionData.placed_items || [],
                    lives: sessionData.lives,
                    score: sessionData.score,
                    combo: sessionData.combo,
                    // Default values for new fields
                    status: 'playing',
                    timeRemaining: 180,
                    maxTime: 180,
                    powerUps: { reveal: 2, freeze: 1, shuffle: 3, hint: 5 },
                    streakBonus: 1
                },
                startTime: Number(sessionData.start_time), // Ensure number
                lastUpdated: new Date(sessionData.last_updated).getTime(), // Ensure timestamp
                status: sessionData.status
            };

            // Check expiry
            if (this.isExpired(sessionState)) {
                await this.completeSession(sessionState.sessionId, 'abandoned');
                return null;
            }

            // Sync to localStorage
            this.saveToLocalStorage(sessionState);

            return sessionState;
        } catch (e) {
            console.error('[MasonSession] Failed to fetch session from DB:', e);
            return null;
        }
    }

    /**
     * Resume an existing session
     */
    async resumeSession(sessionId: string): Promise<MasonSessionState | null> {
        // Try localStorage first
        const localSession = this.getFromLocalStorage();
        if (localSession && localSession.sessionId === sessionId) {
            if (!this.isExpired(localSession)) {
                return localSession;
            }
        }

        // Fallback to Supabase
        try {
            const { data: authData } = await supabase.auth.getSession();
            if (!authData.session) return null; // Guest user check

            const { data, error } = await supabase
                .from('mason_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (error || !data) {
                console.error('[MasonSession] Session not found:', sessionId);
                return null;
            }

            const sessionState: MasonSessionState = {
                sessionId: data.id,
                userId: data.user_id,
                exerciseId: data.exercise_id,
                skillId: data.skill_id,
                gameState: {
                    currentLevel: data.current_level,
                    placedItems: data.placed_items || [],
                    lives: data.lives,
                    score: data.score,
                    combo: data.combo,
                    // Default values for new fields
                    status: 'playing',
                    timeRemaining: 180,
                    maxTime: 180,
                    powerUps: { reveal: 2, freeze: 1, shuffle: 3, hint: 5 },
                    streakBonus: 1
                },
                startTime: data.start_time,
                lastUpdated: new Date(data.last_updated).getTime(),
                status: data.status
            };

            if (this.isExpired(sessionState)) {
                await this.completeSession(sessionId, 'abandoned');
                return null;
            }

            return sessionState;
        } catch (e) {
            console.error('[MasonSession] Failed to resume session:', e);
            return null;
        }
    }

    /**
     * Mark session as complete
     */
    async completeSession(
        sessionId: string,
        status: 'completed' | 'abandoned' = 'completed'
    ): Promise<void> {
        // Update in Supabase
        try {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                const { error } = await supabase
                    .from('mason_sessions')
                    .update({ status })
                    .eq('id', sessionId);

                if (error) {
                    console.error('[MasonSession] Failed to complete session:', error);
                }
            }
        } catch (e) {
            console.warn('[MasonSession] DB unavailable for session completion');
        }

        // Clear localStorage
        const localSession = this.getFromLocalStorage();
        if (localSession && localSession.sessionId === sessionId) {
            this.clearLocalStorage();
        }
    }

    /**
     * Explicitly abandon a session (alias for completeSession with abandoned status)
     */
    async abandonSession(sessionId: string): Promise<void> {
        return this.completeSession(sessionId, 'abandoned');
    }

    /**
     * Check if session is expired
     */
    private isExpired(session: MasonSessionState): boolean {
        const age = Date.now() - session.lastUpdated;
        return age > SESSION_EXPIRY_MS;
    }

    /**
     * Save to localStorage
     */
    private saveToLocalStorage(session: MasonSessionState): void {
        try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        } catch (e) {
            console.warn('[MasonSession] Failed to save to localStorage:', e);
        }
    }

    /**
     * Get from localStorage
     */
    private getFromLocalStorage(): MasonSessionState | null {
        try {
            const data = localStorage.getItem(SESSION_STORAGE_KEY);
            if (!data) return null;
            const session = JSON.parse(data);

            // Validate UUID format to prevent DB errors with legacy IDs
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!session.sessionId || !uuidRegex.test(session.sessionId)) {
                console.warn('[MasonSession] Invalid session ID format in storage, clearing');
                this.clearLocalStorage();
                return null;
            }

            return session;
        } catch (e) {
            console.warn('[MasonSession] Failed to read from localStorage:', e);
            return null;
        }
    }

    /**
     * Clear localStorage
     */
    private clearLocalStorage(): void {
        try {
            localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (e) {
            console.warn('[MasonSession] Failed to clear localStorage:', e);
        }
    }
}

// Export singleton instance
export const masonSessionService = new MasonSessionService();

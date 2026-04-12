/**
 * Session Persistence Service
 * Provides unified session save/restore functionality for all Writing Gym components
 */

import { supabase } from './supabase';

// Types
export type WritingGymLevel = 'mason' | 'logic_weaver' | 'ielts_paragraph' | 'complexity_ladder' | 'integrated_writing' | 'devils_advocate';

export interface SessionState {
    sessionId: string;
    userId: string;
    level: WritingGymLevel;
    skillId?: string;
    phase?: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    gameState: Record<string, unknown>;
    startedAt: number;
    lastActivity: number;
    expiresAt: number;
}

export interface SessionRecovery {
    hasSession: boolean;
    session?: SessionState;
    timeRemaining?: number;
}

// Constants
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOCAL_STORAGE_KEY_PREFIX = 'wg_session_';
const DB_TABLE_NAME = 'writing_gym_sessions_v2';

// UUID validation — guest users don't have valid UUIDs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

/**
 * Session Persistence Service
 */
export const sessionPersistenceService = {
    /**
     * Create a new session
     */
    async createSession(
        userId: string,
        level: WritingGymLevel,
        skillId?: string,
        initialGameState?: Record<string, unknown>
    ): Promise<SessionState> {
        const sessionId = crypto.randomUUID();
        const now = Date.now();

        const session: SessionState = {
            sessionId,
            userId,
            level,
            skillId,
            status: 'in_progress',
            gameState: initialGameState || {},
            startedAt: now,
            lastActivity: now,
            expiresAt: now + SESSION_EXPIRY_MS
        };

        // Save to localStorage immediately for quick recovery
        this.saveToLocalStorage(session);

        // Save to database asynchronously
        this.saveToDatabase(session).catch(err => {
            console.warn('[SessionPersistence] Failed to save to database:', err);
        });

        return session;
    },

    /**
     * Update session state
     */
    async updateSession(
        sessionId: string,
        updates: Partial<Pick<SessionState, 'gameState' | 'phase' | 'skillId' | 'status'>>
    ): Promise<void> {
        // Get current session from localStorage
        const session = this.getFromLocalStorage(sessionId);
        if (!session) {
            console.warn('[SessionPersistence] Session not found for update:', sessionId);
            return;
        }

        // Update session
        const updatedSession: SessionState = {
            ...session,
            ...updates,
            lastActivity: Date.now()
        };

        // Save to localStorage
        this.saveToLocalStorage(updatedSession);

        // Save to database asynchronously
        this.saveToDatabase(updatedSession).catch(err => {
            console.warn('[SessionPersistence] Failed to update database:', err);
        });
    },

    /**
     * Get active session for a user and level
     */
    async getActiveSession(
        userId: string,
        level: WritingGymLevel
    ): Promise<SessionRecovery> {
        // First check localStorage for quick recovery
        const localSession = this.getFromLocalStorageByLevel(userId, level);

        if (localSession && !this.isSessionExpired(localSession)) {
            return {
                hasSession: true,
                session: localSession,
                timeRemaining: localSession.expiresAt - Date.now()
            };
        }

        // Then check database
        try {
            const dbSession = await this.getFromDatabase(userId, level);

            if (dbSession && !this.isSessionExpired(dbSession)) {
                // Restore to localStorage for future quick access
                this.saveToLocalStorage(dbSession);

                return {
                    hasSession: true,
                    session: dbSession,
                    timeRemaining: dbSession.expiresAt - Date.now()
                };
            }
        } catch (err) {
            console.warn('[SessionPersistence] Failed to check database:', err);
        }

        return { hasSession: false };
    },

    /**
     * Complete a session
     */
    async completeSession(sessionId: string): Promise<void> {
        const session = this.getFromLocalStorage(sessionId);
        if (!session) return;

        const completedSession: SessionState = {
            ...session,
            status: 'completed',
            lastActivity: Date.now()
        };

        // Update database
        await this.saveToDatabase(completedSession);

        // Remove from localStorage
        this.removeFromLocalStorage(sessionId);
    },

    /**
     * Abandon a session
     */
    async abandonSession(sessionId: string): Promise<void> {
        const session = this.getFromLocalStorage(sessionId);
        if (!session) return;

        const abandonedSession: SessionState = {
            ...session,
            status: 'abandoned',
            lastActivity: Date.now()
        };

        // Update database
        await this.saveToDatabase(abandonedSession);

        // Remove from localStorage
        this.removeFromLocalStorage(sessionId);
    },

    /**
     * Clear expired sessions
     */
    async clearExpiredSessions(userId: string): Promise<void> {
        // Clear from localStorage
        const keys = Object.keys(localStorage);
        const sessionKeys = keys.filter(k => k.startsWith(LOCAL_STORAGE_KEY_PREFIX));

        for (const key of sessionKeys) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const session = JSON.parse(data) as SessionState;
                    if (session.userId === userId && this.isSessionExpired(session)) {
                        localStorage.removeItem(key);
                    }
                }
            } catch {
                // Invalid data, remove it
                localStorage.removeItem(key);
            }
        }

        // Clear from database
        if (isValidUUID(userId)) {
            try {
                await supabase
                    .from(DB_TABLE_NAME)
                    .delete()
                    .eq('user_id', userId)
                    .lt('expires_at', Date.now());
            } catch (err) {
                console.warn('[SessionPersistence] Failed to clear expired sessions from database:', err);
            }
        }
    },

    // ==================== LocalStorage Operations ====================

    /**
     * Save session to localStorage
     */
    saveToLocalStorage(session: SessionState): void {
        const key = `${LOCAL_STORAGE_KEY_PREFIX}${session.sessionId}`;
        const levelKey = `${LOCAL_STORAGE_KEY_PREFIX}${session.userId}_${session.level}`;

        try {
            localStorage.setItem(key, JSON.stringify(session));
            localStorage.setItem(levelKey, JSON.stringify(session));
        } catch (err) {
            console.warn('[SessionPersistence] Failed to save to localStorage:', err);
        }
    },

    /**
     * Get session from localStorage by sessionId
     */
    getFromLocalStorage(sessionId: string): SessionState | null {
        const key = `${LOCAL_STORAGE_KEY_PREFIX}${sessionId}`;

        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    /**
     * Get session from localStorage by userId and level
     */
    getFromLocalStorageByLevel(userId: string, level: WritingGymLevel): SessionState | null {
        const levelKey = `${LOCAL_STORAGE_KEY_PREFIX}${userId}_${level}`;

        try {
            const data = localStorage.getItem(levelKey);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    /**
     * Remove session from localStorage
     */
    removeFromLocalStorage(sessionId: string): void {
        const key = `${LOCAL_STORAGE_KEY_PREFIX}${sessionId}`;

        try {
            const data = localStorage.getItem(key);
            if (data) {
                const session = JSON.parse(data) as SessionState;
                const levelKey = `${LOCAL_STORAGE_KEY_PREFIX}${session.userId}_${session.level}`;
                localStorage.removeItem(levelKey);
            }
            localStorage.removeItem(key);
        } catch {
            localStorage.removeItem(key);
        }
    },

    // ==================== Database Operations ====================

    /**
     * Save session to database
     */
    async saveToDatabase(session: SessionState): Promise<void> {
        // Skip DB for guest/non-UUID users — use localStorage only
        if (!isValidUUID(session.userId)) return;

        try {
            // Further verify the user is actually authenticated in the session to avoid 403 RLS violation
            const { data: authData } = await supabase.auth.getSession();
            if (!authData.session) return;

            const { error } = await supabase
                .from(DB_TABLE_NAME)
                .upsert({
                    id: session.sessionId,        // Main PK
                    session_id: session.sessionId, // The required non-null column that was missing
                    user_id: session.userId,
                    level: session.level,
                    skill_id: session.skillId,
                    phase: session.phase,
                    status: session.status,
                    game_state: session.gameState,
                    started_at: session.startedAt,
                    last_activity: session.lastActivity,
                    expires_at: session.expiresAt
                }, {
                    onConflict: 'id'
                });

            if (error) {
                console.warn('[SessionPersistence] Database upsert error:', error);
            }
        } catch (err) {
            console.warn('[SessionPersistence] Failed to save to database:', err);
        }
    },

    /**
     * Get session from database
     */
    async getFromDatabase(userId: string, level: WritingGymLevel): Promise<SessionState | null> {
        // Skip DB for guest/non-UUID users
        if (!isValidUUID(userId)) return null;

        try {
            const { data, error } = await supabase
                .from(DB_TABLE_NAME)
                .select('*')
                .eq('user_id', userId)
                .eq('level', level)
                .eq('status', 'in_progress')
                .gt('expires_at', Date.now())
                .order('last_activity', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error || !data) {
                return null;
            }

            return {
                sessionId: data.id,
                userId: data.user_id,
                level: data.level,
                skillId: data.skill_id,
                phase: data.phase,
                status: data.status,
                gameState: data.game_state,
                startedAt: data.started_at,
                lastActivity: data.last_activity,
                expiresAt: data.expires_at
            };
        } catch {
            return null;
        }
    },

    // ==================== Helper Methods ====================

    /**
     * Check if session is expired
     */
    isSessionExpired(session: SessionState): boolean {
        return Date.now() > session.expiresAt;
    },

    /**
     * Get time remaining in session
     */
    getTimeRemaining(session: SessionState): number {
        return Math.max(0, session.expiresAt - Date.now());
    },

    /**
     * Format time remaining for display
     */
    formatTimeRemaining(ms: number): string {
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes} minutes`;
    }
};

// ==================== React Hook ====================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for session persistence in React components
 */
export const useSessionPersistence = (
    userId: string,
    level: WritingGymLevel,
    skillId?: string
) => {
    const [session, setSession] = useState<SessionState | null>(null);
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryAvailable, setRecoveryAvailable] = useState(false);

    // Check for existing session on mount
    useEffect(() => {
        const checkSession = async () => {
            const recovery = await sessionPersistenceService.getActiveSession(userId, level);

            if (recovery.hasSession && recovery.session) {
                setSession(recovery.session);
                setRecoveryAvailable(true);
            }
        };

        if (userId) {
            checkSession();
        }
    }, [userId, level]);

    // Create new session
    const createSession = useCallback(async (initialState?: Record<string, unknown>) => {
        const newSession = await sessionPersistenceService.createSession(
            userId,
            level,
            skillId,
            initialState
        );
        setSession(newSession);
        setRecoveryAvailable(false);
        return newSession;
    }, [userId, level, skillId]);

    // Update session
    const updateSession = useCallback(async (updates: Partial<SessionState['gameState']>) => {
        if (!session) return;

        await sessionPersistenceService.updateSession(session.sessionId, {
            gameState: { ...session.gameState, ...updates }
        });

        setSession(prev => prev ? {
            ...prev,
            gameState: { ...prev.gameState, ...updates },
            lastActivity: Date.now()
        } : null);
    }, [session]);

    // Complete session
    const completeSession = useCallback(async () => {
        if (!session) return;
        await sessionPersistenceService.completeSession(session.sessionId);
        setSession(null);
    }, [session]);

    // Abandon session
    const abandonSession = useCallback(async () => {
        if (!session) return;
        await sessionPersistenceService.abandonSession(session.sessionId);
        setSession(null);
    }, [session]);

    // Recover session
    const recoverSession = useCallback(() => {
        setIsRecovering(true);
        setRecoveryAvailable(false);
    }, []);

    // Start fresh (clear existing session)
    const startFresh = useCallback(async () => {
        if (session) {
            await sessionPersistenceService.abandonSession(session.sessionId);
        }
        setSession(null);
        setRecoveryAvailable(false);
    }, [session]);

    return {
        session,
        isRecovering,
        recoveryAvailable,
        createSession,
        updateSession,
        completeSession,
        abandonSession,
        recoverSession,
        startFresh
    };
};

export default sessionPersistenceService;

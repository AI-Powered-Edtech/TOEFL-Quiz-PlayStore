/**
 * Session Persistence Service
 * Provides unified session save/restore functionality for all Writing Gym components
 */

import { useState, useEffect, useCallback } from 'react';

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

const SESSION_KEY = 'writing_gym_session';
const EXPIRY_MS = 24 * 60 * 60 * 1000;

export const sessionPersistenceService = {

    async saveSession(state: SessionState): Promise<void> {
        const data = {
            ...state,
            lastActivity: Date.now(),
            expiresAt: Date.now() + EXPIRY_MS
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    },

    async getSession(userId: string): Promise<SessionState | null> {
        const stored = localStorage.getItem(SESSION_KEY);
        if (!stored) return null;

        try {
            const session: SessionState = JSON.parse(stored);
            if (session.userId !== userId) return null;
            if (Date.now() > session.expiresAt) {
                localStorage.removeItem(SESSION_KEY);
                return null;
            }
            return session;
        } catch {
            return null;
        }
    },

    async clearSession(): Promise<void> {
        localStorage.removeItem(SESSION_KEY);
    },

    async recoverSession(userId: string): Promise<SessionRecovery> {
        const session = await this.getSession(userId);
        if (!session) return { hasSession: false };

        const timeRemaining = Math.max(0, session.expiresAt - Date.now());
        return {
            hasSession: true,
            session,
            timeRemaining
        };
    },

    async updateActivity(): Promise<void> {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
            const session: SessionState = JSON.parse(stored);
            session.lastActivity = Date.now();
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    },

    async getActiveSession(userId: string, level: WritingGymLevel): Promise<SessionRecovery> {
        const session = await this.getSession(userId);
        if (!session || session.level !== level || session.status !== 'in_progress') {
            return { hasSession: false };
        }

        const timeRemaining = Math.max(0, session.expiresAt - Date.now());
        return {
            hasSession: true,
            session,
            timeRemaining
        };
    }
};

interface UseSessionPersistenceReturn {
    createSession: (gameState: Record<string, unknown>) => Promise<void>;
    updateSession: (gameState: Record<string, unknown>) => Promise<void>;
    completeSession: () => Promise<void>;
    abandonSession: () => Promise<void>;
    startFresh: () => Promise<void>;
    hasActiveSession: boolean;
    sessionData: Record<string, unknown> | null;
}

export function useSessionPersistence(userId: string, level: WritingGymLevel): UseSessionPersistenceReturn {
    const [hasActiveSession, setHasActiveSession] = useState(false);
    const [sessionData, setSessionData] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        const checkSession = async () => {
            const recovery = await sessionPersistenceService.getActiveSession(userId, level);
            setHasActiveSession(recovery.hasSession);
            if (recovery.session?.gameState) {
                setSessionData(recovery.session.gameState);
            }
        };
        checkSession();
    }, [userId, level]);

    const createSession = useCallback(async (gameState: Record<string, unknown>) => {
        const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        await sessionPersistenceService.saveSession({
            sessionId,
            userId,
            level,
            status: 'in_progress',
            gameState,
            startedAt: Date.now(),
            lastActivity: Date.now(),
            expiresAt: Date.now() + EXPIRY_MS
        });
        setHasActiveSession(true);
        setSessionData(gameState);
    }, [userId, level]);

    const updateSession = useCallback(async (gameState: Record<string, unknown>) => {
        const session = await sessionPersistenceService.getSession(userId);
        if (session && session.level === level) {
            await sessionPersistenceService.saveSession({
                ...session,
                gameState,
                lastActivity: Date.now()
            });
            setSessionData(gameState);
        }
    }, [userId, level]);

    const completeSession = useCallback(async () => {
        const session = await sessionPersistenceService.getSession(userId);
        if (session && session.level === level) {
            await sessionPersistenceService.saveSession({
                ...session,
                status: 'completed',
                lastActivity: Date.now()
            });
        }
        setHasActiveSession(false);
        setSessionData(null);
    }, [userId, level]);

    const abandonSession = useCallback(async () => {
        const session = await sessionPersistenceService.getSession(userId);
        if (session && session.level === level) {
            await sessionPersistenceService.saveSession({
                ...session,
                status: 'abandoned',
                lastActivity: Date.now()
            });
        }
        setHasActiveSession(false);
        setSessionData(null);
    }, [userId, level]);

    const startFresh = useCallback(async () => {
        await sessionPersistenceService.clearSession();
        setHasActiveSession(false);
        setSessionData(null);
    }, []);

    return {
        createSession,
        updateSession,
        completeSession,
        abandonSession,
        startFresh,
        hasActiveSession,
        sessionData
    };
}

export default sessionPersistenceService;

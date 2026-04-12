// Mason Session Persistence Service
// Handles session state persistence with localStorage only

import type { MasonSessionState, MasonGameState } from '../types/mason';

const SESSION_STORAGE_KEY = 'mason_active_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export class MasonSessionService {

    private saveToLocalStorage(sessionState: MasonSessionState): void {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
            ...sessionState,
            lastUpdated: Date.now()
        }));
    }

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

        this.saveToLocalStorage(sessionState);
        return sessionState;
    }

    async saveState(
        sessionId: string,
        gameState: MasonGameState
    ): Promise<void> {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            const session: MasonSessionState = JSON.parse(stored);
            if (session.sessionId === sessionId) {
                session.gameState = gameState;
                session.lastUpdated = Date.now();
                this.saveToLocalStorage(session);
            }
        }
    }

    async getSession(sessionId: string): Promise<MasonSessionState | null> {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!stored) return null;

        const session: MasonSessionState = JSON.parse(stored);
        if (session.sessionId !== sessionId) return null;

        if (Date.now() - session.lastUpdated > SESSION_EXPIRY_MS) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }

        return session;
    }

    async getActiveSession(userId: string): Promise<MasonSessionState | null> {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!stored) return null;

        const session: MasonSessionState = JSON.parse(stored);
        if (session.userId !== userId) return null;

        if (session.status !== 'in_progress') return null;

        if (Date.now() - session.lastUpdated > SESSION_EXPIRY_MS) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            return null;
        }

        return session;
    }

    async completeSession(sessionId: string, finalScore: number | string): Promise<void> {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            const session: MasonSessionState = JSON.parse(stored);
            if (session.sessionId === sessionId) {
                session.status = typeof finalScore === 'string' && ['completed', 'in_progress', 'abandoned'].includes(finalScore) 
                    ? finalScore as 'completed' | 'in_progress' | 'abandoned'
                    : 'completed';
                session.gameState.score = typeof finalScore === 'number' ? finalScore : 0;
                this.saveToLocalStorage(session);
            }
        }
    }

    async deleteSession(sessionId: string): Promise<void> {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
            const session: MasonSessionState = JSON.parse(stored);
            if (session.sessionId === sessionId) {
                localStorage.removeItem(SESSION_STORAGE_KEY);
            }
        }
    }

    async resumeSession(sessionId: string): Promise<MasonSessionState | null> {
        return this.getSession(sessionId);
    }

    async abandonSession(sessionId: string): Promise<void> {
        await this.deleteSession(sessionId);
    }
}

export const masonSessionService = new MasonSessionService();

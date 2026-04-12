import { WritingGymProgress, MasonSession } from '../types';
import api from './apiClient';

const SESSIONS_KEY = 'mason_sessions_';
const PROGRESS_KEY = 'mason_progress_';

const getSessionsKey = (userId: string): string => `${SESSIONS_KEY}${userId}`;
const getProgressKey = (userId: string): string => `${PROGRESS_KEY}${userId}`;

const getLocalSessions = (userId: string): MasonSession[] => {
    try {
        const stored = localStorage.getItem(getSessionsKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveLocalSessions = (userId: string, sessions: MasonSession[]): void => {
    localStorage.setItem(getSessionsKey(userId), JSON.stringify(sessions));
};

const getLocalProgress = (userId: string): WritingGymProgress[] => {
    try {
        const stored = localStorage.getItem(getProgressKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveLocalProgress = (userId: string, progress: WritingGymProgress[]): void => {
    localStorage.setItem(getProgressKey(userId), JSON.stringify(progress));
};

export const masonProgressService = {

    async saveSession(session: MasonSession): Promise<void> {
        try {
            const sessions = getLocalSessions(session.userId);
            sessions.push({
                id: crypto.randomUUID(),
                userId: session.userId,
                skillId: session.skillId,
                exerciseData: session.exerciseData,
                score: session.score,
                totalTime: session.totalTime,
                attempts: session.attempts,
                wrongMoves: session.wrongMoves,
                starsEarned: session.starsEarned,
                completedAt: new Date().toISOString()
            } as MasonSession);
            saveLocalSessions(session.userId, sessions);
        } catch (err) {
            console.error('Failed to save Mason session:', err);
            throw err;
        }
    },

    async getProgress(userId: string, skillId: string): Promise<WritingGymProgress | null> {
        const progress = getLocalProgress(userId);
        return progress.find(p => p.skill_id === skillId && p.level === 'mason') || null;
    },

    async updateProgress(
        userId: string,
        skillId: string,
        score: number,
        timeMs: number,
        starsEarned: number
    ): Promise<void> {
        const progress = getLocalProgress(userId);
        const existingIndex = progress.findIndex(p => p.skill_id === skillId && p.level === 'mason');

        const entry: WritingGymProgress = existingIndex >= 0 ? progress[existingIndex] : {
            id: crypto.randomUUID(),
            user_id: userId,
            level: 'mason',
            skill_id: skillId,
            exercises_completed: 0,
            best_score: 0,
            best_time_ms: 0,
            stars_earned: 0
        } as WritingGymProgress;

        entry.exercises_completed++;
        if (score > entry.best_score) entry.best_score = score;
        if (score > 0 && (!entry.best_time_ms || timeMs < entry.best_time_ms)) {
            entry.best_time_ms = timeMs;
        }
        entry.stars_earned = Math.max(entry.stars_earned || 0, starsEarned);

        if (existingIndex >= 0) {
            progress[existingIndex] = entry;
        } else {
            progress.push(entry);
        }
        saveLocalProgress(userId, progress);
    },

    async getAllProgress(userId: string): Promise<WritingGymProgress[]> {
        return getLocalProgress(userId);
    },

    async getRecentSessions(userId: string, limit: number = 10): Promise<MasonSession[]> {
        const sessions = getLocalSessions(userId);
        return sessions.sort((a, b) => 
            new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
        ).slice(0, limit);
    },

    async clearProgress(userId: string): Promise<void> {
        localStorage.removeItem(getSessionsKey(userId));
        localStorage.removeItem(getProgressKey(userId));
    },

    async getUnlockedSkillIds(userId: string): Promise<string[]> {
        const progress = getLocalProgress(userId);
        return progress
            .filter(p => p.stars_earned >= 3)
            .map(p => p.skill_id);
    },

    async getTotalStars(userId: string): Promise<number> {
        const progress = getLocalProgress(userId);
        return progress.reduce((sum, p) => sum + (p.stars_earned || 0), 0);
    }
};

export const getUnlockedSkillIds = (userId: string) => masonProgressService.getUnlockedSkillIds(userId);
export const getTotalStars = (userId: string) => masonProgressService.getTotalStars(userId);

export const getNextSkill = async (userId: string): Promise<string | null> => {
    const progress = getLocalProgress(userId);
    const completed = progress.filter(p => p.stars_earned >= 3).map(p => p.skill_id);
    if (completed.length === 0) return 'S01';
    return null;
};

export const syncMasonProgressToCloud = async (userId: string): Promise<void> => {
    const localProgress = getLocalProgress(userId);
    const localSessions = getLocalSessions(userId);
    
    try {
        await api.post('/mason-progress/sync', {
            progress: localProgress,
            sessions: localSessions.slice(0, 50),
        });
    } catch (error) {
        console.warn('[MasonProgress] Cloud sync failed:', error);
    }
};

export const fetchMasonProgressFromCloud = async (userId: string): Promise<{
    progress: WritingGymProgress[];
    sessions: MasonSession[];
} | null> => {
    try {
        const response = await api.get<{
            progress: WritingGymProgress[];
            sessions: MasonSession[];
        }>(`/mason-progress/${userId}`);
        return response.data || null;
    } catch {
        return null;
    }
};

export const mergeMasonProgress = async (userId: string): Promise<void> => {
    const cloudData = await fetchMasonProgressFromCloud(userId);
    if (!cloudData) return;
    
    const localProgress = getLocalProgress(userId);
    const localSessions = getLocalSessions(userId);
    
    const mergedProgress = [...localProgress];
    for (const cloudEntry of cloudData.progress) {
        const localIndex = mergedProgress.findIndex(
            p => p.skill_id === cloudEntry.skill_id && p.level === cloudEntry.level
        );
        if (localIndex >= 0) {
            if (cloudEntry.best_score > mergedProgress[localIndex].best_score) {
                mergedProgress[localIndex] = cloudEntry;
            } else if (cloudEntry.exercises_completed > mergedProgress[localIndex].exercises_completed) {
                mergedProgress[localIndex].exercises_completed = cloudEntry.exercises_completed;
            }
        } else {
            mergedProgress.push(cloudEntry);
        }
    }
    saveLocalProgress(userId, mergedProgress);
    
    const mergedSessions = [...localSessions, ...cloudData.sessions]
        .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
        .slice(0, 100);
    saveLocalSessions(userId, mergedSessions);
};

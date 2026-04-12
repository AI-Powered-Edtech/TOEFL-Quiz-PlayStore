import { WritingGymProgress, WritingGymLevel } from '../types';

export interface GymSession {
    userId: string;
    level: WritingGymLevel;
    skillId: string;
    score: number;
    totalTime: number;
    attempts: number;
    wrongMoves: number;
    starsEarned: number;
    exerciseData?: any;
}

const PROGRESS_KEY = 'writing_gym_progress_';

const getProgress = (userId: string): WritingGymProgress[] => {
    try {
        const stored = localStorage.getItem(`${PROGRESS_KEY}${userId}`);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveProgress = (userId: string, progress: WritingGymProgress[]): void => {
    localStorage.setItem(`${PROGRESS_KEY}${userId}`, JSON.stringify(progress));
};

export const writingGymProgressService = {

    async saveSession(session: GymSession): Promise<void> {
        const progress = getProgress(session.userId);
        const existingIndex = progress.findIndex(
            p => p.level === session.level && p.skill_id === session.skillId
        );

        const entry: WritingGymProgress = existingIndex >= 0 ? progress[existingIndex] : {
            id: crypto.randomUUID(),
            user_id: session.userId,
            level: session.level,
            skill_id: session.skillId,
            exercises_completed: 0,
            best_score: 0,
            best_time_ms: 0,
            stars_earned: 0
        };

        entry.exercises_completed++;
        if (session.score > entry.best_score) entry.best_score = session.score;
        if (session.totalTime > 0 && (!entry.best_time_ms || session.totalTime < entry.best_time_ms)) {
            entry.best_time_ms = session.totalTime;
        }
        entry.stars_earned = Math.max(entry.stars_earned || 0, session.starsEarned);

        if (existingIndex >= 0) {
            progress[existingIndex] = entry;
        } else {
            progress.push(entry);
        }

        saveProgress(session.userId, progress);
    },

    async getProgress(userId: string, level: WritingGymLevel): Promise<WritingGymProgress[]> {
        const progress = getProgress(userId);
        return progress.filter(p => p.level === level);
    },

    async getAllProgress(userId: string): Promise<WritingGymProgress[]> {
        return getProgress(userId);
    },

    async getAllLevelProgress(userId: string, level: WritingGymLevel): Promise<WritingGymProgress[]> {
        return this.getProgress(userId, level);
    },

    async updateProgress(
        userId: string, 
        level: WritingGymLevel, 
        skillId: string, 
        updates: Partial<WritingGymProgress> | number, 
        _timeMs?: number,
        _stars?: number
    ): Promise<void> {
        const progress = getProgress(userId);
        const existingIndex = progress.findIndex(
            p => p.level === level && p.skill_id === skillId
        );
        
        const updatesObj: Partial<WritingGymProgress> = typeof updates === 'number' 
            ? { best_score: updates, best_time_ms: _timeMs, stars: _stars }
            : updates;
        
        if (existingIndex >= 0) {
            progress[existingIndex] = { ...progress[existingIndex], ...updatesObj };
            saveProgress(userId, progress);
        }
    },

    async getLeaderboard(limit: number = 10): Promise<{ userId: string; score: number; username: string }[]> {
        const allProgress: { userId: string; score: number; username: string }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(PROGRESS_KEY)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '[]');
                    const totalScore = data.reduce((sum: number, p: WritingGymProgress) => sum + (p.best_score || 0), 0);
                    allProgress.push({ userId: key.replace(PROGRESS_KEY, ''), score: totalScore, username: 'User' });
                } catch { }
            }
        }
        return allProgress.sort((a, b) => b.score - a.score).slice(0, limit);
    },

    async clearProgress(userId: string): Promise<void> {
        localStorage.removeItem(`${PROGRESS_KEY}${userId}`);
    }
};

import { WritingGymProgress, WritingGymLevel } from '../types';
import api from './apiClient';

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

export const writingGymProgressService = {

    async saveSession(session: GymSession): Promise<void> {
        // Save the session details
        await api.post('/api/writing/sessions', {
            level: session.level,
            skill_id: session.skillId,
            best_score: session.score,
            status: 'completed',
            session_state: JSON.stringify(session.exerciseData || {})
        });

        // Fetch current progress to correctly update exercises_completed and best scores
        const currentProgressResponse = await api.get<WritingGymProgress[]>('/api/writing/progress');
        const currentProgress = currentProgressResponse.data || [];
        const existing = currentProgress.find(p => p.level === session.level && p.skill_id === session.skillId);

        const exercisesCompleted = (existing?.exercises_completed || 0) + 1;
        const starsEarned = Math.max(existing?.stars_earned || 0, session.starsEarned);
        const bestScore = Math.max(existing?.best_score || 0, session.score);
        
        let historyObj: any = existing?.history ? existing.history : {};
        if (typeof historyObj === 'string') {
            try { historyObj = JSON.parse(historyObj); } catch { historyObj = {}; }
        }
        
        // Save the progress
        await api.post('/api/writing/progress', {
            level: session.level,
            skill_id: session.skillId,
            exercises_completed: exercisesCompleted,
            stars_earned: starsEarned,
            history: JSON.stringify({ ...historyObj, best_score: bestScore })
        });
    },

    async getProgress(userId: string, level: WritingGymLevel): Promise<WritingGymProgress[]> {
        const response = await api.get<WritingGymProgress[]>('/api/writing/progress');
        const progress = response.data || [];
        return progress.filter(p => p.level === level);
    },

    async getAllProgress(userId: string): Promise<WritingGymProgress[]> {
        const response = await api.get<WritingGymProgress[]>('/api/writing/progress');
        return response.data || [];
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
        const currentProgressResponse = await api.get<WritingGymProgress[]>('/api/writing/progress');
        const currentProgress = currentProgressResponse.data || [];
        const existing = currentProgress.find(p => p.level === level && p.skill_id === skillId);

        let newStars = _stars || existing?.stars_earned || 0;
        let bestScore = existing?.best_score || 0;

        if (typeof updates === 'number') {
            bestScore = Math.max(bestScore, updates);
            if (_stars !== undefined) {
                newStars = Math.max(newStars, _stars);
            }
        } else {
            if (updates.stars_earned !== undefined) {
                newStars = Math.max(newStars, updates.stars_earned);
            }
            if (updates.best_score !== undefined) {
                bestScore = Math.max(bestScore, updates.best_score);
            }
        }

        let historyObj: any = existing?.history ? existing.history : {};
        if (typeof historyObj === 'string') {
            try { historyObj = JSON.parse(historyObj); } catch { historyObj = {}; }
        }

        await api.post('/api/writing/progress', {
            level,
            skill_id: skillId,
            exercises_completed: existing?.exercises_completed || 0,
            stars_earned: newStars,
            history: JSON.stringify({ ...historyObj, best_score: bestScore })
        });
    },

    async getLeaderboard(limit: number = 10): Promise<{ userId: string; score: number; username: string }[]> {
        // Without a specific backend endpoint for global leaderboard, we just return empty
        // The previous implementation used localStorage traversal which is not feasible with API
        return [];
    },

    async clearProgress(userId: string): Promise<void> {
        // No delete endpoint provided, so we leave it as a no-op
    }
};

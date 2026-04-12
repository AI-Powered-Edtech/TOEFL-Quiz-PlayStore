import { MASON_SKILLS } from '../data/masonSkills';
import { WritingGymProgress, WritingGymLevel, LeaderboardEntry } from '../types';

import { supabase } from './supabase';

// UUID validation — guest users don't have valid UUIDs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

export interface GymSession {
    userId: string;
    level: WritingGymLevel;
    skillId: string;
    score: number;
    totalTime: number;
    attempts: number; // or moves
    wrongMoves: number;
    starsEarned: number;
    exerciseData?: any; // Level specific data to replay/analyze
}

export const writingGymProgressService = {

    /**
     * Save a completed session
     */
    async saveSession(session: GymSession): Promise<void> {
        // Skip DB for guest/non-UUID users
        if (!isValidUUID(session.userId)) return;
        const { error } = await supabase
            .from('writing_gym_sessions')
            .insert({
                user_id: session.userId,
                level: session.level,
                skill_id: session.skillId,
                exercise_data: session.exerciseData,
                score: session.score,
                time_ms: session.totalTime,
                attempts: session.attempts,
                wrong_moves: session.wrongMoves,
                stars_earned: session.starsEarned
            });

        if (error) {
            console.error(`Failed to save ${session.level} session:`, error);
            throw error;
        }
    },

    /**
     * Get user progress for a specific skill and level
     */
    async getProgress(userId: string, level: WritingGymLevel, skillId: string): Promise<WritingGymProgress | null> {
        // Skip DB for guest/non-UUID users
        if (!isValidUUID(userId)) return null;
        const { data, error } = await supabase
            .from('writing_gym_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('level', level)
            .eq('skill_id', skillId)
            .limit(1);

        if (error) {
            console.error('Failed to fetch progress:', error);
            return null;
        }

        if (!data || data.length === 0) {
            return null;
        }

        return data[0];
    },

    /**
     * Update or create progress for a skill
     */
    async updateProgress(
        userId: string,
        level: WritingGymLevel,
        skillId: string,
        score: number,
        timeMs: number,
        starsEarned: number
    ): Promise<void> {
        // Skip DB for guest/non-UUID users
        if (!isValidUUID(userId)) return;
        const existing = await this.getProgress(userId, level, skillId);

        if (existing) {
            const updates: any = {
                exercises_completed: existing.exercises_completed + 1
            };

            if (score > existing.best_score) updates.best_score = score;
            if (score > 0 && (!existing.best_time_ms || timeMs < existing.best_time_ms)) updates.best_time_ms = timeMs;
            if (starsEarned > existing.stars_earned) updates.stars_earned = starsEarned;
            if (starsEarned >= 3 && !existing.completed_at) updates.completed_at = new Date().toISOString();

            const { error } = await supabase
                .from('writing_gym_progress')
                .update(updates)
                .eq('id', existing.id);

            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('writing_gym_progress')
                .insert({
                    user_id: userId,
                    level,
                    skill_id: skillId,
                    exercises_completed: 1,
                    exercises_total: 10, // Default target
                    stars_earned: starsEarned,
                    best_score: score,
                    best_time_ms: timeMs,
                    completed_at: starsEarned >= 3 ? new Date().toISOString() : null
                });

            if (error) throw error;
        }
    },

    /**
     * Get all progress for a level
     */
    async getAllLevelProgress(userId: string, level: WritingGymLevel): Promise<WritingGymProgress[]> {
        // Skip DB for guest/non-UUID users
        if (!isValidUUID(userId)) return [];
        const { data, error } = await supabase
            .from('writing_gym_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('level', level)
            .order('skill_id', { ascending: true });

        if (error) return [];
        return data || [];
    },

    /**
     * Get Leaderboard
     */
    async getLeaderboard(level: WritingGymLevel, skillId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
        // 1. Get raw progress data
        const { data: progressData, error: progressError } = await supabase
            .from('writing_gym_progress')
            .select('*')
            .eq('level', level)
            .eq('skill_id', skillId)
            .order('best_score', { ascending: false })
            .order('best_time_ms', { ascending: true })
            .limit(limit);

        if (progressError) {
            console.error('Failed to fetch leaderboard progress:', progressError);
            return [];
        }

        if (!progressData || progressData.length === 0) return [];

        // 2. Get user profiles for these entries
        const userIds = progressData.map((p: any) => p.user_id);
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

        if (profilesError) {
            console.warn('Failed to fetch profiles for leaderboard:', profilesError);
            // Continue with skeletons/defaults
        }

        // 3. Map profiles to a lookup object
        const profileMap = new Map();
        if (profiles) {
            profiles.forEach((p: any) => profileMap.set(p.id, p));
        }

        // 4. Combine data
        return progressData.map((entry: any, index: number) => {
            const profile = profileMap.get(entry.user_id);
            return {
                rank: index + 1,
                userId: entry.user_id,
                userName: profile?.full_name || 'Anonymous',
                avatarUrl: profile?.avatar_url,
                score: entry.best_score,
                timeMs: entry.best_time_ms,
                stars: entry.stars_earned
            };
        });
    },

    // ==================== HELPERS ====================

    async getUnlockedSkillIds(userId: string, level: WritingGymLevel): Promise<string[]> {
        const allProgress = await this.getAllLevelProgress(userId, level);
        const completedCount = allProgress.filter(p => p.stars_earned > 0).length;

        if (level === 'mason') {
            return MASON_SKILLS.filter(s => completedCount >= s.unlockAt).map(s => s.id);
        }

        // logic_weaver fallback (or define specific logic)
        // For now, assume a linear progression or all unlocked for Logic Weaver testing
        if (level === 'logic_weaver') {
            return ['S06', 'S07', 'S08']; // Example placeholders, ideally fetch from a LOGIC_WEAVER_SKILLS file
        }

        return [];
    },

    async getNextSkill(userId: string, level: WritingGymLevel): Promise<any | null> {
        const unlocked = await this.getUnlockedSkillIds(userId, level);
        const allProgress = await this.getAllLevelProgress(userId, level);

        // Mason Logic
        if (level === 'mason') {
            for (const skill of MASON_SKILLS) {
                if (unlocked.includes(skill.id)) {
                    const progress = allProgress.find(p => p.skill_id === skill.id);
                    if (!progress || progress.stars_earned === 0) return skill;
                }
            }
        }

        return null;
    }
};

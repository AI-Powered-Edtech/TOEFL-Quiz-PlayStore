import { WritingGymProgress, MasonSession, LeaderboardEntry } from '../types';

import { supabase } from './supabase';

/**
 * Service for persisting Mason Level progress and sessions to Supabase
 */
export const masonProgressService = {
    /**
     * Save a completed session to the database
     */
    async saveSession(session: MasonSession): Promise<void> {
        const { error } = await supabase
            .from('writing_gym_sessions')
            .insert({
                user_id: session.userId,
                level: 'mason',
                skill_id: session.skillId,
                exercise_data: session.exerciseData,
                score: session.score,
                time_ms: session.totalTime,
                attempts: session.attempts,
                wrong_moves: session.wrongMoves,
                stars_earned: session.starsEarned
            });

        if (error) {
            console.error('Failed to save Mason session:', error);
            throw error;
        }
    },

    /**
     * Get user progress for a specific skill
     */
    async getProgress(userId: string, skillId: string): Promise<WritingGymProgress | null> {
        const { data, error } = await supabase
            .from('writing_gym_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('level', 'mason')
            .eq('skill_id', skillId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('Failed to fetch progress:', error);
            return null;
        }

        return data;
    },

    /**
     * Update or create progress for a skill
     */
    async updateProgress(
        userId: string,
        skillId: string,
        score: number,
        timeMs: number,
        starsEarned: number
    ): Promise<void> {
        // First, try to get existing progress
        const existing = await this.getProgress(userId, skillId);

        if (existing) {
            // Update existing record
            const updates: any = {
                exercises_completed: existing.exercises_completed + 1
            };

            // Update best score if better
            if (score > existing.best_score) {
                updates.best_score = score;
            }

            // Update best time if faster (and score is good)
            if (score > 0 && (!existing.best_time_ms || timeMs < existing.best_time_ms)) {
                updates.best_time_ms = timeMs;
            }

            // Update stars if better
            if (starsEarned > existing.stars_earned) {
                updates.stars_earned = starsEarned;
            }

            // Mark as completed if reached 3 stars
            if (starsEarned === 3 && !existing.completed_at) {
                updates.completed_at = new Date().toISOString();
            }

            const { error } = await supabase
                .from('writing_gym_progress')
                .update(updates)
                .eq('id', existing.id);

            if (error) {
                console.error('Failed to update progress:', error);
                throw error;
            }
        } else {
            // Create new progress record
            const { error } = await supabase
                .from('writing_gym_progress')
                .insert({
                    user_id: userId,
                    level: 'mason',
                    skill_id: skillId,
                    exercises_completed: 1,
                    exercises_total: 10,
                    stars_earned: starsEarned,
                    best_score: score,
                    best_time_ms: timeMs,
                    completed_at: starsEarned === 3 ? new Date().toISOString() : null
                });

            if (error) {
                console.error('Failed to create progress:', error);
                throw error;
            }
        }
    },

    /**
     * Get all progress for Mason level
     */
    async getAllProgress(userId: string): Promise<WritingGymProgress[]> {
        const { data, error } = await supabase
            .from('writing_gym_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('level', 'mason')
            .order('skill_id', { ascending: true });

        if (error) {
            console.error('Failed to fetch all progress:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get leaderboard for a specific skill
     */
    async getLeaderboard(skillId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
        // 1. Get raw progress data
        const { data: progressData, error: progressError } = await supabase
            .from('writing_gym_progress')
            .select('*')
            .eq('level', 'mason')
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
        const userIds = progressData.map(p => p.user_id);
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
            profiles.forEach(p => profileMap.set(p.id, p));
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

    /**
     * Get user's rank for a specific skill
     */
    async getUserRank(userId: string, skillId: string): Promise<number | null> {
        const leaderboard = await this.getLeaderboard(skillId, 100);
        const userEntry = leaderboard.find(entry => entry.userId === userId);
        return userEntry?.rank || null;
    }
};

/**
 * Get list of unlocked skill IDs for a user
 * Rule: Skill N is unlocked when skills 1 to N-1 have at least 1 star each
 */
export async function getUnlockedSkillIds(userId: string): Promise<string[]> {
    const allProgress = await masonProgressService.getAllProgress(userId);
    const { MASON_SKILLS } = await import('../data/masonSkills');

    const completedCount = allProgress.filter(p => p.stars_earned > 0).length;

    return MASON_SKILLS
        .filter(skill => completedCount >= skill.unlockAt)
        .map(skill => skill.id);
}

/**
 * Get the next skill user should work on
 * Returns first unlocked skill with 0 stars, or null if all complete
 */
export async function getNextSkill(userId: string): Promise<any | null> {
    const unlocked = await getUnlockedSkillIds(userId);
    const allProgress = await masonProgressService.getAllProgress(userId);
    const { MASON_SKILLS } = await import('../data/masonSkills');

    for (const skill of MASON_SKILLS) {
        if (unlocked.includes(skill.id)) {
            const progress = allProgress.find(p => p.skill_id === skill.id);
            if (!progress || progress.stars_earned === 0) {
                return skill; // First unlocked with no stars
            }
        }
    }

    return null; // All complete!
}

/**
 * Get total stars earned across all Mason skills
 */
export async function getTotalStars(userId: string): Promise<number> {
    const allProgress = await masonProgressService.getAllProgress(userId);
    return allProgress.reduce((sum, p) => sum + p.stars_earned, 0);
}

/**
 * Generalized save progress function for any writing gym level
 */
export async function saveProgress(
    userId: string,
    level: string,
    skillId: string,
    starsEarned: number,
    score: number
): Promise<void> {
    const { data: existing } = await supabase
        .from('writing_gym_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('level', level)
        .eq('skill_id', skillId)
        .single();

    if (existing) {
        const updates: any = {
            exercises_completed: (existing.exercises_completed || 0) + 1
        };
        if (score > (existing.best_score || 0)) updates.best_score = score;
        if (starsEarned > (existing.stars_earned || 0)) updates.stars_earned = starsEarned;
        if (starsEarned >= 3 && !existing.completed_at) updates.completed_at = new Date().toISOString();

        await supabase
            .from('writing_gym_progress')
            .update(updates)
            .eq('id', existing.id);
    } else {
        await supabase
            .from('writing_gym_progress')
            .insert({
                user_id: userId,
                level,
                skill_id: skillId,
                exercises_completed: 1,
                exercises_total: 10,
                stars_earned: starsEarned,
                best_score: score,
                completed_at: starsEarned >= 3 ? new Date().toISOString() : null
            });
    }
}

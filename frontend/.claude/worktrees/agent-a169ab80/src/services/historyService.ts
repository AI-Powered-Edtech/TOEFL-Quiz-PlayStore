import { QuizResult, UserProgress } from '../types';

import { supabase } from './supabase';
import { syncQueueService } from './syncQueueService';

const HISTORY_KEY = 'streamquiz_history_v1';

// CHANGED: Reset Initial Progress to ZERO for Real DB Mode
// User starts fresh. Stats are built purely from DB records.
const INITIAL_PROGRESS: UserProgress = {
    completedSkills: 0,
    totalSkills: 60, // Total available TOEFL skills
    streak: 0,
    level: 1,
    xp: 0,
    currentStreak: 0,
    totalQuizzes: 0,
    totalCorrect: 0,
    unlockedBadges: []
};

/**
 * Saves a completed quiz result to Supabase
 */
export const saveQuizResult = async (result: Omit<QuizResult, 'id'>, userId?: string): Promise<QuizResult | null> => {
    // 1. Prepare data for DB (Snake Case Mapping)
    const dbPayload = {
        user_id: userId || null,
        user_name: result.userName,
        date: result.date,
        topic: result.topic,
        skill_id: result.skillId,
        section: result.section,
        score: result.score,
        correct_count: result.correctCount,
        total_questions: result.totalQuestions,
        xp_earned: result.xpEarned
    };

    // 2. Insert into Supabase
    const { data, error } = await supabase
        .from('quiz_results')
        .insert([dbPayload])
        .select()
        .single();

    if (error) {
        console.error('[HistoryService] Failed to save result to Supabase:', error);
        // Fallback: Save to localStorage if DB fails
        const fallbackId = crypto.randomUUID();
        const localRecord = { ...result, id: fallbackId };
        const history = getLocalHistory();
        localStorage.setItem(HISTORY_KEY, JSON.stringify([localRecord, ...history]));

        // NEW: Queue for background sync when online
        await syncQueueService.enqueue('saveQuizResult', dbPayload, userId);

        return localRecord;
    }

    // Map back snake_case to CamelCase for App usage
    return {
        id: data.id,
        userName: data.user_name,
        date: data.date,
        topic: data.topic,
        skillId: data.skill_id,
        section: data.section,
        score: data.score,
        correctCount: data.correct_count,
        totalQuestions: data.total_questions,
        xpEarned: data.xp_earned
    };
};

/**
 * Helper for Local Storage Fallback
 */
const getLocalHistory = (): QuizResult[] => {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
};

/**
 * Retrieves global leaderboard from Supabase
 */
export const getGlobalLeaderboard = async (): Promise<QuizResult[]> => {
    const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .order('score', { ascending: false })
        .limit(50);

    if (error) {
        // Ignore AbortError caused by React Strict Mode or navigation
        if (error?.name !== 'AbortError' && !error?.message?.includes('Fetch is aborted')) {
            console.error('[HistoryService] Failed to fetch leaderboard:', error);
        }
        return getLocalHistory(); // Return local as fallback
    }

    // Map to App Type
    return data.map((d: any) => ({
        id: d.id,
        userName: d.user_name,
        date: d.date,
        topic: d.topic,
        skillId: d.skill_id,
        section: d.section,
        score: d.score,
        correctCount: d.correct_count,
        totalQuestions: d.total_questions,
        xpEarned: d.xp_earned
    }));
};

/**
 * Calculates aggregated UserProgress from Real Database.
 */
export const calculateUserProgress = async (): Promise<UserProgress> => {
    // Fetch user history from Supabase
    // Ideally filter by user_id, here we fetch recent 500 records for stats
    const { data, error } = await supabase
        .from('quiz_results')
        .select('*')
        .order('date', { ascending: false })
        .limit(500);

    let history: QuizResult[] = [];

    if (error || !data) {
        // Ignore AbortError caused by React Strict Mode or navigation
        if (error?.name !== 'AbortError' && !error?.message?.includes('Fetch is aborted')) {
            console.warn('[HistoryService] DB Error or Empty. Using local fallback.');
        }
        history = getLocalHistory();
    } else {
        history = data.map((d: any) => ({
            id: d.id,
            userName: d.user_name,
            date: d.date,
            topic: d.topic,
            skillId: d.skill_id,
            section: d.section,
            score: d.score,
            correctCount: d.correct_count,
            totalQuestions: d.total_questions,
            xpEarned: d.xp_earned
        }));
    }

    // Calculate Real Stats
    if (history.length === 0) return INITIAL_PROGRESS;

    const totalQuizzes = history.length;
    const totalCorrect = history.reduce((acc, curr) => acc + curr.correctCount, 0);
    const totalXP = history.reduce((acc, curr) => acc + curr.xpEarned, 0);

    // Level Calculation: 1 Level per 500 XP
    const level = Math.floor(totalXP / 500) + 1;

    // Unique Skills Mastered
    const uniqueSkills = new Set(history.filter(h => h.skillId).map(h => h.skillId));

    // Simple Streak Calculation (Consecutive days with activity)
    // This is a basic implementation.
    let currentStreak = 0;
    if (history.length > 0) {
        const today = new Date().toDateString();
        const lastActivity = new Date(history[0].date).toDateString();
        if (today === lastActivity) currentStreak = 1;
        // Logic for deeper streak calculation would go here
    }

    return {
        completedSkills: uniqueSkills.size,
        totalSkills: 60, // Fixed total for TOEFL
        streak: currentStreak,
        level: level,
        xp: totalXP,
        currentStreak: currentStreak,
        totalQuizzes: totalQuizzes,
        totalCorrect: totalCorrect,
        unlockedBadges: level > 1 ? ['first_steps'] : []
    };
};

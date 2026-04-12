import { QuizResult, UserProgress } from '../types';

import { quizService } from './quiz';
import { syncQueueService } from './syncQueueService';

const HISTORY_KEY = 'streamquiz_history_v1';

const INITIAL_PROGRESS: UserProgress = {
    completedSkills: 0,
    totalSkills: 60,
    streak: 0,
    level: 1,
    xp: 0,
    currentStreak: 0,
    totalQuizzes: 0,
    totalCorrect: 0,
    unlockedBadges: []
};

interface LocalQuizResult {
    id: string;
    userName: string;
    date: string;
    topic?: string;
    skillId?: string;
    section: string;
    score: number;
    correctCount: number;
    totalQuestions: number;
    xpEarned: number;
}

const getLocalHistory = (): QuizResult[] => {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return parsed.map((d: LocalQuizResult) => ({
            id: d.id,
            userName: d.userName,
            date: d.date,
            topic: d.topic,
            skillId: d.skillId,
            section: d.section,
            score: d.score,
            correctCount: d.correctCount,
            totalQuestions: d.totalQuestions,
            xpEarned: d.xpEarned
        }));
    } catch {
        return [];
    }
};

export const getHistory = async (): Promise<QuizResult[]> => {
    try {
        const history = await quizService.history();
        return history.map(h => ({
            id: h.id,
            userName: 'User',
            date: h.date,
            topic: h.section,
            skillId: h.skill_id ? Number(h.skill_id) : undefined,
            section: h.section,
            score: h.score,
            correctCount: h.correct_count,
            totalQuestions: h.total_questions,
            xpEarned: h.xp_earned
        }));
    } catch (error) {
        console.warn('[HistoryService] Failed to fetch history from API, using local:', error);
        return getLocalHistory();
    }
};

export const saveQuizResult = async (result: QuizResult, userId?: string): Promise<void> => {
    try {
        const apiResult = await quizService.saveResult({
            skill_id: result.skillId !== undefined 
                ? (typeof result.skillId === 'string' ? parseInt(result.skillId, 10) : result.skillId) 
                : 0,
            section: result.section,
            score: result.score,
            correct_count: result.correctCount,
            total_questions: result.totalQuestions
        });
        
        if (!apiResult.ok) {
            console.warn('[HistoryService] Failed to save to API:', apiResult.error);
            syncQueueService.enqueue('saveQuizResult', result);
        }
    } catch (error) {
        console.warn('[HistoryService] Error saving result, queued for sync:', error);
        syncQueueService.enqueue('saveQuizResult', result);
    }
};

export const calculateUserProgress = async (): Promise<UserProgress> => {
    try {
        const progress = await quizService.progress();
        
        if (progress) {
            return {
                completedSkills: progress.unique_skills || 0,
                totalSkills: 60,
                streak: 0,
                level: progress.level || 1,
                xp: progress.total_xp || 0,
                currentStreak: 0,
                totalQuizzes: progress.total_quizzes || 0,
                totalCorrect: progress.total_correct || 0,
                unlockedBadges: progress.level > 1 ? ['first_steps'] : []
            };
        }
    } catch (error) {
        console.warn('[HistoryService] Failed to get progress from API, using local fallback:', error);
    }

    const localHistory = getLocalHistory();
    if (localHistory.length === 0) return INITIAL_PROGRESS;

    const totalQuizzes = localHistory.length;
    const totalCorrect = localHistory.reduce((acc, curr) => acc + curr.correctCount, 0);
    const totalXP = localHistory.reduce((acc, curr) => acc + curr.xpEarned, 0);
    const level = Math.floor(totalXP / 500) + 1;
    const uniqueSkills = new Set(localHistory.filter(h => h.skillId).map(h => h.skillId));

    return {
        completedSkills: uniqueSkills.size,
        totalSkills: 60,
        streak: 0,
        level: level,
        xp: totalXP,
        currentStreak: 0,
        totalQuizzes: totalQuizzes,
        totalCorrect: totalCorrect,
        unlockedBadges: level > 1 ? ['first_steps'] : []
    };
};

export const getGlobalLeaderboard = async (): Promise<QuizResult[]> => {
    try {
        const history = getLocalHistory();
        const sorted = history
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);
        return sorted.map((h, idx) => ({
            ...h,
            topic: h.topic || 'General',
            skillId: h.skillId
        }));
    } catch {
        return [];
    }
};
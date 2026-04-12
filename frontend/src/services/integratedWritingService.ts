/**
 * Integrated Writing Service
 * Handles AI generation, session management, and evaluation for TOEFL Integrated Writing
 */

import { jsonrepair } from 'jsonrepair';

import { Achievement } from '../components/peerReview/AchievementNotification';
import { IW_ACHIEVEMENTS, IWUserStats } from '../data/integratedWritingAchievements';
import {
    IntegratedWritingTask,
    IntegratedWritingSession,
    IntegratedWritingEvaluation,
    IntegratedWritingCategory
} from '../types';

import { callGroq, cleanJson } from './groq/client';
import {
    getIntegratedWritingTaskPrompt,
    getIntegratedWritingEvaluationPrompt
} from './groq/prompts/integratedWritingPrompts';

const IW_SESSIONS_KEY = 'integrated_writing_sessions_';
const IW_ACHIEVEMENTS_KEY = 'integrated_writing_achievements_';

const getSessionsKey = (userId: string): string => `${IW_SESSIONS_KEY}${userId}`;
const getAchievementsKey = (userId: string): string => `${IW_ACHIEVEMENTS_KEY}${userId}`;

const getLocalSessions = (userId: string): IntegratedWritingSession[] => {
    try {
        const stored = localStorage.getItem(getSessionsKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalSessions = (userId: string, sessions: IntegratedWritingSession[]): void => {
    localStorage.setItem(getSessionsKey(userId), JSON.stringify(sessions));
};

const getLocalAchievements = (userId: string): string[] => {
    try {
        const stored = localStorage.getItem(getAchievementsKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalAchievements = (userId: string, achievements: string[]): void => {
    localStorage.setItem(getAchievementsKey(userId), JSON.stringify(achievements));
};

export const integratedWritingService = {

    async generateTask(category?: IntegratedWritingCategory): Promise<IntegratedWritingTask> {
        try {
            const prompt = getIntegratedWritingTaskPrompt(category);

            const response = await callGroq([
                { role: 'user', content: prompt }
            ], 0.7, { jsonMode: true });

            const cleaned = cleanJson(response);
            let parsed;

            try {
                parsed = JSON.parse(cleaned);
            } catch {
                const repaired = jsonrepair(cleaned);
                parsed = JSON.parse(repaired);
            }

            if (!parsed.reading_passage?.content || !parsed.lecture?.transcript) {
                throw new Error('Invalid task structure from AI');
            }

            return {
                id: crypto.randomUUID(),
                topic: parsed.topic || 'Academic Topic',
                category: parsed.category || 'science',
                reading_passage: {
                    title: parsed.reading_passage.title || 'Reading Passage',
                    content: parsed.reading_passage.content,
                    word_count: parsed.reading_passage.word_count || parsed.reading_passage.content.split(/\s+/).length,
                    key_points: parsed.reading_passage.key_points || []
                },
                lecture: {
                    transcript: parsed.lecture.transcript,
                    key_counterpoints: parsed.lecture.key_counterpoints || []
                },
                sample_response: parsed.sample_response,
                difficulty: parsed.difficulty || 3,
                created_at: new Date().toISOString()
            };

        } catch (error) {
            console.error('AI task generation failed:', error);
            throw new Error('Failed to generate writing task. Please try again.');
        }
    },

    async evaluateEssay(
        readingPassage: string,
        lectureTranscript: string,
        userEssay: string
    ): Promise<IntegratedWritingEvaluation> {
        try {
            const prompt = getIntegratedWritingEvaluationPrompt(
                readingPassage,
                lectureTranscript,
                userEssay
            );

            const response = await callGroq([
                { role: 'user', content: prompt }
            ], 0.3, { jsonMode: true });

            const cleaned = cleanJson(response);
            let parsed;

            try {
                parsed = JSON.parse(cleaned);
            } catch {
                const repaired = jsonrepair(cleaned);
                parsed = JSON.parse(repaired);
            }

            return {
                overall_score: parsed.overall_score || 3,
                task_development: parsed.task_development || 3,
                organization: parsed.organization || 3,
                language_use: parsed.language_use || 3,
                strengths: parsed.strengths || ['Essay submitted successfully'],
                improvements: parsed.improvements || []
            };

        } catch (error) {
            console.error('AI evaluation failed:', error);
            throw new Error('AI evaluation temporarily unavailable. Please try again later.');
        }
    },

    async saveSession(session: Omit<IntegratedWritingSession, 'id' | 'created_at'>): Promise<void> {
        try {
            if (!session.user_id) return;

            const sessions = getLocalSessions(session.user_id);
            const newSession: IntegratedWritingSession = {
                ...session,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString()
            } as IntegratedWritingSession;

            sessions.unshift(newSession);
            if (sessions.length > 50) {
                sessions.splice(50);
            }

            saveLocalSessions(session.user_id, sessions);
        } catch (err) {
            console.error('Failed to save integrated writing session:', err);
            throw err;
        }
    },

    async getHistory(userId: string): Promise<IntegratedWritingSession[]> {
        const sessions = getLocalSessions(userId);
        return sessions.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 20);
    },

    async getUserStats(userId: string): Promise<IWUserStats> {
        const sessions = getLocalSessions(userId);
        const unlockedAchievements = getLocalAchievements(userId);

        const history = sessions;
        const scores = history.map((s) => s.evaluation?.overall_score || 0);
        const uniqueTopics = new Set(history.map((s) => s.task_id)).size;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < history.length; i++) {
            const sessionDate = new Date(history[i].created_at);
            sessionDate.setHours(0, 0, 0, 0);
            const expectedDate = new Date(today);
            expectedDate.setDate(today.getDate() - i);

            if (sessionDate.getTime() === expectedDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return {
            totalCompleted: history.length,
            lastScore: scores[0] || 0,
            highestScore: Math.max(...scores, 0),
            streak,
            uniqueTopics,
            averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
            timeRemaining: 0,
            unlockedAchievements
        };
    },

    async checkAchievements(
        userId: string,
        score: number,
        timeRemaining: number
    ): Promise<Achievement[]> {
        const stats = await this.getUserStats(userId);
        stats.timeRemaining = timeRemaining;
        stats.lastScore = score;
        stats.totalCompleted++;

        const earned: Achievement[] = [];
        const currentAchievements = getLocalAchievements(userId);

        for (const [key, achievement] of Object.entries(IW_ACHIEVEMENTS)) {
            if (!currentAchievements.includes(achievement.id)) {
                if (achievement.condition(stats)) {
                    earned.push({
                        id: achievement.id,
                        type: achievement.type,
                        title: achievement.title,
                        message: achievement.message,
                        xp: achievement.xp
                    });

                    currentAchievements.push(achievement.id);
                    saveLocalAchievements(userId, currentAchievements);
                }
            }
        }

        return earned;
    }
};

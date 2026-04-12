/**
 * Integrated Writing Service
 * Handles AI generation, session management, and evaluation for TOEFL Integrated Writing
 */

import { jsonrepair } from 'jsonrepair';

import { Achievement } from '../components/peerReview/AchievementNotification';
import { IW_ACHIEVEMENTS, IWUserStats, calculateSessionXP } from '../data/integratedWritingAchievements';
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
import { supabase } from './supabase';
import { generateAudio, getAudioElement } from './ttsService';


export const integratedWritingService = {

    /**
     * Generate a new Integrated Writing task with AI
     */
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

            // Validate required fields
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


    /**
     * Evaluate user essay using TOEFL rubric
     */
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

    /**
     * Save user session to database
     */
    async saveSession(session: Omit<IntegratedWritingSession, 'id' | 'created_at'>): Promise<void> {
        const { error } = await supabase
            .from('integrated_writing_sessions')
            .insert({
                user_id: session.user_id || null,
                task_id: session.task_id || null,
                reading_passage: session.reading_passage,
                lecture_summary: session.lecture_summary,
                user_notes: session.user_notes,
                user_essay: session.user_essay,
                word_count: session.word_count,
                phase_durations: session.phase_durations,
                evaluation: session.evaluation,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('Failed to save integrated writing session:', error);
            throw error;
        }

        // Note: Base XP for completing the essay is now handled entirely
        // by the backend database trigger `update_profile_xp_from_iw`
        // to prevent double XP awards.
        // Bonus XP for high scores is still awarded here.
        if (session.user_id) {
            const bonusXP = session.evaluation.overall_score >= 4 ? 25 + (session.evaluation.overall_score >= 5 ? 25 : 0) : 0;

            if (bonusXP > 0) {
                const { error: xpError } = await supabase.rpc('increment_xp', {
                    user_id_param: session.user_id,
                    amount: bonusXP
                });

                if (xpError) {
                    console.error('[Integrated Writing] Failed to award bonus XP via backend increment_xp RPC', xpError);
                }
            }
        }
    },

    /**
     * Generate TTS audio for lecture transcript
     */
    async generateLectureAudio(lectureTranscript: string): Promise<string> {
        try {
            console.log('[Integrated Writing] Generating lecture audio...');
            const audioId = await generateAudio(lectureTranscript);
            console.log('[Integrated Writing] Audio generated:', audioId);
            return audioId;
        } catch (error) {
            console.error('Failed to generate lecture audio:', error);
            throw error;
        }
    },

    /**
     * Get audio element by ID
     */
    getAudio(audioId: string): HTMLAudioElement | null {
        return getAudioElement(audioId);
    },

    /**
     * Get user's session history
     */
    async getHistory(userId: string): Promise<IntegratedWritingSession[]> {
        const { data, error } = await supabase
            .from('integrated_writing_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Failed to fetch session history:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get user's stats for achievement checking
     */
    async getUserStats(userId: string): Promise<IWUserStats> {
        const { data: sessions } = await supabase
            .from('integrated_writing_sessions')
            .select('evaluation, created_at, task_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        const { data: achievements } = await supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', userId)
            .eq('feature', 'integrated_writing');

        const history = sessions || [];
        const scores = history.map((s: any) => s.evaluation?.overall_score || 0);
        const uniqueTopics = new Set(history.map((s: any) => s.task_id)).size;

        // Calculate streak (consecutive days)
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
            averageScore: scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0,
            timeRemaining: 0, // Will be set by caller
            unlockedAchievements: (achievements || []).map((a: any) => a.achievement_id)
        };
    },

    /**
     * Check and unlock achievements after completing a task
     */
    async checkAchievements(
        userId: string,
        score: number,
        timeRemaining: number
    ): Promise<Achievement[]> {
        const stats = await this.getUserStats(userId);
        stats.timeRemaining = timeRemaining;
        stats.lastScore = score;
        stats.totalCompleted++; // Include current session

        const earned: Achievement[] = [];

        for (const [key, achievement] of Object.entries(IW_ACHIEVEMENTS)) {
            if (!stats.unlockedAchievements.includes(achievement.id)) {
                if (achievement.condition(stats)) {
                    earned.push({
                        id: achievement.id,
                        type: achievement.type,
                        title: achievement.title,
                        message: achievement.message,
                        xp: achievement.xp
                    });

                    // Save achievement to database
                    await supabase.from('user_achievements').insert({
                        user_id: userId,
                        achievement_id: achievement.id,
                        feature: 'integrated_writing',
                        xp_earned: achievement.xp || 0,
                        created_at: new Date().toISOString()
                    });

                    // Award XP for achievement
                    if (achievement.xp) {
                        await supabase.rpc('increment_xp', {
                            user_id_param: userId,
                            amount: achievement.xp
                        });
                    }
                }
            }
        }

        return earned;
    }
};

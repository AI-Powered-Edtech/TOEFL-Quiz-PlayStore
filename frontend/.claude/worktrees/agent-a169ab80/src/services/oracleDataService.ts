/**
 * Score Oracle - Data Aggregation Service
 * Collects and aggregates user performance data from all sources
 * 
 * Tables used:
 * - quiz_results: section, correct_count, total_questions, date (user_id uuid | user_name text)
 * - writing_gym_progress: level, stars_earned, best_score, updated_at (user_id uuid)
 * - writing_gym_sessions: level, score, stars_earned, completed_at (user_id uuid)
 * - integrated_writing_sessions: evaluation jsonb, created_at (user_id uuid)
 * - devils_advocate_sessions: score, created_at (user_id uuid)
 */

import { AggregatedOracleData } from '../types';
import { withTimeout } from '../utils/promiseTimeout';

import { supabase } from './supabase';

/** Check if a string is a valid UUID (non-guest users) */
function isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export const oracleDataService = {

    /**
     * Aggregate all user performance data
     */
    async aggregateUserData(userId: string): Promise<AggregatedOracleData> {
        const [quizData, gymData, essayData] = await withTimeout(
            Promise.all([
                this.getQuizPerformance(userId),
                this.getWritingGymPerformance(userId),
                this.getEssayPerformance(userId),
            ]),
            15000,
            'Oracle Aggregation'
        );

        const totalActivities =
            quizData.listening.total + quizData.reading.total +
            quizData.structure.total + quizData.written.total +
            gymData.total_exercises + essayData.total_submissions;

        const dates = [quizData.lastDate, gymData.lastDate, essayData.lastDate].filter(Boolean);
        const lastActivityDate = dates.length > 0
            ? dates.sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0]!
            : null;

        return {
            quizzes: {
                listening: quizData.listening,
                reading: quizData.reading,
                structure: quizData.structure,
                written: quizData.written,
            },
            writingGym: {
                mason_avg_stars: gymData.mason_avg_stars,
                logic_weaver_avg_stars: gymData.logic_weaver_avg_stars,
                total_exercises: gymData.total_exercises,
            },
            essays: {
                integrated_avg_score: essayData.integrated_avg_score,
                ielts_avg_band: essayData.ielts_avg_band,
                total_submissions: essayData.total_submissions,
            },
            totalActivities,
            lastActivityDate,

            // New Stats
            totalQuizzes: quizData.count,
            totalCorrect: quizData.totalCorrect,
            quizDates: quizData.dates,
            gymDates: [gymData.lastDate].filter(d => !!d) as string[], // gymData only returns lastDate currently
            essayDates: [essayData.lastDate].filter(d => !!d) as string[],
        };
    },

    /**
     * Quiz performance by section  
     * quiz_results columns: section, correct_count, total_questions, date, user_id(uuid), user_name(text)
     */
    async getQuizPerformance(userId: string) {
        const sections = {
            listening: { correct: 0, total: 0 },
            reading: { correct: 0, total: 0 },
            structure: { correct: 0, total: 0 },
            written: { correct: 0, total: 0 },
        };
        let lastDate: string | null = null;
        let count = 0;
        let totalCorrect = 0;
        const dates: string[] = [];

        try {
            // quiz_results supports both uuid user_id and text user_name
            // For uuid users: filter by user_id; for guest: filter by user_name
            let query = supabase
                .from('quiz_results')
                .select('section, correct_count, total_questions, date')
                .order('date', { ascending: false })
                .limit(100); // Optimization: analyze last 100 quizzes (Moving Average)

            if (isValidUUID(userId)) {
                query = query.eq('user_id', userId);
            } else {
                query = query.eq('user_name', userId);
            }

            const { data, error } = await query;

            if (!error && data) {
                if (data.length > 0) lastDate = data[0].date;

                for (const row of data) {
                    count++; // Count each quiz attempt
                    if (row.date) dates.push(row.date);
                    const sec = row.section?.toLowerCase() as keyof typeof sections;
                    if (sec && sections[sec]) {
                        sections[sec].correct += row.correct_count || 0;
                        sections[sec].total += row.total_questions || 0;
                        totalCorrect += row.correct_count || 0;
                    }
                }
            }
        } catch (e) {
            console.error('Oracle: Failed to fetch quiz data', e);
        }

        return { ...sections, lastDate, count, totalCorrect, dates };
    },

    /**
     * Writing gym performance from writing_gym_progress + writing_gym_sessions
     * writing_gym_progress columns: level, stars_earned, best_score, updated_at, user_id(uuid)
     * writing_gym_sessions columns: level, score, stars_earned, completed_at, user_id(uuid)
     */
    async getWritingGymPerformance(userId: string) {
        const result = {
            mason_avg_stars: 0,
            logic_weaver_avg_stars: 0,
            total_exercises: 0,
            lastDate: null as string | null,
        };

        // writing_gym tables require uuid - skip for guest users
        if (!isValidUUID(userId)) return result;

        try {
            // Get progress records
            const { data, error } = await supabase
                .from('writing_gym_progress')
                .select('level, stars_earned, updated_at')
                .eq('user_id', userId)
                .limit(50);

            if (!error && data && data.length > 0) {
                const mason = data.filter(d => d.level === 'mason');
                const logic = data.filter(d => d.level === 'logic_weaver');
                if (mason.length > 0) {
                    result.mason_avg_stars = mason.reduce((sum, d) => sum + (d.stars_earned || 0), 0) / mason.length;
                }
                if (logic.length > 0) {
                    result.logic_weaver_avg_stars = logic.reduce((sum, d) => sum + (d.stars_earned || 0), 0) / logic.length;
                }

                result.total_exercises = data.length;

                const dates = data.map(d => d.updated_at).filter(Boolean).sort().reverse();
                if (dates.length > 0) result.lastDate = dates[0];
            }

            // Also count session records
            const { data: sessions } = await supabase
                .from('writing_gym_sessions')
                .select('completed_at')
                .eq('user_id', userId)
                .limit(50);

            if (sessions) {
                result.total_exercises += sessions.length;
                if (sessions.length > 0) {
                    const sessionDates = sessions.map(s => s.completed_at).filter(Boolean).sort().reverse();
                    if (sessionDates[0] && (!result.lastDate || sessionDates[0] > result.lastDate)) {
                        result.lastDate = sessionDates[0];
                    }
                }
            }
        } catch (e) {
            console.error('Oracle: Failed to fetch writing gym data', e);
        }

        return result;
    },

    /**
     * Essay performance from integrated_writing_sessions + devils_advocate_sessions
     * integrated_writing_sessions: evaluation(jsonb), created_at, user_id(uuid)
     * devils_advocate_sessions: score(int), created_at, user_id(uuid)
     */
    async getEssayPerformance(userId: string) {
        const result = {
            integrated_avg_score: 0,
            ielts_avg_band: 0,
            total_submissions: 0,
            lastDate: null as string | null,
        };

        // These tables require uuid - skip for guest users
        if (!isValidUUID(userId)) return result;

        try {
            // Integrated writing sessions (has evaluation JSONB with scores)
            const { data: essayData } = await supabase
                .from('integrated_writing_sessions')
                .select('evaluation, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (essayData && essayData.length > 0) {
                result.total_submissions += essayData.length;
                result.lastDate = essayData[0]?.created_at || null;

                // Extract scores from evaluation JSONB
                const scores: number[] = [];
                for (const row of essayData) {
                    const evaluation = row.evaluation as Record<string, any> | null;
                    if (evaluation) {
                        // Try to extract overall score from evaluation object
                        const score = evaluation.overall_score || evaluation.score || evaluation.total_score || 0;
                        if (score > 0) scores.push(score);
                    }
                }
                if (scores.length > 0) {
                    result.integrated_avg_score = scores.reduce((a, b) => a + b, 0) / scores.length;
                    // Normalize to 0-5 scale if score is on different scales
                    if (result.integrated_avg_score > 5) {
                        result.integrated_avg_score = (result.integrated_avg_score / 30) * 5; // IBT writing 0-30 → 0-5
                    }
                }
            }
        } catch (e) {
            console.error('Oracle: Failed to fetch integrated writing data', e);
        }

        try {
            // Devils advocate sessions (has score integer)
            const { data: advocateData } = await supabase
                .from('devils_advocate_sessions')
                .select('score, created_at')
                .eq('user_id', userId)
                .not('score', 'is', null)
                .order('created_at', { ascending: false })
                .limit(20);

            if (advocateData && advocateData.length > 0) {
                const avgScore = advocateData.reduce((sum, d) => sum + (d.score || 0), 0) / advocateData.length;
                // Devil's advocate score is 0-100, use as writing proxy
                if (result.integrated_avg_score === 0) {
                    result.integrated_avg_score = avgScore / 20; // normalize to 0-5
                }
                result.total_submissions += advocateData.length;
                if (!result.lastDate || (advocateData[0]?.created_at && advocateData[0].created_at > result.lastDate)) {
                    result.lastDate = advocateData[0].created_at;
                }
            }
        } catch (e) {
            console.error('Oracle: Failed to fetch devils advocate data', e);
        }

        return result;
    },
};

/**
 * Score Oracle - Data Aggregation Service
 * Collects and aggregates user performance data from all sources
 */

import { AggregatedOracleData } from '../types';
import { withTimeout } from '../utils/promiseTimeout';

export const oracleDataService = {

    async aggregateUserData(userId: string): Promise<AggregatedOracleData> {
        const quizHistory = JSON.parse(localStorage.getItem(`quiz_history_${userId}`) || '[]');
        const sessions = JSON.parse(localStorage.getItem(`writing_gym_sessions_${userId}`) || '[]');
        const progress = JSON.parse(localStorage.getItem(`mason_progress_${userId}`) || '[]');
        const metrics = JSON.parse(localStorage.getItem(`essay_metrics_${userId}`) || '[]');

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
            quizzes: quizData,
            writingGym: gymData,
            essays: essayData,
            totalActivities,
            lastActivityDate,
            skillsBreakdown: {
                listening: quizData.listening.correct_rate,
                reading: quizData.reading.correct_rate,
                structure: quizData.structure.correct_rate,
                written: quizData.written.correct_rate,
            },
            lastQuizScore: quizData.overall.correct_rate,
            totalQuizzes: quizData.overall.total,
            totalCorrect: quizData.overall.correct,
            quizDates: quizHistory.map((h: any) => h.answered_at).filter(Boolean),
            gymDates: [...sessions, ...progress].map((s: any) => s.created_at || s.updated_at).filter(Boolean),
            essayDates: metrics.map((m: any) => m.submitted_at).filter(Boolean),
            trend: this.calculateTrend(userId),
        };
    },

    async getQuizPerformance(userId: string) {
        const quizHistory = JSON.parse(localStorage.getItem(`quiz_history_${userId}`) || '[]');
        
        const listening = quizHistory.filter((h: any) => h.section === 'listening');
        const reading = quizHistory.filter((h: any) => h.section === 'reading');
        const structure = quizHistory.filter((h: any) => h.section === 'structure');
        const written = quizHistory.filter((h: any) => h.section === 'written');

        const calc = (arr: any[]) => ({
            total: arr.length,
            correct: arr.filter((h: any) => h.is_correct).length,
            correct_rate: arr.length > 0 
                ? arr.filter((h: any) => h.is_correct).length / arr.length 
                : 0
        });

        const dates = quizHistory.map((h: any) => h.answered_at).filter(Boolean);

        return {
            listening: calc(listening),
            reading: calc(reading),
            structure: calc(structure),
            written: calc(written),
            overall: calc(quizHistory),
            lastDate: dates.length > 0 
                ? dates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0] 
                : null
        };
    },

    async getWritingGymPerformance(userId: string) {
        const sessions = JSON.parse(localStorage.getItem(`writing_gym_sessions_${userId}`) || '[]');
        const progress = JSON.parse(localStorage.getItem(`mason_progress_${userId}`) || '[]');

        const total_exercises = sessions.length + progress.length;
        const allStars = [...sessions, ...progress].reduce((sum: number, s: any) => sum + (s.stars_earned || 0), 0);
        const dates = [...sessions, ...progress].map((s: any) => s.created_at || s.updated_at).filter(Boolean);

        return {
            total_exercises,
            mason_avg_stars: total_exercises > 0 ? allStars / 2 : 0,
            logic_weaver_avg_stars: total_exercises > 0 ? allStars / 2 : 0,
            lastDate: dates.length > 0 
                ? dates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0] 
                : null
        };
    },

    async getEssayPerformance(userId: string) {
        const metrics = JSON.parse(localStorage.getItem(`essay_metrics_${userId}`) || '[]');

        const total_submissions = metrics.length;
        const avgBand = total_submissions > 0 
            ? metrics.reduce((sum: number, m: any) => sum + (m.band_score || 0), 0) / total_submissions 
            : 0;
        const dates = metrics.map((m: any) => m.submitted_at).filter(Boolean);

        return {
            total_submissions,
            integrated_avg_score: avgBand,
            ielts_avg_band: avgBand,
            lastDate: dates.length > 0 
                ? dates.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0] 
                : null
        };
    },

    calculateTrend(userId: string): number[] | undefined {
        const history = JSON.parse(localStorage.getItem(`quiz_history_${userId}`) || '[]');
        if (history.length < 5) return undefined;

        const sorted = history
            .sort((a: any, b: any) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime())
            .slice(-10);

        const half = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, half);
        const secondHalf = sorted.slice(half);

        const avgFirst = firstHalf.reduce((sum: number, h: any) => sum + (h.is_correct ? 1 : 0), 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((sum: number, h: any) => sum + (h.is_correct ? 1 : 0), 0) / secondHalf.length;

        if (avgSecond > avgFirst + 0.05) return [1];
        if (avgSecond < avgFirst - 0.05) return [-1];
        return [0];
    }
};

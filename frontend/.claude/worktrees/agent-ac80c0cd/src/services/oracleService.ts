/**
 * Score Oracle - Main Service
 * Orchestrates data aggregation, scoring, persistence, and recommendation delivery
 */

import {
    ScorePrediction,
    PredictionHistoryItem,
    OracleRecommendation,
    AggregatedOracleData,
} from '../types';
import { withTimeout } from '../utils/promiseTimeout';

import { oracleDataService } from './oracleDataService';
import {
    calculateAllScores,
    calculateConfidence,
    generateRecommendations,
} from './oracleScoringEngine';
import { supabase } from './supabase';


/** Check if a string is a valid UUID */
function isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export const oracleService = {

    /**
     * Get the latest prediction for a user (from DB or freshly computed)
     */
    async getPrediction(userId: string): Promise<ScorePrediction | null> {
        // Guest users can't be looked up in DB
        if (!isValidUUID(userId)) {
            return this.recalculatePrediction(userId);
        }

        const { data } = await supabase
            .from('score_predictions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (data) return data as ScorePrediction;
        return this.recalculatePrediction(userId);
    },

    /**
     * Get aggregated data to check unlock requirements
     */
    async getAggregatedData(userId: string): Promise<AggregatedOracleData> {
        return oracleDataService.aggregateUserData(userId);
    },

    /**
     * Full recalculation: aggregate → score via PBT + conversions → persist
     */
    async recalculatePrediction(userId: string): Promise<ScorePrediction | null> {
        const aggregated = await oracleDataService.aggregateUserData(userId);

        // Always calculate predictions, even with 0 data (will result in 0 scores)
        const scores = calculateAllScores(aggregated);
        const confidence = calculateConfidence(aggregated);

        const prediction: Partial<ScorePrediction> = {
            user_id: userId,
            toefl_pbt_score: scores.pbt.total,
            toefl_ibt_score: scores.ibt.total,
            toefl_itp_score: scores.itp.total,
            ielts_score: scores.ielts.overall,
            toefl_pbt_breakdown: {
                listening: scores.pbt.listening,
                structure_written: scores.pbt.structure_written,
                reading: scores.pbt.reading,
            },
            toefl_ibt_breakdown: {
                reading: scores.ibt.reading,
                listening: scores.ibt.listening,
                speaking: scores.ibt.speaking,
                writing: scores.ibt.writing,
            },
            toefl_itp_breakdown: {
                listening: scores.itp.listening,
                structure_written: scores.itp.structure_written,
                reading: scores.itp.reading,
            },
            ielts_breakdown: {
                listening: scores.ielts.listening,
                reading: scores.ielts.reading,
                writing: scores.ielts.writing,
                speaking: scores.ielts.speaking,
            },
            confidence_level: confidence,
            data_points: aggregated.totalActivities,
            last_activity_at: aggregated.lastActivityDate,
            updated_at: new Date().toISOString(),
        };

        // Guest users: return prediction without database persistence
        if (!isValidUUID(userId)) {
            return {
                id: 'guest',
                ...prediction,
                created_at: new Date().toISOString(),
            } as ScorePrediction;
        }

        // Authenticated users: persist to database
        // @ts-ignore - Supabase builder promise inference workaround
        const result = await withTimeout(
            supabase
                .from('score_predictions')
                .upsert(prediction, { onConflict: 'user_id' })
                .select()
                .single(),
            10000,
            'Save Prediction'
        );

        const { data: upserted, error } = result as any;

        if (error) {
            // Handle Foreign Key Violation (user doesn't exist in public.users)
            if (error.code === '23503') {
                console.warn('[ScoreOracle] User record missing in public.users, skipping persistence (treating as guest).');
                return {
                    id: 'local_guest',
                    ...prediction,
                    created_at: new Date().toISOString(),
                } as ScorePrediction;
            }

            console.error('Failed to upsert prediction:', error);
            return {
                id: 'local_error',
                ...prediction,
                created_at: new Date().toISOString(),
            } as ScorePrediction;
        }

        // Record history
        await Promise.all([
            this.recordHistory(userId, 'toefl_pbt', scores.pbt.total, confidence, aggregated.totalActivities, scores.pbt),
            this.recordHistory(userId, 'toefl_ibt', scores.ibt.total, confidence, aggregated.totalActivities, scores.ibt),
            this.recordHistory(userId, 'toefl_itp', scores.itp.total, confidence, aggregated.totalActivities, scores.itp),
            this.recordHistory(userId, 'ielts', scores.ielts.overall, confidence, aggregated.totalActivities, scores.ielts),
        ]);

        // Recommendations
        const recs = generateRecommendations(aggregated, scores.ielts.overall, confidence);
        await this.storeRecommendations(userId, recs);

        return upserted as ScorePrediction;
    },

    async recordHistory(
        userId: string,
        testType: string,
        score: number,
        confidence: string,
        dataPoints: number,
        breakdown: Record<string, number>
    ): Promise<void> {
        try {
            await supabase.from('prediction_history').insert({
                user_id: userId,
                test_type: testType,
                predicted_score: score,
                breakdown,
                confidence_level: confidence,
                data_points: dataPoints,
            });
        } catch (e) {
            console.error(`Failed to record history for ${testType}:`, e);
        }
    },

    async getHistory(
        userId: string,
        testType: 'toefl_pbt' | 'toefl_ibt' | 'toefl_itp' | 'ielts',
        limit: number = 30
    ): Promise<PredictionHistoryItem[]> {
        // Guest users don't have history in DB
        if (!isValidUUID(userId)) return [];

        const { data, error } = await supabase
            .from('prediction_history')
            .select('*')
            .eq('user_id', userId)
            .eq('test_type', testType)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) return [];
        return (data || []) as PredictionHistoryItem[];
    },

    async storeRecommendations(
        userId: string,
        recs: Array<{ recommendation_type: string; section: string; message: string; priority: number }>
    ): Promise<void> {
        try {
            await supabase
                .from('oracle_recommendations')
                .delete()
                .eq('user_id', userId)
                .eq('is_read', false);

            if (recs.length > 0) {
                await supabase.from('oracle_recommendations').insert(
                    recs.map(r => ({ user_id: userId, ...r }))
                );
            }
        } catch (e) {
            console.error('Failed to store recommendations:', e);
        }
    },

    async getRecommendations(userId: string): Promise<OracleRecommendation[]> {
        // Guest users don't have recommendations in DB
        if (!isValidUUID(userId)) return [];

        const { data, error } = await supabase
            .from('oracle_recommendations')
            .select('*')
            .eq('user_id', userId)
            .order('priority', { ascending: false })
            .limit(5);

        if (error) return [];
        return (data || []) as OracleRecommendation[];
    },

    async markRecommendationRead(recommendationId: string): Promise<void> {
        await supabase
            .from('oracle_recommendations')
            .update({ is_read: true })
            .eq('id', recommendationId);
    },
};

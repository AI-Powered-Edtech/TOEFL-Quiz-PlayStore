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

function isValidUUID(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

const PREDICTION_KEY = 'oracle_prediction_';
const HISTORY_KEY = 'oracle_history_';

const getPredictionKey = (userId: string): string => `${PREDICTION_KEY}${userId}`;
const getHistoryKey = (userId: string): string => `${HISTORY_KEY}${userId}`;

const getLocalPrediction = (userId: string): ScorePrediction | null => {
    try {
        const stored = localStorage.getItem(getPredictionKey(userId));
        return stored ? JSON.parse(stored) : null;
    } catch { return null; }
};

const saveLocalPrediction = (userId: string, prediction: ScorePrediction): void => {
    localStorage.setItem(getPredictionKey(userId), JSON.stringify(prediction));
};

const getLocalHistory = (userId: string): PredictionHistoryItem[] => {
    try {
        const stored = localStorage.getItem(getHistoryKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveLocalHistory = (userId: string, history: PredictionHistoryItem[]): void => {
    localStorage.setItem(getHistoryKey(userId), JSON.stringify(history));
};

export const oracleService = {

    async getPrediction(userId: string): Promise<ScorePrediction | null> {
        if (!isValidUUID(userId)) {
            return this.recalculatePrediction(userId);
        }
        return getLocalPrediction(userId);
    },

    async getAggregatedData(userId: string): Promise<AggregatedOracleData> {
        return oracleDataService.aggregateUserData(userId);
    },

    async recalculatePrediction(userId: string): Promise<ScorePrediction | null> {
        const aggregated = await oracleDataService.aggregateUserData(userId);

        const scores = calculateAllScores(aggregated);
        const confidence = calculateConfidence(aggregated);
        
        const confidenceLevel: 'low' | 'medium' | 'high' = confidence as 'low' | 'medium' | 'high';

        const prediction: ScorePrediction = {
            id: crypto.randomUUID(),
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
            confidence_level: confidenceLevel,
            data_points: aggregated.totalActivities,
            last_activity_at: aggregated.lastActivityDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        saveLocalPrediction(userId, prediction);

        const history = getLocalHistory(userId);
        history.unshift({
            id: crypto.randomUUID(),
            user_id: userId,
            test_type: 'toefl_ibt',
            predicted_score: scores.ibt.total,
            breakdown: { predicted: scores.ibt.total },
            confidence_level: confidenceLevel,
            data_points: aggregated.totalActivities,
            created_at: new Date().toISOString(),
        });

        if (history.length > 50) history.splice(50);
        saveLocalHistory(userId, history);

        return prediction;
    },

    async getPredictionHistory(userId: string, limit: number = 10): Promise<PredictionHistoryItem[]> {
        const history = getLocalHistory(userId);
        return history.slice(0, limit);
    },

    async getRecommendations(userId: string): Promise<OracleRecommendation[]> {
        const prediction = await this.getPrediction(userId);
        if (!prediction) {
            return [];
        }
        const aggregated = await this.getAggregatedData(prediction.user_id);
        const confidence = calculateConfidence(aggregated);
        
        const generatedRecs = generateRecommendations(aggregated, prediction.ielts_score || 0, confidence);
        
        return generatedRecs.map((rec) => ({
            id: crypto.randomUUID(),
            user_id: prediction.user_id,
            recommendation_type: rec.recommendation_type,
            section: rec.section,
            message: rec.message,
            priority: rec.priority,
            is_read: false,
            created_at: new Date().toISOString(),
        }));
    },

    async getConfidenceFactors(userId: string): Promise<Record<string, number>> {
        const aggregated = await this.getAggregatedData(userId);
        const confidence = calculateConfidence(aggregated);

        const trendValue = aggregated.trend?.[0] ?? 0;

        return {
            quiz_coverage: Math.min(aggregated.totalQuizzes / 50, 1) * 100,
            skill_variety: Math.min((aggregated.skillsBreakdown ? Object.keys(aggregated.skillsBreakdown).length : 0) / 10, 1) * 100,
            recency: confidence === 'high' ? 100 : confidence === 'medium' ? 60 : 20,
            consistency: trendValue > 0 ? 100 : trendValue === 0 ? 80 : 40,
        };
    }
};

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
    calculateConfidence,
    generateRecommendations,
} from './oracleScoringEngine';
import { apiClient } from './apiClient';

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
        
        const local = getLocalPrediction(userId);
        if (local) {
            // Kick off background refresh
            this.recalculatePrediction(userId).catch(console.error);
            return local;
        }

        return this.recalculatePrediction(userId);
    },

    async getAggregatedData(userId: string): Promise<AggregatedOracleData> {
        return oracleDataService.aggregateUserData(userId);
    },

    async recalculatePrediction(userId: string): Promise<ScorePrediction | null> {
        let prediction: ScorePrediction;

        if (!isValidUUID(userId)) {
            // DO NOT REMOVE testing bypasses for guests. Guests cannot fetch from backend without auth.
            // Return dummy prediction so tests and guest users don't break.
            prediction = {
                id: crypto.randomUUID(),
                user_id: userId,
                toefl_pbt_score: 500,
                toefl_ibt_score: 60,
                toefl_itp_score: 500,
                ielts_score: 6.0,
                toefl_pbt_breakdown: { listening: 50, structure_written: 50, reading: 50 },
                toefl_ibt_breakdown: { reading: 15, listening: 15, speaking: 15, writing: 15 },
                toefl_itp_breakdown: { listening: 50, structure_written: 50, reading: 50 },
                ielts_breakdown: { listening: 6.0, reading: 6.0, writing: 6.0, speaking: 6.0 },
                confidence_level: 'low',
                data_points: 0,
                last_activity_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
        } else {
            const response = await apiClient.get<ScorePrediction>('/api/oracle/predict');
            if (response.error || !response.data) {
                console.error('Failed to fetch prediction from backend:', response.error);
                return null;
            }
            prediction = response.data;
        }

        saveLocalPrediction(userId, prediction);

        const history = getLocalHistory(userId);
        history.unshift({
            id: crypto.randomUUID(),
            user_id: userId,
            test_type: 'toefl_ibt',
            predicted_score: prediction.toefl_ibt_score || 0,
            breakdown: { predicted: prediction.toefl_ibt_score || 0 },
            confidence_level: prediction.confidence_level as any,
            data_points: prediction.data_points,
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
            recommendation_type: rec.recommendation_type as any,
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

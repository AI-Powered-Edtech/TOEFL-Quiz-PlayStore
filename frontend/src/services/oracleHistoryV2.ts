import { PredictionHistoryItem } from '../types';
import { apiV2 } from './apiV2';
import { assertSafeId, safeInt, sqlJson } from './securityUtils';

const TEST_TYPES = new Set(['toefl_ibt', 'toefl_pbt', 'toefl_itp', 'ielts']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);

type Confidence = 'low' | 'medium' | 'high';

function safeUserId(userId: string): string {
  return assertSafeId(userId || 'guest', 'user_id');
}

function safeTestType(testType: string): string {
  const v = String(testType || 'toefl_ibt');
  if (!TEST_TYPES.has(v)) throw new Error('Invalid test_type');
  return v;
}

function safeConfidence(level: string): Confidence {
  const v = String(level || 'low') as Confidence;
  return CONFIDENCE.has(v) ? v : 'low';
}

function fromRow(row: any): PredictionHistoryItem {
  let breakdown: Record<string, any> = {};
  try { breakdown = JSON.parse(row.breakdown_json || '{}'); } catch { breakdown = {}; }
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    test_type: safeTestType(row.test_type) as any,
    predicted_score: Number(row.predicted_score) || 0,
    breakdown,
    confidence_level: safeConfidence(row.confidence_level) as any,
    data_points: Number(row.data_points) || 0,
    created_at: String(row.created_at),
  };
}

export async function savePredictionHistoryV2(item: PredictionHistoryItem): Promise<boolean> {
  const body = {
    user_id: safeUserId(item.user_id),
    test_type: safeTestType(item.test_type),
    predicted_score: String(Number(item.predicted_score) || 0),
    breakdown_json: sqlJson(item.breakdown || {}, 2000),
    confidence_level: safeConfidence(item.confidence_level),
    data_points: String(safeInt(item.data_points, 0, 0, 100000)),
  };
  const res = await apiV2.post<{ ok: boolean; rows_affected: number }>('/api/v2/oracle/predictions/save', body);
  return !!res.ok;
}

export async function fetchPredictionHistoryV2(userId: string, limit = 10): Promise<PredictionHistoryItem[]> {
  const res = await apiV2.post<{ history: any[]; count: number }>('/api/v2/oracle/predictions/history', { user_id: safeUserId(userId) });
  return Array.isArray(res.history) ? res.history.map(fromRow).slice(0, limit) : [];
}

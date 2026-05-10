import { apiV2 } from './apiV2';
import { assertSafeId, getActorId, safeInt, sqlJson, sqlText } from './securityUtils';
import { CanonicalQuestionV1 } from '../types';

const SECTION = new Set(['structure', 'written', 'reading', 'listening']);
const INTERACTION = new Set(['fill_blank', 'identify_error', 'multiple_choice']);
const CEFR = new Set(['A2', 'B1', 'B2', 'C1']);

function fromRow(row: any): CanonicalQuestionV1 {
  const parse = (v: any, fallback: any) => { try { return JSON.parse(v || ''); } catch { return fallback; } };
  return {
    id: row.id,
    skill_id: Number(row.skill_id) || 1,
    section: row.section,
    interaction: row.interaction,
    prompt: row.prompt,
    choices: parse(row.choices_json, []),
    correct_response: parse(row.correct_response_json, []),
    cefr_target: row.cefr_target || 'B1',
    difficulty_score: Number(row.difficulty_score) || 50,
    stimulus: parse(row.stimulus_json, {}),
    metadata: parse(row.metadata_json, { source: 'db' }),
    created_at: row.created_at,
  } as CanonicalQuestionV1;
}

function toBody(question: Partial<CanonicalQuestionV1>) {
  const id = question.id ? assertSafeId(question.id, 'question_id') : crypto.randomUUID().replace(/-/g, '');
  const section = String(question.section || 'structure');
  const interaction = String(question.interaction || 'fill_blank');
  const cefr = String(question.cefr_target || 'B1');
  if (!SECTION.has(section)) throw new Error('Invalid section');
  if (!INTERACTION.has(interaction)) throw new Error('Invalid interaction');
  if (!CEFR.has(cefr)) throw new Error('Invalid CEFR');
  return {
    id,
    skill_id: safeInt(question.skill_id, 1, 1, 999),
    section,
    interaction,
    prompt: sqlText(question.prompt || '', 2000),
    choices_json: sqlJson(question.choices || [], 2000),
    correct_response_json: sqlJson(question.correct_response || [], 1000),
    cefr_target: cefr,
    difficulty_score: safeInt(question.difficulty_score, 50, 1, 100),
    stimulus_json: sqlJson(question.stimulus || {}, 3000),
    metadata_json: sqlJson(question.metadata || { source: 'db' }, 3000),
  };
}

export async function fetchAdminQuestionsV2(): Promise<CanonicalQuestionV1[]> {
  const res = await apiV2.get<{ questions: any[]; count: number }>('/api/v2/admin/questions');
  return Array.isArray(res.questions) ? res.questions.map(fromRow) : [];
}

export async function upsertAdminQuestionV2(question: Partial<CanonicalQuestionV1>): Promise<void> {
  await apiV2.post('/api/v2/admin/questions/upsert', toBody(question));
}

export async function deleteAdminQuestionV2(id: string): Promise<void> {
  await apiV2.post('/api/v2/admin/questions/delete', { id: assertSafeId(id, 'question_id'), actor_id: assertSafeId(getActorId(), 'actor_id') });
}

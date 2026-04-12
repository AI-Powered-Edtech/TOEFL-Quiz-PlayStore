import api from './apiClient';
import { CanonicalQuestionV1 } from '../types';

export interface Question {
  id: string;
  skill_id: number;
  section: string;
  interaction: string;
  stimulus?: string;
  prompt: string;
  choices?: string[];
  correct_response?: string[];
  cefr_target?: string;
  difficulty_score?: number;
  passage_id?: string;
  metadata?: {
    explanation?: string;
    pattern_tip?: string;
    hints?: string[];
    source?: string;
  };
  created_at: string;
}

export interface QuestionFilter {
  section?: string;
  skill_id?: number;
  cefr?: string;
  limit?: number;
}

export interface QuizResult {
  id: string;
  user_id: string;
  date: string;
  skill_id?: string;
  section: string;
  score: number;
  correct_count: number;
  total_questions: number;
  xp_earned: number;
  breakdown?: {
    correct: number;
    wrong: number;
    skipped: number;
  };
}

export interface SaveResultRequest {
  skill_id?: string;
  section: string;
  score: number;
  correct_count: number;
  total_questions: number;
}

export interface ProgressResponse {
  total_quizzes: number;
  total_correct: number;
  total_xp: number;
  unique_skills: number;
  level: number;
}

export interface HistoryItem {
  id: string;
  date: string;
  section: string;
  skill_id?: string;
  score: number;
  correct_count: number;
  total_questions: number;
  xp_earned: number;
}

export const quizService = {
  async listQuestions(filter?: QuestionFilter): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filter?.section) params.set('section', filter.section);
    if (filter?.skill_id) params.set('skill_id', filter.skill_id.toString());
    if (filter?.cefr) params.set('cefr', filter.cefr);
    if (filter?.limit) params.set('limit', filter.limit.toString());

    const query = params.toString();
    const response = await api.get<Question[]>(`/api/quiz/questions${query ? `?${query}` : ''}`);
    return response.data || [];
  },

  async simulation(section?: string): Promise<Question[]> {
    const query = section ? `?section=${section}` : '';
    const response = await api.get<Question[]>(`/api/quiz/simulation${query}`);
    return response.data || [];
  },

  async saveResult(data: SaveResultRequest): Promise<{ ok: boolean; id?: string; xp_earned?: number; error?: string }> {
    const response = await api.post<{ ok: boolean; id: string; xp_earned: number }>('/api/quiz/results', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    if (response.data) {
      return {
        ok: response.data.ok,
        id: response.data.id,
        xp_earned: response.data.xp_earned,
      };
    }
    return { ok: false, error: 'Unknown error' };
  },

  async history(): Promise<HistoryItem[]> {
    const response = await api.get<HistoryItem[]>('/api/quiz/history');
    return response.data || [];
  },

  async progress(): Promise<ProgressResponse | null> {
    const response = await api.get<ProgressResponse>('/api/quiz/progress');
    return response.data || null;
  },
};

export default quizService;

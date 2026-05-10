import api from './apiClient';
import { CanonicalQuestionV1, QuizReportData } from '../types';
import { parseApi } from '../contracts/parse';
import { QuizReportDataSchema } from '../contracts/schemas';
import { mapQuizReportResponseToQuizReportData } from './mappers';


const makeLocalReportId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `local_report_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const saveLocalQuizReport = (data: any): string => {
  const id = data.id || makeLocalReportId();
  const report: QuizReportData = {
    id,
    student_name: data.studentName || 'Guest User',
    quiz_topic: data.topic || 'Practice Quiz',
    score: data.score || 0,
    total_questions: data.total || 0,
    correct_count: data.correct || 0,
    created_at: new Date().toISOString(),
    answers_snapshot: data.answers || [],
  };

  const stored = localStorage.getItem('quiz_reports');
  const reports = stored ? JSON.parse(stored) : [];
  const next = [report, ...reports.filter((r: any) => r.id !== id)].slice(0, 50);
  localStorage.setItem('quiz_reports', JSON.stringify(next));
  return id;
};

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

export interface AdaptiveMetricsResponse {
  total_questions: number;
  correct_answers: number;
  accuracy_by_section: Record<string, { correct: number; total: number }>;
  accuracy_by_skill: Record<string, { correct: number; total: number }>;
  recent_accuracy: number[];
  average_response_time: number;
  last_updated: number;
  current_difficulty: string;
}

export interface RecordAnswerRequest {
  correct: boolean;
  section: string;
  skill_id: string;
  response_time_ms: number;
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

  async saveResult(data: SaveResultRequest): Promise<{ ok: boolean; id?: string; xp_earned?: number; next_difficulty_level?: string; error?: string }> {
    const response = await api.post<{ ok: boolean; id: string; xp_earned: number; next_difficulty_level?: string }>('/api/quiz/results', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    if (response.data) {
      return {
        ok: response.data.ok,
        id: response.data.id,
        xp_earned: response.data.xp_earned,
        next_difficulty_level: response.data.next_difficulty_level,
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

  async getAdaptiveMetrics(): Promise<AdaptiveMetricsResponse | null> {
    const response = await api.get<AdaptiveMetricsResponse>('/api/quiz/adaptive-metrics');
    return response.data || null;
  },

  async recordAnswer(data: RecordAnswerRequest): Promise<AdaptiveMetricsResponse | null> {
    const response = await api.post<AdaptiveMetricsResponse>('/api/quiz/record-answer', data);
    return response.data || null;
  },

  async getQuizReportById(id: string): Promise<QuizReportData | null> {
    const response = await api.get<QuizReportData>(`/api/quiz/reports/${id}`);
    if (response.data) {
      return parseApi(QuizReportDataSchema, mapQuizReportResponseToQuizReportData(response.data));
    }
    try {
      const stored = localStorage.getItem('quiz_reports');
      const reports = stored ? JSON.parse(stored) : [];
      return reports.find((r: any) => r.id === id) || null;
    } catch {
      return null;
    }
  },

  async saveQuizReport(data: any): Promise<string | null> {
    try {
      const response = await api.post<{ ok: boolean; id: string }>('/api/quiz/reports', {
        skill_id: data.skillId ? String(data.skillId) : undefined,
        section: data.section,
        student_name: data.studentName,
        quiz_topic: data.topic,
        score: data.score,
        total_questions: data.total,
        correct_count: data.correct,
        answers_snapshot: data.answers,
      });
      if (response.data?.id) {
        return response.data.id;
      }
      return saveLocalQuizReport(data);
    } catch {
      return saveLocalQuizReport(data);
    }
  }
};

export default quizService;

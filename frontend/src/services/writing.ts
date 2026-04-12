import api from './apiClient';

export interface ProgressResponse {
  level: string;
  skill_id?: string;
  exercises_completed: number;
  exercises_total?: number;
  stars_earned: number;
  history?: string[];
}

export interface Session {
  id: string;
  level: string;
  skill_id?: string;
  session_state?: string;
  best_score?: number;
  status: string;
  expires_at?: string;
  created_at: string;
}

export interface ExerciseResponse {
  source: string;
  exercise?: Record<string, unknown>;
  message?: string;
}

export interface EvaluateResponse {
  id: string;
  word_count: number;
  feedback?: Record<string, unknown>;
  message?: string;
}

export interface VocabItem {
  id: string;
  word: string;
  definition?: string;
  cefr_level?: string;
  review_count: number;
}

export interface VocabListResponse {
  words: VocabItem[];
  count: number;
}

export interface ModelEssay {
  id: string;
  topic?: string;
  task_type: string;
  content: string;
  word_count?: number;
  band_score?: number;
  category?: string;
  views_count: number;
  saves_count: number;
}

export interface DevilsAdvocateResponse {
  id: string;
  detected_claim?: string;
  counter_point?: string;
  feedback?: string;
}

export interface PeerSubmission {
  id: string;
  essay_content: string;
  prompt?: string;
  task_type?: string;
  word_count?: number;
  status: string;
  created_at: string;
}

export interface PeerReview {
  id: string;
  submission_id: string;
  task_response_score?: number;
  coherence_score?: number;
  lexical_score?: number;
  grammar_score?: number;
  overall_band?: number;
  strengths?: string;
  weaknesses?: string;
  inline_corrections?: string;
}

export interface ReviewQueueResponse {
  ok: boolean;
  overall_band?: number;
}

export const writingService = {
  async getProgress(): Promise<ProgressResponse[]> {
    const response = await api.get<ProgressResponse[]>('/api/writing/progress');
    return response.data || [];
  },

  async saveProgress(data: {
    level: string;
    skill_id?: string;
    exercises_completed: number;
    stars_earned: number;
    history?: string[];
  }): Promise<{ ok: boolean; error?: string }> {
    const response = await api.post<{ ok: boolean }>('/api/writing/progress', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

  async getSessions(level?: string): Promise<Session[]> {
    const query = level ? `?level=${level}` : '';
    const response = await api.get<Session[]>(`/api/writing/sessions${query}`);
    return response.data || [];
  },

  async saveSession(data: {
    id?: string;
    level: string;
    skill_id?: string;
    session_state?: string;
    best_score?: number;
    status?: string;
    expires_at?: string;
  }): Promise<{ ok: boolean; id?: string; error?: string }> {
    const response = await api.post<{ ok: boolean; id: string }>('/api/writing/sessions', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true, id: response.data?.id };
  },

  async getExercise(level: string, skillId: string): Promise<ExerciseResponse> {
    const response = await api.post<ExerciseResponse>('/api/writing/exercise', { level, skill_id: skillId });
    return response.data || { source: 'error', message: 'Failed to fetch exercise' };
  },

  async evaluateEssay(data: {
    essay: string;
    task_type: string;
    prompt?: string;
    time_spent_seconds?: number;
  }): Promise<EvaluateResponse> {
    const response = await api.post<EvaluateResponse>('/api/writing/evaluate', data);
    return response.data || { id: '', word_count: 0, message: 'Failed to evaluate' };
  },

  async listModelEssays(taskType?: string): Promise<ModelEssay[]> {
    const query = taskType ? `?task_type=${taskType}` : '';
    const response = await api.get<ModelEssay[]>(`/api/writing/model-essays${query}`);
    return response.data || [];
  },

  async getVocabulary(): Promise<VocabListResponse> {
    const response = await api.get<VocabListResponse>('/api/writing/vocabulary');
    return response.data || { words: [], count: 0 };
  },

  async addVocabulary(data: {
    word: string;
    definition?: string;
    cefr_level?: string;
    example_sentence?: string;
    source_essay_id?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const response = await api.post<{ ok: boolean }>('/api/writing/vocabulary', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

  async devilsAdvocate(data: {
    user_argument: string;
    time_spent_seconds?: number;
  }): Promise<DevilsAdvocateResponse> {
    const response = await api.post<DevilsAdvocateResponse>('/api/writing/devils-advocate', data);
    return response.data || { id: '' };
  },

  async submitEssay(data: {
    essay_content: string;
    prompt?: string;
    task_type: string;
    is_anonymous?: boolean;
  }): Promise<{ ok: boolean; id?: string; error?: string }> {
    const response = await api.post<{ ok: boolean; id: string }>('/api/writing/peer-review/submissions', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true, id: response.data?.id };
  },

  async getReviewQueue(): Promise<PeerSubmission[]> {
    const response = await api.get<PeerSubmission[]>('/api/writing/peer-review/queue');
    return response.data || [];
  },

  async submitReview(data: {
    submission_id: string;
    task_response_score: number;
    coherence_score: number;
    lexical_score: number;
    grammar_score: number;
    strengths?: string;
    weaknesses?: string;
    suggestions?: string;
    inline_corrections?: string;
    time_spent_seconds?: number;
  }): Promise<ReviewQueueResponse> {
    const response = await api.post<ReviewQueueResponse>('/api/writing/peer-review/reviews', data);
    return response.data || { ok: false };
  },
};

export default writingService;

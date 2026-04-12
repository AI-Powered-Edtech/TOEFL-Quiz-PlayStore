import api from './apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface AiChatResponse {
  choices: {
    message: ChatMessage;
  }[];
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TokenUsage {
  used: number;
  limit: number;
  remaining: number;
  tier: string;
  date: string;
}

export interface TtsRequest {
  input: string;
  voice?: string;
}

export const AI_MODELS = {
  FAST: 'llama-3.1-8b-instant',
  POWERFUL: 'llama-3.3-70b-versatile',
  SCOUT: 'llama-4-scout-17b-16e-instruct',
  GEMMA: 'gemma2-9b-it',
  MIXTRAL: 'mixtral-8x7b-32768',
  QWEN: 'qwen/qwen3-32b',
} as const;

export const aiService = {
  async generate(request: GenerateRequest): Promise<{ content?: string; error?: string }> {
    const response = await api.post<AiChatResponse>('/api/ai/generate', request);

    if (response.error) {
      return { error: response.error.error };
    }

    if (response.data?.choices?.[0]?.message?.content) {
      return { content: response.data.choices[0].message.content };
    }

    return { error: 'No response from AI' };
  },

  async tokenUsage(): Promise<TokenUsage | null> {
    const response = await api.get<TokenUsage>('/api/ai/token-usage');
    return response.data || null;
  },

  async tts(request: TtsRequest): Promise<{ audioUrl?: string; error?: string }> {
    const response = await api.post<{ audio_url: string }>('/api/ai/tts', request);

    if (response.error) {
      return { error: response.error.error };
    }

    if (response.data?.audio_url) {
      return { audioUrl: response.data.audio_url };
    }

    return { error: 'No audio URL returned' };
  },
};

export default aiService;

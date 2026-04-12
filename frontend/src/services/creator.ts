import api from './apiClient';

export interface CreatorProfile {
  id: string;
  display_name: string;
  is_verified: boolean;
  total_earnings: number;
  status: string;
  created_at: string;
}

export interface DailyBite {
  id: string;
  youtube_video_id: string;
  title: string;
  category: string;
  section: string;
  views_count: number;
  likes_count: number;
  status: string;
}

export interface CreatorStats {
  total_views: number;
  total_earnings: number;
  pending_earnings: number;
  total_bites: number;
}

export interface TipResult {
  ok: boolean;
  transaction_id?: string;
  amount?: number;
  platform_fee?: number;
  creator_amount?: number;
  duplicate?: boolean;
  error?: string;
}

export const creatorService = {
  async register(displayName: string): Promise<{ ok: boolean; creator_id?: string; status?: string; error?: string }> {
    const response = await api.post<{ ok: boolean; creator_id: string; status: string }>('/api/creator/register', { display_name: displayName });
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return {
      ok: true,
      creator_id: response.data?.creator_id,
      status: response.data?.status,
    };
  },

  async getProfile(): Promise<CreatorProfile | null> {
    const response = await api.get<CreatorProfile>('/api/creator/profile');
    return response.data || null;
  },

  async listBites(): Promise<DailyBite[]> {
    const response = await api.get<DailyBite[]>('/api/creator/bites');
    return response.data || [];
  },

  async recordView(biteId: string): Promise<{ ok: boolean; error?: string }> {
    const response = await api.post<{ ok: boolean }>(`/api/creator/bites/${biteId}/view`);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

  async processTip(biteId: string, amount: number): Promise<TipResult> {
    const response = await api.post<TipResult>(`/api/creator/bites/${biteId}/tip`, { amount });
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return response.data || { ok: false, error: 'Unknown error' };
  },

  async requestPayout(amount: number): Promise<{ ok: boolean; payout_id?: string; status?: string; error?: string }> {
    const response = await api.post<{ ok: boolean; payout_id: string; status: string }>('/api/creator/payouts', { amount });
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return {
      ok: true,
      payout_id: response.data?.payout_id,
      status: response.data?.status,
    };
  },

  async getStats(): Promise<CreatorStats | null> {
    const response = await api.get<CreatorStats>('/api/creator/stats');
    return response.data || null;
  },
};

export default creatorService;

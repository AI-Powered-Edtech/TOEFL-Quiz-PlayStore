import { apiV2 } from './apiV2';
import { assertSafeId, getActorId, safeInt, sqlText } from './securityUtils';

export interface CreatorProfile {
  id: string; user_id: string; display_name: string; revenue_share_bps: number; status: string;
  total_earnings: number; pending_earnings: number; payout_method?: string | null; created_at: string; updated_at?: string;
}
export interface DailyBite { id: string; youtube_video_id: string; title: string; category: string; section: string; views_count: number; likes_count: number; status: string; }
export interface CreatorStats { total_views: number; total_earnings: number; pending_earnings: number; total_bites: number; }
export interface TipResult { ok: boolean; transaction_id?: string; amount?: number; platform_fee?: number; creator_amount?: number; duplicate?: boolean; error?: string; }
export interface CreatorDashboard { profile: CreatorProfile | null; payouts: Array<{ id: string; amount: number; status: string; requested_at: string; processed_at?: string | null }>; found: number; }

const currentUserId = () => assertSafeId(getActorId('guest'), 'user_id');

export const creatorService = {
  async register(displayName: string): Promise<{ ok: boolean; creator_id?: string; status?: string; error?: string }> {
    try {
      const res = await apiV2.post<{ ok: boolean; status: string; revenue_share_bps: number }>('/api/v2/creator/register', {
        user_id: currentUserId(),
        display_name: sqlText(displayName, 80),
      });
      return { ok: !!res.ok, status: res.status || 'pending' };
    } catch (e: any) { return { ok: false, error: e?.message || 'Creator registration failed' }; }
  },

  async getDashboard(userId = currentUserId()): Promise<CreatorDashboard> {
    const res = await apiV2.post<{ profile: CreatorProfile[]; payouts: any[]; found: number }>('/api/v2/creator/dashboard', { user_id: assertSafeId(userId, 'user_id') });
    return { profile: Array.isArray(res.profile) ? res.profile[0] || null : null, payouts: Array.isArray(res.payouts) ? res.payouts : [], found: res.found || 0 };
  },

  async getProfile(): Promise<CreatorProfile | null> { return (await this.getDashboard()).profile; },
  async listBites(): Promise<DailyBite[]> { return []; },
  async recordView(_biteId: string): Promise<{ ok: boolean; error?: string }> { return { ok: true }; },
  async processTip(_biteId: string, _amount: number): Promise<TipResult> { return { ok: false, error: 'Tips need payment provider integration before Play Store release.' }; },

  async requestPayout(amount: number): Promise<{ ok: boolean; payout_id?: string; status?: string; error?: string }> {
    try {
      const res = await apiV2.post<{ ok: boolean; rows_affected: number }>('/api/v2/creator/payouts', { user_id: currentUserId(), amount: safeInt(amount, 0, 1, 100000000) });
      return { ok: !!res.ok && res.rows_affected > 0, status: res.rows_affected > 0 ? 'requested' : 'no_creator_profile' };
    } catch (e: any) { return { ok: false, error: e?.message || 'Payout request failed' }; }
  },

  async getStats(): Promise<CreatorStats | null> {
    const profile = await this.getProfile();
    if (!profile) return null;
    return { total_views: 0, total_earnings: profile.total_earnings || 0, pending_earnings: profile.pending_earnings || 0, total_bites: 0 };
  },
};

export default creatorService;

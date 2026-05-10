import { apiClient } from './apiClient';

export interface FriendProfile {
  full_name?: string | null;
  avatar_url?: string | null;
  xp?: number | null;
}

export interface FriendRow {
  id: string;
  user_id: string;
  friend_id: string;
  profile?: FriendProfile | null;
  created_at?: string | null;
}

export interface FriendCodeResponse {
  ok: boolean;
  friend_code: string;
}

export interface OkResponse {
  ok: boolean;
  error?: string;
}

const normalizeFriendCode = (code: string): string => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);

export const socialService = {
  async getOrCreateFriendCode(_userId?: string): Promise<string | null> {
    const response = await apiClient.get<FriendCodeResponse>('/api/social/friends/code');
    if (response.error || !response.data?.ok) {
      console.warn('[Social] friend code unavailable:', response.error);
      return null;
    }
    return response.data.friend_code;
  },

  async addFriend(friendCode: string): Promise<OkResponse> {
    const normalized = normalizeFriendCode(friendCode);
    if (!normalized) return { ok: false, error: 'Enter a valid friend code' };
    const response = await apiClient.post<OkResponse>('/api/social/friends/add', { friend_code: normalized });
    if (response.error) return { ok: false, error: response.error.error || 'Failed to add friend' };
    return response.data || { ok: true };
  },

  async listFriends(): Promise<FriendRow[]> {
    const response = await apiClient.get<FriendRow[]>('/api/social/friends');
    if (response.error || !response.data) {
      console.warn('[Social] friends unavailable:', response.error);
      return [];
    }
    return response.data;
  },

  async removeFriend(friendId: string): Promise<OkResponse> {
    const response = await apiClient.delete<OkResponse>(`/api/social/friends/${encodeURIComponent(friendId)}`);
    if (response.error) return { ok: false, error: response.error.error || 'Failed to remove friend' };
    return response.data || { ok: true };
  },

  async respondToRequest(requesterId: string, accept: boolean): Promise<OkResponse> {
    const response = await apiClient.post<OkResponse>('/api/social/friends/respond', { requester_id: requesterId, accept });
    if (response.error) return { ok: false, error: response.error.error || 'Failed to respond to request' };
    return response.data || { ok: true };
  },

  async getNotifications(): Promise<any[]> {
    const response = await apiClient.get<any[]>('/api/social/notifications');
    if (response.error || !response.data) {
      console.warn('[Social] notifications unavailable:', response.error);
      return [];
    }
    return response.data;
  },

  async markNotificationRead(id: string): Promise<OkResponse> {
    const response = await apiClient.patch<OkResponse>(`/api/social/notifications/${encodeURIComponent(id)}/read`);
    if (response.error) return { ok: false, error: response.error.error || 'Failed to mark notification read' };
    return response.data || { ok: true };
  },
};

export default socialService;

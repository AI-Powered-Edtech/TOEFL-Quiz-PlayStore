import api from './apiClient';
import { Notification } from '../types';
import { parseApi } from '../contracts/parse';
import { FriendSchema, NotificationSchema } from '../contracts/schemas';
import { mapFriendRowToFriend, mapNotificationRowToNotification } from './mappers';

export interface Circle {
  id: string;
  code: string;
  name: string;
  description?: string;
  creator_id: string;
  is_public: boolean;
  chat_mode?: string;
  created_at: string;
  member_count?: number;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role?: string;
  joined_at?: string;
  profile?: {
    full_name?: string;
    avatar_url?: string;
    xp?: number;
  };
}

export interface CircleMessage {
  id: string;
  circle_id: string;
  user_id: string;
  content: string;
  is_system: boolean;
  created_at: string;
  profile?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  profile?: {
    full_name?: string;
    avatar_url?: string;
    xp?: number;
  };
  created_at?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  xp: number;
}

export interface Achievement {
  id: string;
  achievement_id: string;
  feature?: string;
  xp_earned: number;
  created_at: string;
}

export interface Prediction {
  id: string;
  prediction_type: string;
  predicted_value?: number;
  actual_value?: number;
  confidence?: number;
  is_current: boolean;
  created_at: string;
}

export const socialService = {
  async createCircle(data: {
    name: string;
    description?: string;
    is_public?: boolean;
  }): Promise<{ ok: boolean; id?: string; error?: string }> {
    const response = await api.post<{ ok: boolean; id: string }>('/api/social/circles', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true, id: response.data?.id };
  },

  async joinCircle(code: string): Promise<{ ok: boolean; circle_id?: string; error?: string }> {
    const response = await api.post<{ ok: boolean; circle_id: string }>('/api/social/circles/join', { code });
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true, circle_id: response.data?.circle_id };
  },

  async myCircles(): Promise<Circle[]> {
    const response = await api.get<Circle[]>('/api/social/circles/mine');
    return response.data || [];
  },

  async sendMessage(circleId: string, content: string): Promise<{ ok: boolean; id?: string; error?: string }> {
    const response = await api.post<{ ok: boolean; id: string }>(`/api/social/circles/${circleId}/messages`, { content });
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true, id: response.data?.id };
  },

  async getMessages(circleId: string): Promise<CircleMessage[]> {
    const response = await api.get<CircleMessage[]>(`/api/social/circles/${circleId}/messages`);
    return response.data || [];
  },

  async addFriend(friendCode: string): Promise<{ ok: boolean; error?: string }> {
    const response = await api.post<{ ok: boolean }>('/api/social/friends/add', { friend_code: friendCode });
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

    const response = await api.get<any[]>('/api/social/friends');
    if (!response.data) return [];
    return response.data.map(r => parseApi(FriendSchema, mapFriendRowToFriend(r)));
    return response.data || [];

  async leaderboard(): Promise<LeaderboardEntry[]> {
    const response = await api.get<LeaderboardEntry[]>('/api/social/leaderboard');
    return response.data || [];
  },

  async getPredictions(): Promise<Prediction[]> {
    const response = await api.get<Prediction[]>('/api/social/predictions');
    return response.data || [];
  },

  async savePrediction(data: {
    prediction_type: string;
    predicted_value?: number;
    confidence?: number;
    breakdown?: string;
  }): Promise<{ ok: boolean; error?: string }> {
    const response = await api.post<{ ok: boolean }>('/api/social/predictions', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

  async getAchievements(): Promise<Achievement[]> {
    const response = await api.get<Achievement[]>('/api/social/achievements');
    return response.data || [];
  },

  async getNotifications(): Promise<Notification[]> {
    const response = await api.get<any[]>('/api/social/notifications');
    if (!response.data) return [];
    return response.data.map(r => parseApi(NotificationSchema, mapNotificationRowToNotification(r)));
  },

  async markNotificationRead(id: string): Promise<{ ok: boolean; error?: string }> {
    const response = await api.patch<{ ok: boolean }>(`/api/social/notifications/${id}/read`);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

  async getOrCreateFriendCode(userId: string): Promise<string | null> {
    try {
      const response = await api.get<{ friend_code: string | null }>(`/api/profile/${userId}`);
      if (response.data?.friend_code) {
        return response.data.friend_code;
      }
      const code = 'TOEFL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const updateResponse = await api.patch(`/api/profile/${userId}`, { friend_code: code });
      return updateResponse.error ? null : code;
    } catch {
      return null;
    }
  },

  async removeFriend(friendId: string): Promise<{ ok: boolean; error?: string }> {
    const response = await api.delete<{ ok: boolean }>(`/api/social/friends/${friendId}`);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

  async respondToRequest(requesterId: string, accept: boolean): Promise<{ ok: boolean; error?: string }> {
    const response = await api.post<{ ok: boolean }>('/api/social/friends/respond', { requester_id: requesterId, accept });
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

  async createNotification(data: any): Promise<void> {
    try {
      await api.post('/api/social/notifications', data);
    } catch {
      // Ignored for now
    }
  }
};

export default socialService;

import api, { withRetry, TIMEOUTS, RETRY_CONFIG } from './apiClient';
import { validateAuth } from './validationService';
import { secureStorage } from '../utils/secureStorage';
import { offlineSyncService } from './offlineSyncService';

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  friend_code?: string;
  hearts_count?: number;
  xp: number;
  subscription_tier: string;
  fcm_token?: string;
  user_metadata?: { full_name?: string };
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  ok: boolean;
  access_token: string;
  refresh_token: string;
  profile: Profile;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  full_name?: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
}

export interface OAuthInitResponse {
  auth_url: string;
  state: string;
}

export interface TokenRotateResponse {
  ok: boolean;
  access_token: string;
  refresh_token: string;
}


export const clearLocalUserData = () => {
  secureStorage.removeItem('access_token');
  secureStorage.removeItem('refresh_token');
  secureStorage.removeItem('pkce_code_verifier');
  sessionStorage.removeItem('oauth_state');

  const storageKeys = [
    'quiz_reports',
    'toefl_guest_id',
    'offline_queue',
    'streamquiz_history_v1',
    'streamquiz_current_session_v1',
    'toefl_quiz_session_v2',
    'toefl_question_bank_meta',
  ];
  storageKeys.forEach((key) => localStorage.removeItem(key));

  if (typeof indexedDB !== 'undefined') {
    ['toefl-question-bank'].forEach((dbName) => {
      try { indexedDB.deleteDatabase(dbName); } catch { /* best effort */ }
    });
  }
};

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const authService = {
  async register(
    data: RegisterRequest
  ): Promise<{ ok: boolean; loading?: boolean; error?: string }> {
    if (!data.username || data.username.trim().length < 3) {
      return { ok: false, error: 'Username must be at least 3 characters' };
    }
    if (!data.password || data.password.length < 8) {
      return { ok: false, error: 'Password must be at least 8 characters' };
    }

    const validationError = validateAuth({
      username: data.username,
      password: data.password,
    });
    if (validationError) {
      return { ok: false, error: validationError.message };
    }

    try {
      const response = await withRetry(
        () =>
          api.post<AuthResponse>('/api/auth/register', data, {
            timeout: TIMEOUTS.auth,
          }),
        RETRY_CONFIG
      );
      if (response.error) {
        return { ok: false, error: response.error.error };
      }
      if (response.data) {
        secureStorage.setItem('access_token', response.data.access_token);
        secureStorage.setItem('refresh_token', response.data.refresh_token);

        // Migrate guest data to backend right after successful registration
        try {
          await offlineSyncService.migrateGuestDataToBackend(response.data.access_token);
        } catch (migrationError) {
          console.error('Failed to migrate guest data after registration:', migrationError);
        }

        return { ok: true };
      }
      return { ok: false, error: 'Unknown error' };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Registration failed';
      return { ok: false, error: errorMessage };
    }
  },

  async login(
    data: LoginRequest
  ): Promise<{ ok: boolean; loading?: boolean; error?: string }> {
    if (!data.username || data.username.trim().length === 0) {
      return { ok: false, error: 'Username is required' };
    }
    if (!data.password || data.password.length === 0) {
      return { ok: false, error: 'Password is required' };
    }

    const validationError = validateAuth({
      username: data.username,
      password: data.password,
    });
    if (validationError) {
      return { ok: false, error: validationError.message };
    }

    try {
      const response = await withRetry(
        () =>
          api.post<AuthResponse>('/api/auth/login', data, {
            timeout: TIMEOUTS.auth,
          }),
        RETRY_CONFIG
      );
      if (response.error) {
        return { ok: false, error: response.error.error };
      }
      if (response.data) {
        secureStorage.setItem('access_token', response.data.access_token);
        secureStorage.setItem('refresh_token', response.data.refresh_token);
        return { ok: true };
      }
      return { ok: false, error: 'Unknown error' };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Login failed';
      return { ok: false, error: errorMessage };
    }
  },

  async getProfile(): Promise<Profile | null> {
    const response = await api.get<Profile>('/api/auth/profile');
    return response.data ?? null;
  },

  async updateProfile(
    data: UpdateProfileRequest
  ): Promise<{ ok: boolean; error?: string }> {
    const response = await api.patch<Profile>('/api/auth/profile', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

  async deleteAccount(): Promise<{ ok: boolean; error?: string }> {
    const response = await api.delete<{ ok: boolean }>('/api/auth/account', {
      timeout: TIMEOUTS.auth,
    });
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    if (response.data?.ok) {
      clearLocalUserData();
      return { ok: true };
    }
    return { ok: false, error: 'Unknown error' };
  },

  async refreshToken(): Promise<{ ok: boolean; access_token?: string }> {
    const refreshToken = secureStorage.getItem('refresh_token');
    if (!refreshToken) {
      return { ok: false };
    }
    const response = await api.post<{ ok: boolean; access_token: string }>(
      '/api/auth/refresh',
      {
        refresh_token: refreshToken,
      },
      { timeout: TIMEOUTS.auth }
    );
    if (response.data?.access_token) {
      secureStorage.setItem('access_token', response.data.access_token);
      return { ok: true, access_token: response.data.access_token };
    }
    return { ok: false };
  },

  logout() {
    secureStorage.removeItem('access_token');
    secureStorage.removeItem('refresh_token');
    sessionStorage.removeItem('oauth_state');
  },

  getToken(): string | null {
    return secureStorage.getItem('access_token');
  },

  isAuthenticated(): boolean {
    return !!secureStorage.getItem('access_token');
  },

  async initOAuth(redirectUri: string): Promise<OAuthInitResponse | null> {
    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      secureStorage.setItem('pkce_code_verifier', codeVerifier);

      const response = await withRetry(
        () =>
          api.post<OAuthInitResponse>(
            '/api/auth/oauth/init',
            {
              provider: 'google',
              redirect_uri: redirectUri,
              code_challenge: codeChallenge,
            },
            { timeout: TIMEOUTS.auth }
          ),
        RETRY_CONFIG
      );
      return response.data ?? null;
    } catch {
      return null;
    }
  },

  async handleOAuthCallback(
    code: string,
    state: string
  ): Promise<{ ok: boolean; loading?: boolean; error?: string }> {
    try {
      const codeVerifier = secureStorage.getItem('pkce_code_verifier');
      if (!codeVerifier) {
        return { ok: false, error: 'Missing PKCE verifier' };
      }

      const response = await withRetry(
        () =>
          api.post<AuthResponse>(
            '/api/auth/oauth/callback',
            {
              code,
              state,
              code_verifier: codeVerifier,
            },
            { timeout: TIMEOUTS.auth }
          ),
        RETRY_CONFIG
      );
      
      // Cleanup verifier after use
      secureStorage.removeItem('pkce_code_verifier');
      
      if (response.error) {
        return { ok: false, error: response.error.error };
      }
      if (response.data) {
        secureStorage.setItem('access_token', response.data.access_token);
        secureStorage.setItem('refresh_token', response.data.refresh_token);

        // Migrate guest data to backend right after successful OAuth login/registration
        try {
          await offlineSyncService.migrateGuestDataToBackend(response.data.access_token);
        } catch (migrationError) {
          console.error('Failed to migrate guest data after OAuth:', migrationError);
        }

        return { ok: true };
      }
      return { ok: false, error: 'Unknown error' };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'OAuth callback failed';
      return { ok: false, error: errorMessage };
    }
  },

  async rotateTokens(): Promise<{ ok: boolean; access_token?: string }> {
    const refreshToken = secureStorage.getItem('refresh_token');
    if (!refreshToken) {
      return { ok: false };
    }
    try {
      const response = await withRetry(
        () =>
          api.post<TokenRotateResponse>(
            '/api/auth/oauth/rotate',
            {
              refresh_token: refreshToken,
            },
            { timeout: TIMEOUTS.auth }
          ),
        RETRY_CONFIG
      );
      if (response.data?.access_token && response.data?.refresh_token) {
        secureStorage.setItem('access_token', response.data.access_token);
        secureStorage.setItem('refresh_token', response.data.refresh_token);
        return { ok: true, access_token: response.data.access_token };
      }
      return { ok: false };
    } catch {
      return { ok: false };
    }
  },
};

export default authService;

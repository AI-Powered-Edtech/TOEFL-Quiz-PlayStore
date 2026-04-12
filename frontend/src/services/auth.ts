import api, { withRetry, TIMEOUTS, RETRY_CONFIG } from './apiClient';
import { validateAuth } from './validationService';
import { secureStorage } from '../utils/secureStorage';

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  friend_code?: string;
  hearts_count: number;
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

export const authService = {
  async register(
    data: RegisterRequest
  ): Promise<{ ok: boolean; loading?: boolean; error?: string }> {
    if (!data.username || data.username.trim().length < 3) {
      return { ok: false, error: 'Username must be at least 3 characters' };
    }
    if (!data.password || data.password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters' };
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
          api.post<AuthResponse>('/auth/register', data, {
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
          api.post<AuthResponse>('/auth/login', data, {
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
    const response = await api.get<Profile>('/auth/profile');
    return response.data ?? null;
  },

  async updateProfile(
    data: UpdateProfileRequest
  ): Promise<{ ok: boolean; error?: string }> {
    const response = await api.patch<Profile>('/auth/profile', data);
    if (response.error) {
      return { ok: false, error: response.error.error };
    }
    return { ok: true };
  },

  async refreshToken(): Promise<{ ok: boolean; access_token?: string }> {
    const refreshToken = secureStorage.getItem('refresh_token');
    if (!refreshToken) {
      return { ok: false };
    }
    const response = await api.post<{ ok: boolean; access_token: string }>(
      '/auth/refresh',
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
  },

  getToken(): string | null {
    return secureStorage.getItem('access_token');
  },

  isAuthenticated(): boolean {
    return !!secureStorage.getItem('access_token');
  },

  async initOAuth(redirectUri: string): Promise<OAuthInitResponse | null> {
    try {
      const response = await withRetry(
        () =>
          api.post<OAuthInitResponse>(
            '/auth/oauth/init',
            {
              provider: 'google',
              redirect_uri: redirectUri,
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
      const response = await withRetry(
        () =>
          api.post<AuthResponse>(
            '/auth/oauth/callback',
            {
              code,
              state,
            },
            { timeout: TIMEOUTS.auth }
          ),
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
            '/auth/oauth/rotate',
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

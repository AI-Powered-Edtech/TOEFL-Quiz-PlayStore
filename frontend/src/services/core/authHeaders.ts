import { secureStorage } from '../../utils/secureStorage';

export function getAccessToken(): string | null {
  return secureStorage.getItem('access_token');
}

export function clearAuthTokens(): void {
  secureStorage.removeItem('access_token');
  secureStorage.removeItem('refresh_token');
}

export function getAuthHeaders(options: { json?: boolean; auth?: boolean } = {}): HeadersInit {
  const { json = true, auth = true } = options;
  const token = auth ? getAccessToken() : null;
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function emitSessionExpired(): void {
  clearAuthTokens();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:session_expired'));
  }
}

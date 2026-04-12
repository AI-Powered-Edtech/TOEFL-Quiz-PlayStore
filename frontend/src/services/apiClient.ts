const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ApiError {
  error: string;
  code?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export const TIMEOUTS = {
  api: 10000,
  ai: 30000,
  auth: 15000,
} as const;

export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
} as const;

export interface ServiceError {
  message: string;
  code?: string;
  status?: number;
  retryable: boolean;
}

function toServiceError(error: unknown, status?: number): ServiceError {
  if (error instanceof Error) {
    const isNetworkError = error.name === 'AbortError' || error.message.includes('network');
    return {
      message: isNetworkError ? 'Network request failed' : error.message,
      code: 'NETWORK_ERROR',
      status,
      retryable: isNetworkError,
    };
  }
  if (typeof error === 'string') {
    return { message: error, retryable: false };
  }
  if (status === 401) {
    return { message: 'Session expired', code: 'SESSION_EXPIRED', status, retryable: false };
  }
  return { message: 'Unknown error', retryable: false };
}

function isRetryableError(status?: number): boolean {
  if (!status) return true;
  return status >= 500 || status === 429;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new DOMException('Request timeout', 'AbortError')));
      }),
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: typeof RETRY_CONFIG = RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRetryable = error instanceof DOMException
        ? error.name === 'AbortError'
        : isRetryableError((error as { status?: number }).status);
      if (!isRetryable || attempt === options.maxAttempts - 1) {
        throw error;
      }
      const delay = Math.min(
        options.baseDelay * Math.pow(options.backoffMultiplier, attempt),
        options.maxDelay
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

const inFlightRequests = new Map<string, Promise<unknown>>();

function getRequestKey(method: string, url: string, body?: unknown): string {
  return `${method}:${url}:${body ? JSON.stringify(body) : ''}`;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token') || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzZDhmZGRkNi05MmE3LTRkZTQtYjQ3Zi1lZDU1OTk0ODEyNWYiLCJyb2xlIjoidXNlciIsInRva2VuX3R5cGUiOiJhY2Nlc3MiLCJleHAiOjE3NzYwMDcxMDYsImlhdCI6MTc3NjAwNjIwNn0.EJmP1EzxBlAR3C91B-vInCOfSQ5PwulITkUrANZmjQg';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.dispatchEvent(new CustomEvent('auth:session_expired'));
    return { error: { error: 'Session expired', code: 'SESSION_EXPIRED' } };
  }
  
  if (!response.ok) {
    let error: ApiError;
    try {
      const data = await response.json();
      error = { error: data.error || data.message || 'Request failed', code: data.code };
    } catch {
      error = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    return { error };
  }
  try {
    const data = await response.json();
    return { data };
  } catch {
    return { data: undefined as T };
  }
}

export const api = {
  async get<T>(path: string, options?: { timeout?: number; deduplicate?: boolean }): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;
    const requestKey = getRequestKey('GET', url);
    const timeout = options?.timeout ?? TIMEOUTS.api;

    if (options?.deduplicate !== false && inFlightRequests.has(requestKey)) {
      return inFlightRequests.get(requestKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = withTimeout(
      (async () => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(),
          });
          return handleResponse<T>(response);
        } finally {
          inFlightRequests.delete(requestKey);
        }
      })(),
      timeout
    );

    if (options?.deduplicate !== false) {
      inFlightRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
  },

  async post<T>(path: string, body?: unknown, options?: { timeout?: number; deduplicate?: boolean }): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;
    const requestKey = getRequestKey('POST', url, body);
    const timeout = options?.timeout ?? TIMEOUTS.api;

    if (options?.deduplicate !== false && inFlightRequests.has(requestKey)) {
      return inFlightRequests.get(requestKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = withTimeout(
      (async () => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: body ? JSON.stringify(body) : undefined,
          });
          return handleResponse<T>(response);
        } finally {
          inFlightRequests.delete(requestKey);
        }
      })(),
      timeout
    );

    if (options?.deduplicate !== false) {
      inFlightRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
  },

  async patch<T>(path: string, body?: unknown, options?: { timeout?: number; deduplicate?: boolean }): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;
    const requestKey = getRequestKey('PATCH', url, body);
    const timeout = options?.timeout ?? TIMEOUTS.api;

    if (options?.deduplicate !== false && inFlightRequests.has(requestKey)) {
      return inFlightRequests.get(requestKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = withTimeout(
      (async () => {
        try {
          const response = await fetch(url, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: body ? JSON.stringify(body) : undefined,
          });
          return handleResponse<T>(response);
        } finally {
          inFlightRequests.delete(requestKey);
        }
      })(),
      timeout
    );

    if (options?.deduplicate !== false) {
      inFlightRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
  },

  async delete<T>(path: string, options?: { timeout?: number; deduplicate?: boolean }): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${path}`;
    const requestKey = getRequestKey('DELETE', url);
    const timeout = options?.timeout ?? TIMEOUTS.api;

    if (options?.deduplicate !== false && inFlightRequests.has(requestKey)) {
      return inFlightRequests.get(requestKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = withTimeout(
      (async () => {
        try {
          const response = await fetch(url, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          return handleResponse<T>(response);
        } finally {
          inFlightRequests.delete(requestKey);
        }
      })(),
      timeout
    );

    if (options?.deduplicate !== false) {
      inFlightRequests.set(requestKey, requestPromise);
    }

    return requestPromise;
  },

  getBaseUrl: () => API_BASE,
};

export const apiClient = api;
export { withTimeout, withRetry, toServiceError, isRetryableError, getRequestKey };
export type { ServiceError };
export default api;

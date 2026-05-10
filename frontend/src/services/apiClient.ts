import { ApiResponse, ApiErrorPayload } from './core/apiErrors';
import { API_BASE_URL } from './core/endpointRegistry';
import { httpRequest, getRequestKey, toApiClientError } from './core/httpClient';
import { TIMEOUTS, RETRY_CONFIG, withRetry, withTimeout } from './core/retryPolicy';

export type ApiError = ApiErrorPayload;
export type { ApiResponse };

export interface ServiceError {
  message: string;
  code?: string;
  status?: number;
  retryable: boolean;
}

function toServiceError(error: unknown, status?: number): ServiceError {
  const normalized = toApiClientError(error);
  return {
    message: normalized.message,
    code: normalized.code || (status === 401 ? 'SESSION_EXPIRED' : undefined),
    status: normalized.status ?? status,
    retryable: normalized.retryable,
  };
}

function isRetryableError(status?: number): boolean {
  if (!status) return true;
  return status === 408 || status === 429 || status >= 500;
}

async function asApiResponse<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    return { data: await fn() };
  } catch (error) {
    return { error: toApiClientError(error).toPayload() };
  }
}

export const api = {
  async get<T>(path: string, options?: { timeout?: number; deduplicate?: boolean }): Promise<ApiResponse<T>> {
    return asApiResponse(() => httpRequest<T>({
      baseUrl: API_BASE_URL,
      path,
      method: 'GET',
      timeoutMs: options?.timeout ?? TIMEOUTS.api,
      deduplicate: options?.deduplicate,
    }));
  },

  async post<T>(path: string, body?: unknown, options?: { timeout?: number; deduplicate?: boolean }): Promise<ApiResponse<T>> {
    return asApiResponse(() => httpRequest<T>({
      baseUrl: API_BASE_URL,
      path,
      method: 'POST',
      body,
      timeoutMs: options?.timeout ?? TIMEOUTS.api,
      deduplicate: options?.deduplicate,
    }));
  },

  async patch<T>(path: string, body?: unknown, options?: { timeout?: number; deduplicate?: boolean }): Promise<ApiResponse<T>> {
    return asApiResponse(() => httpRequest<T>({
      baseUrl: API_BASE_URL,
      path,
      method: 'PATCH',
      body,
      timeoutMs: options?.timeout ?? TIMEOUTS.api,
      deduplicate: options?.deduplicate,
    }));
  },

  async delete<T>(path: string, options?: { timeout?: number; deduplicate?: boolean }): Promise<ApiResponse<T>> {
    return asApiResponse(() => httpRequest<T>({
      baseUrl: API_BASE_URL,
      path,
      method: 'DELETE',
      timeoutMs: options?.timeout ?? TIMEOUTS.api,
      deduplicate: options?.deduplicate,
    }));
  },

  getBaseUrl: () => API_BASE_URL,
};

export const apiClient = api;
export { TIMEOUTS, RETRY_CONFIG, withTimeout, withRetry, toServiceError, isRetryableError, getRequestKey };
export default api;

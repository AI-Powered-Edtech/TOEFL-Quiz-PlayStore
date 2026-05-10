export interface ApiErrorPayload {
  error: string;
  code?: string;
  status?: number;
  details?: unknown;
  retryable?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiErrorPayload;
}

export class ApiClientError extends Error {
  code?: string;
  status?: number;
  details?: unknown;
  retryable: boolean;

  constructor(payload: ApiErrorPayload) {
    super(payload.error || 'Request failed');
    this.name = 'ApiClientError';
    this.code = payload.code;
    this.status = payload.status;
    this.details = payload.details;
    this.retryable = payload.retryable ?? isRetryableStatus(payload.status);
  }

  toPayload(): ApiErrorPayload {
    return {
      error: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      retryable: this.retryable,
    };
  }
}

export function isRetryableStatus(status?: number): boolean {
  if (!status) return true;
  return status === 408 || status === 429 || status >= 500;
}

export async function parseErrorResponse(response: Response): Promise<ApiClientError> {
  let message = `HTTP ${response.status}: ${response.statusText}`;
  let code: string | undefined;
  let details: unknown;

  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      message = json?.error || json?.message || message;
      code = json?.code;
      details = json;
    } else {
      const text = await response.text();
      if (text) message = text.slice(0, 500);
    }
  } catch {
    // Keep status-derived message.
  }

  return new ApiClientError({
    error: response.status === 401 ? 'Session expired' : message,
    code: response.status === 401 ? 'SESSION_EXPIRED' : code,
    status: response.status,
    details,
    retryable: isRetryableStatus(response.status),
  });
}

export function normalizeApiError(error: unknown, fallback = 'Request failed'): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiClientError({ error: 'Request timeout', code: 'REQUEST_TIMEOUT', retryable: true });
  }
  if (error instanceof Error) {
    return new ApiClientError({ error: error.message || fallback, code: 'NETWORK_ERROR', retryable: true });
  }
  return new ApiClientError({ error: fallback, retryable: false });
}

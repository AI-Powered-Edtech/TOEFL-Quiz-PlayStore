import { secureStorage } from '../../utils/secureStorage';
import { ApiClientError, parseErrorResponse, normalizeApiError } from './apiErrors';
import { getAuthHeaders, emitSessionExpired } from './authHeaders';
import { assertOnline, OfflinePolicy } from './offlinePolicy';
import { RETRY_CONFIG, RetryConfig, TIMEOUTS, withRetry } from './retryPolicy';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'HEAD';
export type ResponseType = 'json' | 'text' | 'arrayBuffer' | 'void';

export interface HttpRequestOptions {
  baseUrl?: string;
  path: string;
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
  retry?: RetryConfig | false;
  deduplicate?: boolean;
  auth?: boolean;
  offlinePolicy?: OfflinePolicy;
  responseType?: ResponseType;
}

const inFlightRequests = new Map<string, Promise<unknown>>();

export function getRequestKey(method: string, url: string, body?: unknown): string {
  return `${method}:${url}:${body === undefined ? '' : JSON.stringify(body)}`;
}

function isRawBody(body: unknown): body is BodyInit {
  return typeof body === 'string'
    || body instanceof FormData
    || body instanceof Blob
    || body instanceof ArrayBuffer
    || ArrayBuffer.isView(body as ArrayBufferView);
}

function buildBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (isRawBody(body)) return body as BodyInit;
  return JSON.stringify(body);
}

function shouldSendJsonHeader(body: unknown): boolean {
  return body !== undefined && body !== null && !isRawBody(body);
}

async function parseResponse<T>(response: Response, responseType: ResponseType): Promise<T> {
  if (responseType === 'void' || response.status === 204) return undefined as T;
  if (responseType === 'arrayBuffer') return response.arrayBuffer() as Promise<T>;
  if (responseType === 'text') return response.text() as Promise<T>;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json() as Promise<T>;
  const text = await response.text();
  if (!text) return undefined as T;
  try { return JSON.parse(text) as T; } catch { return text as T; }
}


let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessTokenOnce(baseUrl: string): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = secureStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  refreshPromise = fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = await response.json().catch(() => null);
      const nextAccessToken = payload?.access_token;
      if (nextAccessToken) {
        secureStorage.setItem('access_token', nextAccessToken);
        return nextAccessToken as string;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function sendFetch(options: HttpRequestOptions, controller: AbortController): Promise<Response> {
  const method = options.method || 'GET';
  const url = `${options.baseUrl || ''}${options.path}`;
  return fetch(url, {
    method,
    headers: {
      ...getAuthHeaders({ json: shouldSendJsonHeader(options.body), auth: options.auth !== false }),
      ...(options.headers || {}),
    },
    body: buildBody(options.body),
    signal: controller.signal,
  });
}

async function executeRequest<T>(options: HttpRequestOptions): Promise<T> {
  const timeoutMs = options.timeoutMs ?? TIMEOUTS.api;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await sendFetch(options, controller);

    if (response.status === 401 && options.auth !== false) {
      const refreshed = await refreshAccessTokenOnce(options.baseUrl || '');
      if (refreshed) {
        response = await sendFetch(options, controller);
      }
      if (response.status === 401) {
        emitSessionExpired();
      }
    }

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return parseResponse<T>(response, options.responseType || 'json');
  } finally {
    clearTimeout(timeout);
  }
}

export async function httpRequest<T>(options: HttpRequestOptions): Promise<T> {
  try {
    assertOnline(options.offlinePolicy || 'fail-fast');
    const method = options.method || 'GET';
    const url = `${options.baseUrl || ''}${options.path}`;
    const key = getRequestKey(method, url, options.body);

    if (options.deduplicate !== false && inFlightRequests.has(key)) {
      return inFlightRequests.get(key) as Promise<T>;
    }

    const runner = () => executeRequest<T>(options);
    const promise = options.retry === false ? runner() : withRetry(runner, options.retry || RETRY_CONFIG);

    if (options.deduplicate !== false) {
      inFlightRequests.set(key, promise);
    }

    try {
      return await promise;
    } finally {
      inFlightRequests.delete(key);
    }
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export function toApiClientError(error: unknown): ApiClientError {
  return normalizeApiError(error);
}

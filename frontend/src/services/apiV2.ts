/**
 * Thin client for the new /api/v2/* endpoints served by the VWFD companion.
 * Kept as an adapter over core/httpClient so existing v2 services do not break.
 */
import { VWFD_BASE_URL } from './core/endpointRegistry';
import { httpRequest } from './core/httpClient';
import { TIMEOUTS } from './core/retryPolicy';

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, init?: RequestInit): Promise<T> {
  return httpRequest<T>({
    baseUrl: VWFD_BASE_URL,
    path,
    method,
    body,
    headers: init?.headers,
    timeoutMs: TIMEOUTS.api,
    deduplicate: method === 'GET',
  });
}

export const apiV2 = {
  get: <T>(p: string, init?: RequestInit) => request<T>('GET', p, undefined, init),
  post: <T>(p: string, body?: unknown, init?: RequestInit) => request<T>('POST', p, body, init),
  /** Cheap liveness probe — used by SystemHealth admin dashboard. */
  async ping(): Promise<{ ok: boolean; latencyMs: number; version?: string }> {
    const t0 = performance.now();
    try {
      const r = await request<{ status: string; version: string }>('GET', '/api/v2/health');
      return { ok: r.status === 'ok', latencyMs: Math.round(performance.now() - t0), version: r.version };
    } catch {
      return { ok: false, latencyMs: Math.round(performance.now() - t0) };
    }
  },
};

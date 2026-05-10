import { ApiClientError, isRetryableStatus, normalizeApiError } from './apiErrors';

export const TIMEOUTS = {
  api: 10000,
  ai: 30000,
  auth: 15000,
  upload: 30000,
} as const;

export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
} as const;

export type RetryConfig = typeof RETRY_CONFIG;

export function shouldRetry(error: unknown): boolean {
  if (error instanceof ApiClientError) return error.retryable || isRetryableStatus(error.status);
  if (error instanceof DOMException) return error.name === 'AbortError';
  return error instanceof Error;
}

export async function delayForAttempt(attempt: number, config: RetryConfig = RETRY_CONFIG): Promise<void> {
  const delay = Math.min(config.baseDelay * Math.pow(config.backoffMultiplier, attempt), config.maxDelay);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryConfig = RETRY_CONFIG): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === options.maxAttempts - 1) break;
      await delayForAttempt(attempt, options);
    }
  }
  throw normalizeApiError(lastError);
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new DOMException('Request timeout', 'AbortError')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

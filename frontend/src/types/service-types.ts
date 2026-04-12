export interface ServiceError {
  code: string;
  message: string;
  retryable: boolean;
  timestamp: number;
}

export interface ServiceState<T> {
  data: T | null;
  loading: boolean;
  error: ServiceError | null;
  lastUpdated: number | null;
}

export function asyncService<T>(
  fn: () => Promise<T>
): () => Promise<ServiceState<T>> {
  return async () => {
    const timestamp = Date.now();
    try {
      const data = await fn();
      return {
        data,
        loading: false,
        error: null,
        lastUpdated: timestamp
      };
    } catch (err) {
      const error = err as Error;
      return {
        data: null,
        loading: false,
        error: {
          code: error.name || 'UNKNOWN_ERROR',
          message: error.message || 'An unknown error occurred',
          retryable: false,
          timestamp
        },
        lastUpdated: null
      };
    }
  };
}

export class TimeoutError extends Error {
  isTimeout: boolean;

  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
    this.isTimeout = true;
  }
}

export class ValidationError extends Error {
  errors: Record<string, string>;
  isValidation: true;

  constructor(
    message: string = 'Validation failed',
    errors: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.isValidation = true;
  }
}

export type { ServiceError, ServiceState };

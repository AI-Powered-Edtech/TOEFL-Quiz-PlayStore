/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './Button';

// Error types for better categorization
export type ErrorType =
    | 'network'
    | 'rate_limit'
    | 'circuit_breaker'
    | 'validation'
    | 'timeout'
    | 'unknown';

export interface AppError {
    type: ErrorType;
    message: string;
    retryable: boolean;
    retryAfter?: number;
    action?: string;
    details?: string;
}

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    onRetry?: () => void;
    showDetails?: boolean;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    errorType: ErrorType;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorType: 'unknown'
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Determine error type from error message
        let errorType: ErrorType = 'unknown';

        if (error.message.includes('network') || error.message.includes('fetch')) {
            errorType = 'network';
        } else if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
            errorType = 'rate_limit';
        } else if (error.message.includes('Circuit breaker') || error.message.includes('circuit breaker')) {
            errorType = 'circuit_breaker';
        } else if (error.message.includes('validation') || error.message.includes('invalid')) {
            errorType = 'validation';
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
            errorType = 'timeout';
        }

        return {
            hasError: true,
            error,
            errorType
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary] Caught error:', error);
            console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        }

        // Call optional error handler
        this.props.onError?.(error, errorInfo);

        // Log to monitoring service (e.g., Sentry)
        this.logErrorToService(error, errorInfo);
    }

    private logErrorToService(error: Error, errorInfo: ErrorInfo): void {
        // In production, this would send to Sentry or similar
        try {
            // Dynamic import to avoid bundling in dev
            import('../services/loggingService').then(({ loggingService }) => {
                loggingService.error('ErrorBoundary', 'Uncaught error', {
                    error: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack
                }, error);
            }).catch(() => {
                // Ignore if logging service fails
            });
        } catch {
            // Ignore logging errors
        }
    }

    private handleRetry = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        this.props.onRetry?.();
    };

    private handleGoHome = (): void => {
        window.location.href = '/';
    };

    private handleReload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { error, errorType } = this.state;
            const isRetryable = errorType === 'network' || errorType === 'timeout' || errorType === 'circuit_breaker';

            return (
                <div className="min-h-[400px] flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                        {/* Error Icon */}
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>

                        {/* Error Title */}
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            {this.getErrorTitle(errorType)}
                        </h2>

                        {/* Error Message */}
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            {this.getErrorMessage(errorType, error)}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {isRetryable && (
                                <Button
                                    onClick={this.handleRetry}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Try Again
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                onClick={this.handleReload}
                                className="border-slate-300 dark:border-slate-700"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reload Page
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={this.handleGoHome}
                                className="text-slate-600 dark:text-slate-400"
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Go Home
                            </Button>
                        </div>

                        {/* Error Details (Development Mode) */}
                        {(this.props.showDetails || import.meta.env.DEV) && error && (
                            <details className="mt-6 text-left">
                                <summary className="cursor-pointer text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                                    <Bug className="w-4 h-4 inline mr-1" />
                                    Error Details
                                </summary>
                                <div className="mt-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-auto">
                                    <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                                        {error.message}
                                    </p>
                                    {error.stack && (
                                        <pre className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-all">
                                            {error.stack}
                                        </pre>
                                    )}
                                </div>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }

    private getErrorTitle(type: ErrorType): string {
        switch (type) {
            case 'network':
                return 'Connection Error';
            case 'rate_limit':
                return 'Too Many Requests';
            case 'circuit_breaker':
                return 'Service Temporarily Unavailable';
            case 'validation':
                return 'Invalid Data';
            case 'timeout':
                return 'Request Timed Out';
            default:
                return 'Something Went Wrong';
        }
    }

    private getErrorMessage(type: ErrorType, error: Error | null): string {
        switch (type) {
            case 'network':
                return 'Unable to connect to the server. Please check your internet connection and try again.';
            case 'rate_limit':
                return 'You\'ve made too many requests. Please wait a moment before trying again.';
            case 'circuit_breaker':
                return 'The service is temporarily unavailable. Our team has been notified and is working on a fix.';
            case 'validation':
                return 'The data provided is invalid. Please check your input and try again.';
            case 'timeout':
                return 'The request took too long to complete. Please try again.';
            default:
                return error?.message || 'An unexpected error occurred. Please try again or contact support if the problem persists.';
        }
    }
}

/**
 * Hook to trigger error boundary from within components
 */
export const useErrorBoundary = () => {
    const [, setError] = React.useState<Error | null>(null);

    const triggerError = React.useCallback((error: Error) => {
        setError(() => {
            throw error;
        });
    }, []);

    return { triggerError };
};

/**
 * Wrapper component for easy use with specific error types
 */
interface ErrorFallbackProps {
    error: AppError;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
    error,
    onRetry,
    onDismiss
}) => {
    return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        {error.message}
                    </p>
                    {error.retryable && onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
                        >
                            {error.action || 'Try again'}
                        </button>
                    )}
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                        aria-label="Dismiss error"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorBoundary;

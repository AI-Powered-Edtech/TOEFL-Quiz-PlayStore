/**
 * Error Toast System
 * Provides user-friendly error notifications with retry capabilities
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle,
    AlertTriangle,
    Info,
    CheckCircle,
    X,
    RefreshCw,
    WifiOff,
    Clock,
    Shield
} from 'lucide-react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { Button } from '../Button';

// Types
export type ToastType = 'error' | 'warning' | 'info' | 'success';
export type ErrorCategory = 'network' | 'rate_limit' | 'circuit_breaker' | 'validation' | 'timeout' | 'permission' | 'unknown';

export interface ToastMessage {
    id: string;
    type: ToastType;
    category?: ErrorCategory;
    title: string;
    message: string;
    duration?: number;
    retryable?: boolean;
    retryAfter?: number;
    retryAction?: () => Promise<void> | void;
    dismissible?: boolean;
    actions?: ToastAction[];
}

export interface ToastAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
}

interface ToastContextValue {
    toasts: ToastMessage[];
    addToast: (toast: Omit<ToastMessage, 'id'>) => string;
    removeToast: (id: string) => void;
    clearAllToasts: () => void;
    showError: (error: unknown, options?: Partial<ToastMessage>) => string;
    showNetworkError: (retryAction?: () => Promise<void>) => string;
    showRateLimitError: (retryAfter?: number) => string;
    showSuccess: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Generate unique ID
const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Default durations by type
const DEFAULT_DURATIONS: Record<ToastType, number> = {
    error: 8000,
    warning: 6000,
    info: 5000,
    success: 4000
};

// Icons by type
const ToastIcons: Record<ToastType, React.FC<{ className?: string }>> = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle
};

// Category-specific icons
const CategoryIcons: Record<ErrorCategory, React.FC<{ className?: string }>> = {
    network: WifiOff,
    rate_limit: Clock,
    circuit_breaker: Shield,
    validation: AlertTriangle,
    timeout: Clock,
    permission: Shield,
    unknown: AlertCircle
};

// Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = useCallback((toast: Omit<ToastMessage, 'id'>): string => {
        const id = generateId();
        const newToast: ToastMessage = {
            ...toast,
            id,
            duration: toast.duration ?? DEFAULT_DURATIONS[toast.type],
            dismissible: toast.dismissible ?? true
        };

        setToasts(prev => [...prev, newToast]);
        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearAllToasts = useCallback(() => {
        setToasts([]);
    }, []);

    // Parse error to toast message
    const parseError = (error: unknown): { title: string; message: string; category: ErrorCategory; retryable: boolean } => {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
                return {
                    title: 'Connection Error',
                    message: 'Unable to connect to the server. Please check your internet connection.',
                    category: 'network',
                    retryable: true
                };
            }

            if (message.includes('rate limit') || message.includes('too many')) {
                return {
                    title: 'Too Many Requests',
                    message: 'You\'ve made too many requests. Please wait a moment before trying again.',
                    category: 'rate_limit',
                    retryable: true
                };
            }

            if (message.includes('circuit breaker') || message.includes('service unavailable')) {
                return {
                    title: 'Service Temporarily Unavailable',
                    message: 'The service is temporarily unavailable. Please try again in a moment.',
                    category: 'circuit_breaker',
                    retryable: true
                };
            }

            if (message.includes('timeout') || message.includes('timed out')) {
                return {
                    title: 'Request Timed Out',
                    message: 'The request took too long. Please try again.',
                    category: 'timeout',
                    retryable: true
                };
            }

            if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
                return {
                    title: 'Permission Denied',
                    message: 'You don\'t have permission to perform this action.',
                    category: 'permission',
                    retryable: false
                };
            }

            if (message.includes('validation') || message.includes('invalid')) {
                return {
                    title: 'Invalid Input',
                    message: error.message,
                    category: 'validation',
                    retryable: false
                };
            }

            return {
                title: 'Error',
                message: error.message,
                category: 'unknown',
                retryable: false
            };
        }

        return {
            title: 'Error',
            message: String(error),
            category: 'unknown',
            retryable: false
        };
    };

    const showError = useCallback((error: unknown, options?: Partial<ToastMessage>): string => {
        const parsed = parseError(error);

        return addToast({
            type: 'error',
            title: options?.title ?? parsed.title,
            message: options?.message ?? parsed.message,
            category: parsed.category,
            retryable: options?.retryable ?? parsed.retryable,
            ...options
        });
    }, [addToast]);

    const showNetworkError = useCallback((retryAction?: () => Promise<void>): string => {
        return addToast({
            type: 'error',
            category: 'network',
            title: 'Connection Error',
            message: 'Unable to connect to the server. Please check your internet connection.',
            retryable: true,
            retryAction
        });
    }, [addToast]);

    const showRateLimitError = useCallback((retryAfter?: number): string => {
        return addToast({
            type: 'warning',
            category: 'rate_limit',
            title: 'Too Many Requests',
            message: `Please wait ${retryAfter ? `${Math.ceil(retryAfter / 60)} minutes` : 'a moment'} before trying again.`,
            retryable: true,
            retryAfter
        });
    }, [addToast]);

    const showSuccess = useCallback((message: string, title = 'Success'): string => {
        return addToast({
            type: 'success',
            title,
            message
        });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{
            toasts,
            addToast,
            removeToast,
            clearAllToasts,
            showError,
            showNetworkError,
            showRateLimitError,
            showSuccess
        }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
};

// Container for all toasts
const ToastContainer: React.FC<{
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
    return (
        <div
            className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
            aria-live="polite"
            aria-label="Notifications"
        >
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={() => onDismiss(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

// Individual toast item
const ToastItem: React.FC<{
    toast: ToastMessage;
    onDismiss: () => void;
}> = ({ toast, onDismiss }) => {
    const [isRetrying, setIsRetrying] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Auto-dismiss
    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(onDismiss, toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast.duration, onDismiss]);

    // Countdown for rate limit
    useEffect(() => {
        if (toast.retryAfter && toast.retryAfter > 0) {
            setCountdown(toast.retryAfter);

            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev && prev > 1) return prev - 1;
                    clearInterval(interval);
                    return null;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [toast.retryAfter]);

    const handleRetry = async () => {
        if (!toast.retryAction) return;

        setIsRetrying(true);
        try {
            await toast.retryAction();
            onDismiss();
        } catch (error) {
            // Keep toast visible on retry failure
            console.error('[Toast] Retry failed:', error);
        } finally {
            setIsRetrying(false);
        }
    };

    // Get appropriate icon
    const Icon = toast.category ? CategoryIcons[toast.category] : ToastIcons[toast.type];

    // Color schemes
    const colorSchemes = {
        error: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800',
            icon: 'text-red-600 dark:text-red-400',
            title: 'text-red-800 dark:text-red-200',
            message: 'text-red-700 dark:text-red-300'
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            icon: 'text-amber-600 dark:text-amber-400',
            title: 'text-amber-800 dark:text-amber-200',
            message: 'text-amber-700 dark:text-amber-300'
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800',
            icon: 'text-blue-600 dark:text-blue-400',
            title: 'text-blue-800 dark:text-blue-200',
            message: 'text-blue-700 dark:text-blue-300'
        },
        success: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800',
            icon: 'text-green-600 dark:text-green-400',
            title: 'text-green-800 dark:text-green-200',
            message: 'text-green-700 dark:text-green-300'
        }
    };

    const colors = colorSchemes[toast.type];

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`
                pointer-events-auto
                ${colors.bg} ${colors.border}
                border rounded-xl shadow-lg p-4
            `}
            role="alert"
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 ${colors.icon}`}>
                    <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${colors.title}`}>
                        {toast.title}
                    </h4>
                    <p className={`text-sm mt-1 ${colors.message}`}>
                        {toast.message}
                    </p>

                    {/* Countdown */}
                    {countdown && (
                        <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">
                            Retry available in {countdown} seconds
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                        {toast.retryable && toast.retryAction && (
                            <Button
                                size="sm"
                                onClick={handleRetry}
                                disabled={isRetrying || (countdown !== null && countdown > 0)}
                                className="h-8 px-3 text-xs"
                            >
                                {isRetrying ? (
                                    <>
                                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                        Retrying...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Retry
                                    </>
                                )}
                            </Button>
                        )}

                        {toast.actions?.map((action, index) => (
                            <Button
                                key={index}
                                size="sm"
                                variant={action.variant === 'primary' ? 'primary' : action.variant === 'secondary' ? 'outline' : 'ghost'}
                                onClick={action.onClick}
                                className="h-8 px-3 text-xs"
                                type="button"
                            >
                                {action.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Dismiss button */}
                {toast.dismissible && (
                    <button
                        onClick={onDismiss}
                        className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${colors.icon}`}
                        aria-label="Dismiss notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

// Hook to use toast
export const useToast = (): ToastContextValue => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Export convenience functions for use outside React components
export const toast = {
    error: (message: string, title = 'Error') => {
        // This would need to be connected to the provider
        console.error(`[Toast Error] ${title}: ${message}`);
    },
    success: (message: string, title = 'Success') => {
        console.log(`[Toast Success] ${title}: ${message}`);
    }
};

export default ToastProvider;

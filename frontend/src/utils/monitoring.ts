import * as Sentry from '@sentry/react';

import { supabase } from '../services/supabase';

interface LogContext {
    userId?: string;
    sessionId?: string;
    skillId?: string;
    level?: string;
    [key: string]: unknown;
}

enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error',
    CRITICAL = 'critical',
}

/**
 * Error Log Entry for Supabase
 */
interface ErrorLogEntry {
    level: string;
    service: string;
    message: string;
    context?: Record<string, unknown>;
    stack_trace?: string;
    user_id?: string;
    session_id?: string;
    environment?: string;
    user_agent?: string;
    url?: string;
}

export class Logger {
    private service: string;
    private sessionId: string;
    private logBuffer: ErrorLogEntry[] = [];
    private flushTimer?: NodeJS.Timeout;
    private isErrorLoggingEnabled: boolean;

    constructor(serviceName: string) {
        this.service = serviceName;
        this.sessionId = this.generateSessionId();
        this.isErrorLoggingEnabled = import.meta.env.VITE_ENABLE_ERROR_LOGGING === 'true' || import.meta.env.PROD;

        // Auto-flush logs every 5 seconds (always needed for metrics)
        if (typeof window !== 'undefined') {
            this.startAutoFlush();
        }
    }

    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private startAutoFlush() {
        this.flushTimer = setInterval(() => {
            this.flush();
        }, 5000);

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this.flush();
        });
    }

    private log(level: LogLevel, message: string, context?: LogContext) {
        // Save to Supabase (only for errors, warnings, and critical)
        const consoleMethod = level === LogLevel.ERROR || level === LogLevel.CRITICAL
            ? console.error
            : level === LogLevel.WARN
                ? console.warn
                : console.log;

        if (import.meta.env.DEV) {
            consoleMethod(`[${this.service}] ${message}`, context || '');
        }

        // Save to Supabase (only for errors, warnings, and critical)
        if (this.isErrorLoggingEnabled && (level === LogLevel.ERROR || level === LogLevel.WARN || level === LogLevel.CRITICAL)) {
            // Send to Sentry
            if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
                Sentry.captureMessage(message, {
                    level: level === LogLevel.CRITICAL ? 'fatal' : 'error',
                    extra: { ...context, service: this.service, sessionId: this.sessionId },
                    tags: { service: this.service, environment: import.meta.env.MODE }
                });
            } else if (level === LogLevel.WARN) {
                Sentry.captureMessage(message, {
                    level: 'warning',
                    extra: { ...context, service: this.service, sessionId: this.sessionId },
                    tags: { service: this.service, environment: import.meta.env.MODE }
                });
            }

            this.addToBuffer({
                level: level.toString(),
                service: this.service,
                message,
                context: context || {},
                user_id: context?.userId,
                session_id: this.sessionId,
                environment: import.meta.env.PROD ? 'production' : 'development',
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                url: typeof window !== 'undefined' ? window.location.href : undefined,
            });
        }
    }

    private addToBuffer(entry: ErrorLogEntry) {
        this.logBuffer.push(entry);

        // Flush immediately for critical errors or when buffer is full
        if (entry.level === 'critical' || this.logBuffer.length >= 10) {
            this.flush();
        }
    }

    private async flush() {
        if (this.logBuffer.length === 0) return;

        // Don't flush to Supabase if not authenticated (prevents RLS 403)
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session) {
            this.logBuffer = [];
            return;
        }

        const logsToSend = [...this.logBuffer];
        this.logBuffer = [];

        try {
            const { error } = await supabase
                .from('error_logs')
                .insert(logsToSend);

            if (error) {
                console.error('[Logger] Failed to save logs:', error);
                // Put failed logs back in buffer
                this.logBuffer.push(...logsToSend);
            }
        } catch (err) {
            console.error('[Logger] Exception while flushing:', err);
        }
    }

    debug(message: string, context?: LogContext) {
        this.log(LogLevel.DEBUG, message, context);
    }

    info(message: string, context?: LogContext) {
        this.log(LogLevel.INFO, message, context);
    }

    warn(message: string, context?: LogContext) {
        this.log(LogLevel.WARN, message, context);
    }

    error(message: string, context?: LogContext) {
        this.log(LogLevel.ERROR, message, context);
    }

    critical(message: string, context?: LogContext) {
        this.log(LogLevel.CRITICAL, message, context);
    }

    /**
     * Log a metric (specifically for dashboard monitoring).
     * Always writes to Supabase regardless of environment,
     * since metrics are essential for the monitoring dashboard.
     * Does NOT ping Sentry.
     */
    metric(message: string, context?: LogContext) {
        // Console logging in dev
        if (import.meta.env.DEV) {
            console.log(`[${this.service} METRIC] ${message}`, context || '');
        }

        // Always save metrics to Supabase for the monitoring dashboard
        this.addToBuffer({
            level: LogLevel.INFO.toString(),
            service: this.service,
            message,
            context: context || {},
            user_id: context?.userId,
            session_id: this.sessionId,
            environment: import.meta.env.PROD ? 'production' : 'development',
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
        });
    }

    /**
     * Log exceptions with full stack trace
     */
    logException(error: Error, context?: LogContext) {
        console.error(`[${this.service}] Exception:`, error);

        if (this.isErrorLoggingEnabled) {
            Sentry.captureException(error, {
                extra: {
                    ...context,
                    service: this.service,
                    sessionId: this.sessionId,
                    errorName: error.name
                },
                tags: { service: this.service, environment: import.meta.env.MODE }
            });

            this.addToBuffer({
                level: 'error',
                service: this.service,
                message: error.message,
                context: {
                    ...context,
                    errorName: error.name,
                },
                stack_trace: error.stack,
                user_id: context?.userId,
                session_id: this.sessionId,
                environment: import.meta.env.PROD ? 'production' : 'development',
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
                url: typeof window !== 'undefined' ? window.location.href : undefined,
            });
        }
    }
}

/**
 * Initialize monitoring (no external service needed)
 */
export function initializeMonitoring() {
    console.log('[Monitoring] DIY error logging initialized');

    if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_ERROR_LOGGING === 'true') {
        console.log('[Monitoring] Errors will be saved to Supabase');
    } else {
        console.log('[Monitoring] Error logging to Supabase is disabled in development');
    }
}

// Service-specific loggers
export const logicWeaverLogger = new Logger('LogicWeaver');
export const masonLogger = new Logger('Mason');
export const apiLogger = new Logger('API');
export const cacheLogger = new Logger('Cache');
export const groqLogger = new Logger('Groq');
export const peerReviewLogger = new Logger('PeerReview');

// Logging Service - Auto-flush logger with batch insert
// Provides structured logging with automatic persistence to Supabase

import { offlineQueue } from './offlineQueue';
import { supabase } from './supabase';

interface LogEntry {
    level: 'error' | 'warn' | 'info' | 'debug';
    component: string;
    message: string;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    stackTrace?: string;
}

class LoggingService {
    private queue: LogEntry[] = [];
    private flushInterval = 5000; // 5 seconds
    private maxQueueSize = 50; // Max entries before force flush
    private flushTimer: NodeJS.Timeout | null = null;
    private currentUserId?: string;
    private currentSessionId?: string;

    constructor() {
        this.startAutoFlush();

        // Flush on page unload
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.flush(true); // Synchronous flush
            });

            // Also flush on visibility change (iOS/Android background)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.flush();
                }
            });
        }
    }

    private startAutoFlush() {
        if (this.flushTimer) return;

        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }

    private async flush(sync = false) {
        if (this.queue.length === 0) return;

        const entries = [...this.queue];
        this.queue = [];

        const payload = entries.map(entry => ({
            level: entry.level,
            component: entry.component,
            message: entry.message,
            user_id: entry.userId || this.currentUserId,
            session_id: entry.sessionId || this.currentSessionId,
            metadata: entry.metadata,
            stack_trace: entry.stackTrace,
            timestamp: new Date().toISOString() // Let the JS client generate mapping
        }));

        try {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                // Not authenticated, drop logs to prevent 403 RLS Forbidden
                return;
            }

            if (sync && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
                // Use sendBeacon for synchronous unload
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/app_logs`, blob);
            } else {
                // Normal async insert
                const { error } = await supabase
                    .from('app_logs')
                    .insert(payload);

                if (error) {
                    console.error('[LoggingService] Flush failed:', error);
                    // Re-queue on failure (but limit to prevent infinite growth)
                    if (this.queue.length < this.maxQueueSize * 2) {
                        this.queue.push(...entries);
                    }
                }
            }
        } catch (e) {
            console.error('[LoggingService] Flush exception:', e);

            // If offline, queue for later
            if (!navigator.onLine) {
                console.log('[LoggingService] Offline, queueing logs');
                await offlineQueue.enqueue({
                    type: 'log',
                    payload: payload,
                    timestamp: Date.now()
                });
            }
        }
    }

    private log(entry: LogEntry) {
        // Add to queue
        this.queue.push({
            ...entry,
            userId: entry.userId || this.currentUserId,
            sessionId: entry.sessionId || this.currentSessionId
        });

        // Immediate flush if queue is full
        if (this.queue.length >= this.maxQueueSize) {
            this.flush();
        }

        // Console output in development
        if (import.meta.env.DEV) {
            const style = entry.level === 'error' ? 'color: red; font-weight: bold' :
                entry.level === 'warn' ? 'color: orange' :
                    entry.level === 'info' ? 'color: blue' :
                        'color: gray';

            console.log(
                `%c[${entry.level.toUpperCase()}] [${entry.component}]`,
                style,
                entry.message,
                entry.metadata || ''
            );
        }
    }

    /**
     * Log an error with optional stack trace
     */
    error(component: string, message: string, metadata?: Record<string, any>, error?: Error) {
        this.log({
            level: 'error',
            component,
            message,
            metadata: {
                ...metadata,
                errorName: error?.name,
                errorMessage: error?.message
            },
            stackTrace: error?.stack
        });
    }

    /**
     * Log a warning
     */
    warn(component: string, message: string, metadata?: Record<string, any>) {
        this.log({ level: 'warn', component, message, metadata });
    }

    /**
     * Log an informational message
     */
    info(component: string, message: string, metadata?: Record<string, any>) {
        this.log({ level: 'info', component, message, metadata });
    }

    /**
     * Log a debug message
     */
    debug(component: string, message: string, metadata?: Record<string, any>) {
        this.log({ level: 'debug', component, message, metadata });
    }

    /**
     * Set user context for all future logs
     */
    setUser(userId: string) {
        this.currentUserId = userId;
    }

    /**
     * Set session context for all future logs
     */
    setSession(sessionId: string) {
        this.currentSessionId = sessionId;
    }

    /**
     * Manually trigger flush
     */
    async forceFlush() {
        await this.flush();
    }

    /**
     * Clear current user/session context
     */
    clearContext() {
        this.currentUserId = undefined;
        this.currentSessionId = undefined;
    }
}

export const loggingService = new LoggingService();

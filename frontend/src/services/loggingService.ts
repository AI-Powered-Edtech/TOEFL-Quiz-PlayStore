// Logging Service - Auto-flush logger with localStorage persistence

import { offlineQueue } from './offlineQueue';

interface LogEntry {
    level: 'error' | 'warn' | 'info' | 'debug';
    component: string;
    message: string;
    userId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    stackTrace?: string;
}

const LOGS_KEY = 'app_logs';

class LoggingService {
    private queue: LogEntry[] = [];
    private flushInterval = 5000;
    private maxQueueSize = 100;
    private flushTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.startAutoFlush();

        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => this.flush(true));
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this.flush();
            });
        }
    }

    private startAutoFlush() {
        if (this.flushTimer) return;
        this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }

    private async flush(_sync = false) {
        if (this.queue.length === 0) return;

        const entries = [...this.queue];
        this.queue = [];

        const payload = entries.map(entry => ({
            ...entry,
            timestamp: new Date().toISOString()
        }));

        try {
            const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
            logs.unshift(...payload);
            if (logs.length > 1000) logs.splice(1000);
            localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
        } catch (e) {
            console.error('[LoggingService] Flush failed:', e);
            if (this.queue.length < this.maxQueueSize * 2) {
                this.queue.push(...entries);
            }
        }
    }

    log(entry: LogEntry) {
        this.queue.push(entry);
        if (this.queue.length >= this.maxQueueSize) {
            this.flush();
        }
    }

    error(component: string, message: string, metadata?: Record<string, any>) {
        this.log({ level: 'error', component, message, metadata, stackTrace: new Error().stack });
    }

    warn(component: string, message: string, metadata?: Record<string, any>) {
        this.log({ level: 'warn', component, message, metadata });
    }

    info(component: string, message: string, metadata?: Record<string, any>) {
        this.log({ level: 'info', component, message, metadata });
    }

    debug(component: string, message: string, metadata?: Record<string, any>) {
        this.log({ level: 'debug', component, message, metadata });
    }

    setUserContext(userId: string, sessionId?: string) {
        if (this.queue.length > 0) {
            this.queue.forEach(e => {
                if (!e.userId) e.userId = userId;
                if (sessionId && !e.sessionId) e.sessionId = sessionId;
            });
        }
    }

    getRecentLogs(limit = 100): LogEntry[] {
        const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
        return logs.slice(0, limit);
    }

    clearLogs() {
        localStorage.removeItem(LOGS_KEY);
    }
}

export const loggingService = new LoggingService();
export default loggingService;

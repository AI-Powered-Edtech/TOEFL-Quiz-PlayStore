// Metrics Service - Batch metrics collection with localStorage

import { offlineQueue } from './offlineQueue';

interface MetricEntry {
    metricName: string;
    metricValue: number;
    unit?: string;
    component: string;
    userId?: string;
    sessionId?: string;
    tags?: Record<string, any>;
    timestamp: string;
}

const METRICS_KEY = 'app_metrics';

class MetricsService {
    private queue: MetricEntry[] = [];
    private flushInterval = 10000;
    private maxQueueSize = 100;
    private flushTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.startAutoFlush();
    }

    private startAutoFlush() {
        if (this.flushTimer) return;
        this.flushTimer = setInterval(() => this.flush(), this.flushInterval);
    }

    private async flush() {
        if (this.queue.length === 0) return;

        const entries = [...this.queue];
        this.queue = [];

        try {
            const metrics = JSON.parse(localStorage.getItem(METRICS_KEY) || '[]');
            metrics.unshift(...entries);
            if (metrics.length > 5000) metrics.splice(5000);
            localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
        } catch (e) {
            console.error('[MetricsService] Flush failed:', e);
            if (this.queue.length < this.maxQueueSize * 2) {
                this.queue.push(...entries);
            }
        }
    }

    record(entry: Omit<MetricEntry, 'timestamp'>) {
        this.queue.push({ ...entry, timestamp: new Date().toISOString() });
        if (this.queue.length >= this.maxQueueSize) this.flush();
    }

    increment(metricName: string, value: number, component: string, tags?: Record<string, any>) {
        this.record({ metricName, metricValue: value, component, tags });
    }

    gauge(metricName: string, value: number, component: string, unit?: string) {
        this.record({ metricName, metricValue: value, component, unit });
    }

    histogram(metricName: string, value: number, component: string, unit?: string) {
        this.record({ metricName, metricValue: value, component, unit });
    }

    recordCount(metricName: string, value: number, component: string, tags?: Record<string, any>) {
        this.record({ metricName, metricValue: value, component, tags });
    }

    recordTiming(metricName: string, durationMs: number, component: string, tags?: Record<string, any>) {
        this.record({ metricName, metricValue: durationMs, component, unit: 'ms', tags });
    }

    setUserContext(userId: string, sessionId?: string) {
        this.queue.forEach(e => {
            if (!e.userId) e.userId = userId;
            if (sessionId && !e.sessionId) e.sessionId = sessionId;
        });
    }

    getMetrics(limit = 100): MetricEntry[] {
        const metrics = JSON.parse(localStorage.getItem(METRICS_KEY) || '[]');
        return metrics.slice(0, limit);
    }

    clearMetrics() {
        localStorage.removeItem(METRICS_KEY);
    }
}

export const metricsService = new MetricsService();
export default metricsService;

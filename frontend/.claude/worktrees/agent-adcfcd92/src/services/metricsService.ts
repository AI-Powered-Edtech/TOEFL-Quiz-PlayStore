// Metrics Service - Batch metrics collection
// Tracks performance, engagement, and errors with auto-flush

import { offlineQueue } from './offlineQueue';
import { supabase } from './supabase';

interface MetricEntry {
    metricName: string;
    metricValue: number;
    unit?: string;
    component: string;
    userId?: string;
    sessionId?: string;
    tags?: Record<string, any>;
}

class MetricsService {
    private queue: MetricEntry[] = [];
    private flushInterval = 10000; // 10 seconds
    private maxQueueSize = 100;
    private flushTimer: NodeJS.Timeout | null = null;
    private currentUserId?: string;
    private currentSessionId?: string;

    constructor() {
        this.startAutoFlush();
    }

    private startAutoFlush() {
        if (this.flushTimer) return;

        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }

    private async flush() {
        if (this.queue.length === 0) return;

        const entries = [...this.queue];
        this.queue = [];

        try {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                // Not authenticated, drop metrics to prevent 403 RLS Forbidden
                return;
            }

            const { error } = await supabase
                .from('app_metrics')
                .insert(entries.map(entry => ({
                    metric_name: entry.metricName,
                    metric_value: entry.metricValue,
                    unit: entry.unit,
                    component: entry.component,
                    user_id: entry.userId || this.currentUserId,
                    session_id: entry.sessionId || this.currentSessionId,
                    tags: entry.tags,
                    timestamp: new Date().toISOString()
                })));

            if (error) {
                console.error('[MetricsService] Flush failed:', error);
            }
        } catch (e) {
            console.error('[MetricsService] Flush exception:', e);

            // If offline, queue for later
            if (!navigator.onLine) {
                console.log('[MetricsService] Offline, queueing metrics');
                await offlineQueue.enqueue({
                    type: 'metric',
                    payload: entries.map(entry => ({
                        metric_name: entry.metricName,
                        metric_value: entry.metricValue,
                        unit: entry.unit,
                        component: entry.component,
                        user_id: entry.userId || this.currentUserId,
                        session_id: entry.sessionId || this.currentSessionId,
                        tags: entry.tags,
                        timestamp: new Date().toISOString()
                    })),
                    timestamp: Date.now()
                });
            }
        }
    }

    private record(entry: MetricEntry) {
        this.queue.push({
            ...entry,
            userId: entry.userId || this.currentUserId,
            sessionId: entry.sessionId || this.currentSessionId
        });

        if (this.queue.length >= this.maxQueueSize) {
            this.flush();
        }
    }

    /**
     * Record a timing metric (e.g., API latency, operation duration)
     */
    recordTiming(component: string, operation: string, durationMs: number, tags?: Record<string, any>) {
        this.record({
            metricName: `${operation}_duration`,
            metricValue: durationMs,
            unit: 'ms',
            component,
            tags
        });
    }

    /**
     * Record a count metric (e.g., events, completions)
     */
    recordCount(component: string, event: string, count: number = 1, tags?: Record<string, any>) {
        this.record({
            metricName: `${event}_count`,
            metricValue: count,
            unit: 'count',
            component,
            tags
        });
    }

    /**
     * Record an error occurrence
     */
    recordError(component: string, errorType: string, tags?: Record<string, any>) {
        this.record({
            metricName: 'error_count',
            metricValue: 1,
            unit: 'count',
            component,
            tags: { ...tags, errorType }
        });
    }

    /**
     * Record a gauge metric (e.g., memory usage, cache size)
     */
    recordGauge(component: string, metric: string, value: number, unit?: string, tags?: Record<string, any>) {
        this.record({
            metricName: metric,
            metricValue: value,
            unit,
            component,
            tags
        });
    }

    /**
     * Set user context for all future metrics
     */
    setUser(userId: string) {
        this.currentUserId = userId;
    }

    /**
     * Set session context for all future metrics
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

export const metricsService = new MetricsService();

interface Metric {
    name: string;
    value: number;
    tags: Record<string, string>;
    timestamp: number;
}

type MetricType = 'counter' | 'histogram' | 'gauge';

class MetricsCollector {
    private metrics: Metric[] = [];
    private flushInterval: number = 60000; // 1 minute
    private intervalId?: NodeJS.Timeout;
    private isEnabled = import.meta.env.VITE_ENABLE_METRICS === 'true';

    constructor() {
        if (this.isEnabled) {
            this.startFlushInterval();
        }
    }

    private startFlushInterval() {
        this.intervalId = setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }

    /**
     * Increment a counter metric
     */
    increment(name: string, value: number = 1, tags: Record<string, string> = {}) {
        if (!this.isEnabled) return;

        this.metrics.push({
            name: `counter.${name}`,
            value,
            tags,
            timestamp: Date.now(),
        });
    }

    /**
     * Record a histogram value (for latencies, durations, etc.)
     */
    histogram(name: string, value: number, tags: Record<string, string> = {}) {
        if (!this.isEnabled) return;

        this.metrics.push({
            name: `histogram.${name}`,
            value,
            tags,
            timestamp: Date.now(),
        });
    }

    /**
     * Set a gauge value (for current states, counts, etc.)
     */
    gauge(name: string, value: number, tags: Record<string, string> = {}) {
        if (!this.isEnabled) return;

        this.metrics.push({
            name: `gauge.${name}`,
            value,
            tags,
            timestamp: Date.now(),
        });
    }

    /**
     * Record timing for an operation
     */
    timing(name: string, startTime: number, tags: Record<string, string> = {}) {
        const duration = Date.now() - startTime;
        this.histogram(name, duration, tags);
    }

    /**
     * Flush metrics to backend
     */
    private async flush() {
        if (this.metrics.length === 0) return;

        const metricsToSend = [...this.metrics];
        this.metrics = [];

        try {
            await this.sendMetrics(metricsToSend);
            console.log(`[Metrics] Flushed ${metricsToSend.length} metrics`);
        } catch (error) {
            console.error('[Metrics] Failed to send metrics:', error);
            // Re-add failed metrics (up to a limit to prevent memory issues)
            if (this.metrics.length < 1000) {
                this.metrics.unshift(...metricsToSend);
            }
        }
    }

    /**
     * Send metrics to backend (Supabase Edge Function or external service)
     */
    private async sendMetrics(metrics: Metric[]) {
        // In production, send to your metrics backend
        // For now, just log to console in development
        if (import.meta.env.DEV) {
            console.log('[Metrics] Buffered metrics:', this.summarizeMetrics(metrics));
            return;
        }

        // TODO: Implement actual metrics backend integration
        // Example: POST to Supabase Edge Function
        /*
        const response = await fetch('/api/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to send metrics');
        }
        */
    }

    /**
     * Summarize metrics for logging
     */
    private summarizeMetrics(metrics: Metric[]) {
        const summary: Record<string, number> = {};

        metrics.forEach(metric => {
            const key = `${metric.name}`;
            summary[key] = (summary[key] || 0) + 1;
        });

        return summary;
    }

    /**
     * Get current metrics buffer size
     */
    getBufferSize(): number {
        return this.metrics.length;
    }

    /**
     * Clear all buffered metrics
     */
    clear() {
        this.metrics = [];
    }

    /**
     * Stop the flush interval (cleanup)
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        // Flush remaining metrics
        this.flush();
    }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

// Cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        metricsCollector.stop();
    });
}

/**
 * Utility function to measure execution time
 */
export async function measureAsync<T>(
    fn: () => Promise<T>,
    metricName: string,
    tags?: Record<string, string>
): Promise<T> {
    const startTime = Date.now();

    try {
        const result = await fn();
        metricsCollector.timing(metricName, startTime, { ...tags, success: 'true' });
        return result;
    } catch (error) {
        metricsCollector.timing(metricName, startTime, { ...tags, success: 'false' });
        throw error;
    }
}

/**
 * Utility function to measure synchronous execution time
 */
export function measure<T>(
    fn: () => T,
    metricName: string,
    tags?: Record<string, string>
): T {
    const startTime = Date.now();

    try {
        const result = fn();
        metricsCollector.timing(metricName, startTime, { ...tags, success: 'true' });
        return result;
    } catch (error) {
        metricsCollector.timing(metricName, startTime, { ...tags, success: 'false' });
        throw error;
    }
}

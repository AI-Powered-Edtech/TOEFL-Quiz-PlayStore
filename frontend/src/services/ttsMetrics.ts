/**
 * TTS Performance Metrics — Structured instrumentation for TTS pipeline
 *
 * Tracks: init time, generate time, encode time, cache hits/misses,
 * provider selection, and preload performance.
 *
 * Usage:
 *   trackTTSMetric({ event: 'generate', provider: 'kitten', durationMs: 1200, textLength: 50 });
 *   getTTSSummary(); // { p50GenerateMs: 800, p95GenerateMs: 2100, cacheHitRatio: 0.65 }
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type TTSEvent =
    | 'init'
    | 'generate'
    | 'encode'
    | 'cache_hit'
    | 'cache_miss'
    | 'provider_select'
    | 'preload'
    | 'warmup';

export type TTSProvider = 'kitten' | 'sherpa-native';

export interface TTSMetric {
    event: TTSEvent;
    provider?: TTSProvider;
    durationMs?: number;
    textLength?: number;
    segmentCount?: number;
    cached?: boolean;
    meta?: Record<string, unknown>;
    timestamp: number;
}

export interface TTSSummary {
    totalEvents: number;
    generateCount: number;
    p50GenerateMs: number;
    p95GenerateMs: number;
    avgGenerateMs: number;
    cacheHitCount: number;
    cacheMissCount: number;
    cacheHitRatio: number;
    initMs: number | null;
    providerBreakdown: Record<string, number>;
    lastEventAt: number | null;
}

// ─── Circular Buffer ─────────────────────────────────────────────────────────

const MAX_BUFFER_SIZE = 100;
const metricsBuffer: TTSMetric[] = [];

// ─── Core API ────────────────────────────────────────────────────────────────

/**
 * Record a TTS metric event
 */
export function trackTTSMetric(metric: Omit<TTSMetric, 'timestamp'>): void {
    const entry: TTSMetric = { ...metric, timestamp: Date.now() };

    // Circular buffer eviction
    if (metricsBuffer.length >= MAX_BUFFER_SIZE) {
        metricsBuffer.shift();
    }
    metricsBuffer.push(entry);

    // Structured console output
    const parts = [`[TTS:${entry.event}]`];
    if (entry.provider) parts.push(`provider=${entry.provider}`);
    if (entry.durationMs != null) parts.push(`${entry.durationMs}ms`);
    if (entry.textLength != null) parts.push(`${entry.textLength}chars`);
    if (entry.segmentCount != null) parts.push(`${entry.segmentCount}segs`);
    if (entry.cached != null) parts.push(entry.cached ? '✓cached' : '✗uncached');

    console.log(`📊 ${parts.join(' ')}`);
}

/**
 * Get raw metrics buffer (last 100 events)
 */
export function getTTSMetrics(): readonly TTSMetric[] {
    return metricsBuffer;
}

/**
 * Get aggregated summary with P50/P95 calculations
 */
export function getTTSSummary(): TTSSummary {
    const generateEntries = metricsBuffer
        .filter(m => m.event === 'generate' && m.durationMs != null)
        .map(m => m.durationMs!);

    const cacheHits = metricsBuffer.filter(m => m.event === 'cache_hit').length;
    const cacheMisses = metricsBuffer.filter(m => m.event === 'cache_miss').length;
    const cacheTotal = cacheHits + cacheMisses;

    const initEntry = metricsBuffer.find(m => m.event === 'init' && m.durationMs != null);

    // Provider breakdown
    const providerBreakdown: Record<string, number> = {};
    for (const m of metricsBuffer) {
        if (m.event === 'generate' && m.provider) {
            providerBreakdown[m.provider] = (providerBreakdown[m.provider] || 0) + 1;
        }
    }

    const sorted = [...generateEntries].sort((a, b) => a - b);
    const lastEntry = metricsBuffer[metricsBuffer.length - 1];

    return {
        totalEvents: metricsBuffer.length,
        generateCount: generateEntries.length,
        p50GenerateMs: percentile(sorted, 0.50),
        p95GenerateMs: percentile(sorted, 0.95),
        avgGenerateMs: sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0,
        cacheHitCount: cacheHits,
        cacheMissCount: cacheMisses,
        cacheHitRatio: cacheTotal > 0 ? Math.round((cacheHits / cacheTotal) * 100) / 100 : 0,
        initMs: initEntry?.durationMs ?? null,
        providerBreakdown,
        lastEventAt: lastEntry?.timestamp ?? null,
    };
}

/**
 * Clear all metrics (useful for test isolation)
 */
export function clearTTSMetrics(): void {
    metricsBuffer.length = 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, idx)];
}

// ─── Dev-mode window exposure ────────────────────────────────────────────────

if (import.meta.env.DEV && typeof window !== 'undefined') {
    (window as any).__ttsMetrics = {
        getAll: getTTSMetrics,
        getSummary: getTTSSummary,
        clear: clearTTSMetrics,
    };
}

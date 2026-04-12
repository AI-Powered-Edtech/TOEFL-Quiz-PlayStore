const METRICS_KEY = 'essay_metrics_';

const getMetricsKey = (userId: string): string => `${METRICS_KEY}${userId}`;

const getLocalMetrics = (userId: string): EssayMetric[] => {
    try {
        const stored = localStorage.getItem(getMetricsKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalMetrics = (userId: string, metrics: EssayMetric[]): void => {
    localStorage.setItem(getMetricsKey(userId), JSON.stringify(metrics));
};

export interface EssayMetric {
    id: string;
    user_id: string;
    task_type: 'Task 1' | 'Task 2';
    word_count: number;
    band_score: number;
    breakdown: {
        task_response: number;
        coherence_cohesion: number;
        lexical_resource: number;
        grammatical_range: number;
    };
    time_spent_seconds: number;
    infractions: number;
    submitted_at: string;
}

export interface EssayMetricsSummary {
    totalEssays: number;
    avgBandScore: number;
    avgWordCount: number;
    avgTimeSpent: number;
    bandDistribution: Record<string, number>;
    taskTypeDistribution: { task1: number; task2: number };
    improvementTrend: { date: string; avgScore: number }[];
}

export const essayMetricsService = {

    recordMetric: async (metric: Omit<EssayMetric, 'id' | 'submitted_at'>): Promise<void> => {
        try {
            const userId = metric.user_id;
            const metrics = getLocalMetrics(userId);

            const newMetric: EssayMetric = {
                ...metric,
                id: crypto.randomUUID(),
                submitted_at: new Date().toISOString()
            };

            metrics.unshift(newMetric);
            if (metrics.length > 100) {
                metrics.splice(100);
            }

            saveLocalMetrics(userId, metrics);
            console.log('[EssayMetrics] Recorded submission:', {
                task_type: metric.task_type,
                band_score: metric.band_score,
                word_count: metric.word_count
            });
        } catch (error) {
            console.error('[EssayMetrics] Failed to record:', error);
        }
    },

    getUserSummary: async (userId: string): Promise<EssayMetricsSummary> => {
        const defaultSummary: EssayMetricsSummary = {
            totalEssays: 0,
            avgBandScore: 0,
            avgWordCount: 0,
            avgTimeSpent: 0,
            bandDistribution: {},
            taskTypeDistribution: { task1: 0, task2: 0 },
            improvementTrend: [],
        };

        try {
            const metrics = getLocalMetrics(userId);

            if (metrics.length === 0) {
                return defaultSummary;
            }

            return {
                totalEssays: metrics.length,
                avgBandScore: Math.round((metrics.reduce((sum, m) => sum + m.band_score, 0) / metrics.length) * 10) / 10,
                avgWordCount: Math.round(metrics.reduce((sum, m) => sum + m.word_count, 0) / metrics.length),
                avgTimeSpent: Math.round(metrics.reduce((sum, m) => sum + m.time_spent_seconds, 0) / metrics.length),
                bandDistribution: metrics.reduce((acc, m) => {
                    const band = Math.floor(m.band_score).toString();
                    acc[band] = (acc[band] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                taskTypeDistribution: {
                    task1: metrics.filter(m => m.task_type === 'Task 1').length,
                    task2: metrics.filter(m => m.task_type === 'Task 2').length,
                },
                improvementTrend: calculateTrend(metrics),
            };
        } catch (error) {
            console.error('[EssayMetrics] Failed to get summary:', error);
            return defaultSummary;
        }
    },

    getRecentEssays: async (userId: string, limit: number = 10): Promise<EssayMetric[]> => {
        try {
            const metrics = getLocalMetrics(userId);
            return metrics
                .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
                .slice(0, limit);
        } catch (error) {
            console.error('[EssayMetrics] Failed to get recent essays:', error);
            return [];
        }
    },

    getBandDistribution: async (): Promise<{ band: number; count: number }[]> => {
        try {
            const allMetrics: EssayMetric[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(METRICS_KEY)) {
                    const metrics = JSON.parse(localStorage.getItem(key) || '[]');
                    allMetrics.push(...metrics);
                }
            }

            const distribution: Record<number, number> = {};
            allMetrics.forEach((item) => {
                const band = Math.floor(item.band_score);
                distribution[band] = (distribution[band] || 0) + 1;
            });

            return Object.entries(distribution)
                .map(([band, count]) => ({ band: parseInt(band), count }))
                .sort((a, b) => a.band - b.band);
        } catch (error) {
            console.error('[EssayMetrics] Failed to get band distribution:', error);
            return [];
        }
    },
};

const calculateTrend = (metrics: EssayMetric[]): { date: string; avgScore: number }[] => {
    const byDate = metrics.reduce((acc, m) => {
        const date = m.submitted_at.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(m.band_score);
        return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(byDate)
        .map(([date, scores]) => ({
            date,
            avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);
};

export interface EssayProgress {
    current_band: number;
    previous_band: number | null;
    improvement: number | null;
    trend: 'improving' | 'declining' | 'stable' | 'new';
    submissions_count: number;
    average_band: number;
    weakest_criterion: string;
    strongest_criterion: string;
}

export async function getEssayProgress(userId: string): Promise<EssayProgress> {
    const metrics = getLocalMetrics(userId)
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, 10);

    if (metrics.length === 0) {
        return {
            current_band: 0,
            previous_band: null,
            improvement: null,
            trend: 'new',
            submissions_count: 0,
            average_band: 0,
            weakest_criterion: 'N/A',
            strongest_criterion: 'N/A',
        };
    }

    const current = metrics[0];
    const previous = metrics.length > 1 ? metrics[1] : null;

    return {
        current_band: current.band_score,
        previous_band: previous?.band_score || null,
        improvement: previous ? Math.round((current.band_score - previous.band_score) * 10) / 10 : null,
        trend: previous
            ? current.band_score > previous.band_score
                ? 'improving'
                : current.band_score < previous.band_score
                    ? 'declining'
                    : 'stable'
            : 'new',
        submissions_count: metrics.length,
        average_band: Math.round((metrics.reduce((s, d) => s + d.band_score, 0) / metrics.length) * 10) / 10,
        weakest_criterion: findCriterionExtreme(metrics, 'min'),
        strongest_criterion: findCriterionExtreme(metrics, 'max'),
    };
}

function findCriterionExtreme(data: EssayMetric[], mode: 'min' | 'max'): string {
    const withBreakdown = data.filter(d => d.breakdown);
    if (withBreakdown.length === 0) return 'N/A';

    const avgCriteria: Record<string, number> = {
        task_response: 0,
        coherence_cohesion: 0,
        lexical_resource: 0,
        grammatical_range: 0,
    };

    for (const row of withBreakdown) {
        avgCriteria.task_response += row.breakdown.task_response;
        avgCriteria.coherence_cohesion += row.breakdown.coherence_cohesion;
        avgCriteria.lexical_resource += row.breakdown.lexical_resource;
        avgCriteria.grammatical_range += row.breakdown.grammatical_range;
    }

    const count = withBreakdown.length;
    let result = '';
    let targetVal = mode === 'min' ? Infinity : -Infinity;

    for (const [key, val] of Object.entries(avgCriteria)) {
        const avg = val / count;
        if ((mode === 'min' && avg < targetVal) || (mode === 'max' && avg > targetVal)) {
            targetVal = avg;
            result = key;
        }
    }

    return result.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

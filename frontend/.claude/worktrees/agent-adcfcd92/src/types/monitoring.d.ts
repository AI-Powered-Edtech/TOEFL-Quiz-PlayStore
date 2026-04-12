// Monitoring & Logging Types
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    component: string;
    message: string;
    metadata?: Record<string, any>;
    userId?: string;
    sessionId?: string;
}

// Metrics Types
export interface MasonMetrics {
    timestamp: string;
    userId: string;
    sessionId: string;
    metricType: 'performance' | 'error' | 'engagement';
    metricName: string;
    value: number;
    metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
    generationTimeMs: number;
    renderTimeMs: number;
    apiLatencyMs: number;
}

export interface EngagementMetrics {
    sessionDurationMs: number;
    levelsCompleted: number;
    averageStars: number;
    comboMax: number;
}

export interface ErrorMetrics {
    errorType: string;
    errorCount: number;
    affectedUsers: number;
}

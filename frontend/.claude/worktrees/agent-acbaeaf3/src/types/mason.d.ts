// Mason Core Types
export interface MasonSessionState {
    sessionId: string;
    userId: string;
    exerciseId: string;
    skillId: string;
    gameState: MasonGameState;
    startTime: number;
    lastUpdated: number;
    status: 'in_progress' | 'completed' | 'abandoned';
}

export interface WritingExercise {
    id: string;
    level: string;
    skillId: string;
    type: 'drag_drop';
    target_sentence: string; // Changed from targetSentence to match casing in other files if needed, or keep consistent
    fragments: string[];
    explanation: string;
    translation: string;
    grammar_point?: string;
}

export interface MasonItem {
    id: string;
    content: string;
    type: 'word' | 'punctuation';
    role?: 'subject' | 'verb' | 'object' | 'modifier';
    isLocked?: boolean;
}

export interface MasonGameState {
    currentLevel: number;
    placedItems: MasonItem[];
    lives: number;
    score: number;
    combo: number;
    status: 'loading' | 'playing' | 'success' | 'error';
    startTime?: number;
    timeRemaining: number;
    maxTime: number;
    powerUps: {
        reveal: number;
        freeze: number;
        shuffle: number;
        hint: number;
    };
    streakBonus: number;
}

// Rate Limiter Types
export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

export interface RateLimitEntry {
    count: number;
    resetAt: number;
}

export interface RateLimitResult {
    allowed: boolean;
    retryAfter?: number;
}

// Circuit Breaker Types
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    resetTimeoutMs: number;
}

export interface CircuitBreakerMetrics {
    failures: number;
    successes: number;
    lastFailure?: number;
    state: CircuitState;
}

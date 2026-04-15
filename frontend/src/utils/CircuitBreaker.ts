/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascade failures when external services (like Groq API) are down.
 * 
 * States:
 * - CLOSED: Normal operation, requests go through
 * - OPEN: Service is failing, reject requests immediately
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 * 
 * @example
 * const breaker = new CircuitBreaker('GroqAPI', { failureThreshold: 5 });
 * 
 * try {
 *   const result = await breaker.execute(() => callGroqAPI());
 * } catch (error) {
 *   // Handle circuit breaker open or API error
 * }
 */

export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
    failureThreshold?: number;    // Number of failures before opening circuit
    resetTimeout?: number;         // Time in ms before attempting to close circuit
    halfOpenMaxAttempts?: number;  // Max attempts in half-open state
    monitoringWindow?: number;     // Time window for counting failures
}

export interface CircuitBreakerStats {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
    lastSuccessTime?: number;
    totalAttempts: number;
    totalFailures: number;
    totalSuccesses: number;
}

export class CircuitBreakerError extends Error {
    constructor(
        message: string,
        public state: CircuitState,
        public stats: CircuitBreakerStats
    ) {
        super(message);
        this.name = 'CircuitBreakerError';
    }
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successCount: number = 0;
    private lastFailureTime?: number;
    private lastSuccessTime?: number;
    private halfOpenAttempts: number = 0;

    // Total statistics
    private totalAttempts: number = 0;
    private totalFailures: number = 0;
    private totalSuccesses: number = 0;

    // Configuration
    private readonly failureThreshold: number;
    private readonly resetTimeout: number;
    private readonly halfOpenMaxAttempts: number;
    private readonly monitoringWindow: number;

    // State change listeners
    private stateChangeListeners: Array<(state: CircuitState) => void> = [];

    // State loaded flag
    private stateLoaded: boolean = false;

    constructor(
        private readonly name: string,
        options: CircuitBreakerOptions = {}
    ) {
        this.failureThreshold = options.failureThreshold ?? 5;
        this.resetTimeout = options.resetTimeout ?? 60000; // 1 minute
        this.halfOpenMaxAttempts = options.halfOpenMaxAttempts ?? 3;
        this.monitoringWindow = options.monitoringWindow ?? 60000; // 1 minute

        this.loadState().catch(err => {
            console.warn(`[CircuitBreaker:${this.name}] Failed to load state:`, err);
        });
    }

    private async loadState(): Promise<void> {
        try {
            const raw = localStorage.getItem(`circuit_breaker_state:${this.name}`);
            if (!raw) return;
            const data = JSON.parse(raw);

            this.state = data.state as CircuitState;
            this.failureCount = data.failure_count ?? 0;
            this.successCount = data.success_count ?? 0;
            this.halfOpenAttempts = data.half_open_attempts ?? 0;
            this.totalAttempts = data.total_attempts ?? 0;
            this.totalFailures = data.total_failures ?? 0;
            this.totalSuccesses = data.total_successes ?? 0;

            this.lastFailureTime = data.last_failure_time ? new Date(data.last_failure_time).getTime() : undefined;
            this.lastSuccessTime = data.last_success_time ? new Date(data.last_success_time).getTime() : undefined;

            this.stateLoaded = true;
        } catch (err) {
            console.error(`[CircuitBreaker:${this.name}] Failed to load state:`, err);
        }
    }

    private async saveState(): Promise<void> {
        try {
            const stateData = {
                service_name: this.name,
                state: this.state,
                failure_count: this.failureCount,
                success_count: this.successCount,
                half_open_attempts: this.halfOpenAttempts,
                total_attempts: this.totalAttempts,
                total_failures: this.totalFailures,
                total_successes: this.totalSuccesses,
                last_failure_time: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
                last_success_time: this.lastSuccessTime ? new Date(this.lastSuccessTime).toISOString() : null,
                opened_at: this.state === CircuitState.OPEN && this.lastFailureTime
                    ? new Date(this.lastFailureTime).toISOString()
                    : null,
                updated_at: new Date().toISOString()
            };
            localStorage.setItem(`circuit_breaker_state:${this.name}`, JSON.stringify(stateData));
        } catch (err) {
            console.error(`[CircuitBreaker:${this.name}] Failed to save state:`, err);
        }
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.totalAttempts++;

        // Check circuit state before execution
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.transitionTo(CircuitState.HALF_OPEN);
            } else {
                throw new CircuitBreakerError(
                    `Circuit breaker '${this.name}' is OPEN. Service temporarily unavailable.`,
                    this.state,
                    this.getStats()
                );
            }
        }

        // Execute the function
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Handle successful execution
     */
    private onSuccess(): void {
        this.successCount++;
        this.totalSuccesses++;
        this.lastSuccessTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenAttempts++;

            // If enough successful attempts in half-open, close circuit
            if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
                this.transitionTo(CircuitState.CLOSED);
                this.reset();
            }
        } else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success in closed state
            this.failureCount = 0;
        }

        // Save state to database
        this.saveState();
    }

    /**
     * Handle failed execution
     */
    private onFailure(): void {
        this.failureCount++;
        this.totalFailures++;
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            // If failure in half-open, immediately go back to open
            this.transitionTo(CircuitState.OPEN);
        } else if (this.state === CircuitState.CLOSED) {
            // Check if we've exceeded failure threshold
            if (this.failureCount >= this.failureThreshold) {
                this.transitionTo(CircuitState.OPEN);
            }
        }

        // Save state to database
        this.saveState();
    }

    /**
     * Check if we should attempt to reset (move from OPEN to HALF_OPEN)
     */
    private shouldAttemptReset(): boolean {
        if (!this.lastFailureTime) return false;
        return Date.now() - this.lastFailureTime >= this.resetTimeout;
    }

    /**
     * Transition to a new state
     */
    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;
        this.state = newState;

        console.log(`[CircuitBreaker:${this.name}] ${oldState} → ${newState}`);

        // Reset half-open attempts when entering half-open
        if (newState === CircuitState.HALF_OPEN) {
            this.halfOpenAttempts = 0;
        }

        // Notify listeners
        this.stateChangeListeners.forEach(listener => {
            try {
                listener(newState);
            } catch (error) {
                console.error('[CircuitBreaker] State change listener error:', error);
            }
        });

        // Save state to database
        this.saveState();
    }

    /**
     * Reset circuit breaker state
     */
    private reset(): void {
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenAttempts = 0;
    }

    /**
     * Manually reset circuit breaker (admin action)
     */
    public forceReset(): void {
        console.log(`[CircuitBreaker:${this.name}] Force reset`);
        this.reset();
        this.transitionTo(CircuitState.CLOSED);
    }

    /**
     * Get current statistics
     */
    public getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            totalAttempts: this.totalAttempts,
            totalFailures: this.totalFailures,
            totalSuccesses: this.totalSuccesses,
        };
    }

    /**
     * Get current state
     */
    public getState(): CircuitState {
        return this.state;
    }

    /**
     * Get failure rate (percentage)
     */
    public getFailureRate(): number {
        if (this.totalAttempts === 0) return 0;
        return (this.totalFailures / this.totalAttempts) * 100;
    }

    /**
     * Add state change listener
     */
    public onStateChange(listener: (state: CircuitState) => void): void {
        this.stateChangeListeners.push(listener);
    }

    /**
     * Remove state change listener
     */
    public removeStateChangeListener(listener: (state: CircuitState) => void): void {
        const index = this.stateChangeListeners.indexOf(listener);
        if (index > -1) {
            this.stateChangeListeners.splice(index, 1);
        }
    }

    /**
     * Check if circuit is healthy
     */
    public isHealthy(): boolean {
        return this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN;
    }
}

// Singleton instances for common services
export const groqCircuitBreaker = new CircuitBreaker('GroqAPI', {
    failureThreshold: 5,
    resetTimeout: 60000,      // 1 minute
    halfOpenMaxAttempts: 3,
});

// Log state changes in development
if (import.meta.env.DEV) {
    groqCircuitBreaker.onStateChange((state) => {
        console.log(`[GroqAPI Circuit Breaker] State changed to: ${state}`);

        if (state === CircuitState.OPEN) {
            console.warn('⚠️ Groq API circuit breaker is OPEN. Requests will be rejected.');
        } else if (state === CircuitState.HALF_OPEN) {
            console.info('🔄 Groq API circuit breaker is HALF_OPEN. Testing recovery...');
        } else if (state === CircuitState.CLOSED) {
            console.info('✅ Groq API circuit breaker is CLOSED. Service is healthy.');
        }
    });
}

// Circuit Breaker Pattern
// Prevents cascading failures when Groq API is down/slow

import type { CircuitState, CircuitBreakerConfig, CircuitBreakerMetrics } from '../../types/mason';

export class GroqCircuitBreaker {
    private metrics = new Map<string, CircuitBreakerMetrics>();
    private readonly config: CircuitBreakerConfig;

    constructor(config: CircuitBreakerConfig) {
        this.config = config;
    }

    /**
     * Execute function with circuit breaker protection
     * @param operation - Operation name for tracking
     * @param fn - Async function to execute
     * @returns Result of the function
     */
    async execute<T>(
        operation: string,
        fn: () => Promise<T>
    ): Promise<T> {
        const metrics = this.getOrCreateMetrics(operation);

        // Check circuit state
        if (metrics.state === 'OPEN') {
            const elapsed = Date.now() - (metrics.lastFailure || 0);

            if (elapsed >= this.config.resetTimeoutMs) {
                // Try half-open state
                metrics.state = 'HALF_OPEN';
                console.log(`[CircuitBreaker] ${operation}: Moving to HALF_OPEN`);
            } else {
                // Still open, reject immediately
                const retryAfter = this.config.resetTimeoutMs - elapsed;
                throw new Error(
                    `Circuit breaker OPEN for ${operation}. ` +
                    `Retry after ${Math.ceil(retryAfter / 1000)}s`
                );
            }
        }

        // Attempt execution
        try {
            const result = await fn();
            this.onSuccess(metrics, operation);
            return result;
        } catch (error) {
            this.onFailure(metrics, operation);
            throw error;
        }
    }

    /**
     * Get or create metrics for an operation
     */
    private getOrCreateMetrics(operation: string): CircuitBreakerMetrics {
        if (!this.metrics.has(operation)) {
            this.metrics.set(operation, {
                failures: 0,
                successes: 0,
                state: 'CLOSED'
            });
        }
        return this.metrics.get(operation)!;
    }

    /**
     * Handle successful execution
     */
    private onSuccess(metrics: CircuitBreakerMetrics, operation: string): void {
        if (metrics.state === 'HALF_OPEN') {
            metrics.successes++;

            if (metrics.successes >= this.config.successThreshold) {
                // Recovery successful
                metrics.state = 'CLOSED';
                metrics.failures = 0;
                metrics.successes = 0;
                delete metrics.lastFailure;
                console.log(`[CircuitBreaker] ${operation}: CLOSED (recovered)`);
            }
        } else if (metrics.state === 'CLOSED') {
            // Reset failure count on successful execution
            if (metrics.failures > 0) {
                metrics.failures = Math.max(0, metrics.failures - 1);
            }
        }
    }

    /**
     * Handle failed execution
     */
    private onFailure(metrics: CircuitBreakerMetrics, operation: string): void {
        metrics.failures++;
        metrics.lastFailure = Date.now();

        if (metrics.state === 'HALF_OPEN') {
            // Failed during half-open, go back to open
            metrics.state = 'OPEN';
            metrics.successes = 0;
            console.warn(`[CircuitBreaker] ${operation}: Back to OPEN (half-open failed)`);
        } else if (metrics.failures >= this.config.failureThreshold) {
            // Too many failures, open the circuit
            metrics.state = 'OPEN';
            console.error(
                `[CircuitBreaker] ${operation}: OPEN ` +
                `(${metrics.failures} failures, threshold: ${this.config.failureThreshold})`
            );
        }
    }

    /**
     * Get current status of an operation
     */
    getStatus(operation: string): CircuitBreakerMetrics | undefined {
        return this.metrics.get(operation);
    }

    /**
     * Force reset circuit breaker (for testing/admin)
     */
    reset(operation: string): void {
        this.metrics.delete(operation);
        console.log(`[CircuitBreaker] ${operation}: Manually reset`);
    }

    /**
     * Get all circuit statuses
     */
    getAllStatuses(): Record<string, CircuitBreakerMetrics> {
        const statuses: Record<string, CircuitBreakerMetrics> = {};
        for (const [op, metrics] of this.metrics.entries()) {
            statuses[op] = { ...metrics };
        }
        return statuses;
    }
}

// Export singleton instance
export const groqCircuitBreaker = new GroqCircuitBreaker({
    failureThreshold: 5,      // Open after 5 failures
    successThreshold: 3,      // Close after 3 successes in half-open
    resetTimeoutMs: 30000     // Try half-open after 30 seconds
});

/**
 * Custom error types for the application
 */

/**
 * Thrown when the user's AI token budget is exhausted.
 * Callers should catch this and show a user-facing message.
 */
export class TokenLimitError extends Error {
    public tokensUsed: number;
    public tokensLimit: number;

    constructor(tokensUsed: number, tokensLimit: number) {
        super(`Token limit reached (${tokensUsed}/${tokensLimit}). Please upgrade your plan or wait for token reset.`);
        this.name = 'TokenLimitError';
        this.tokensUsed = tokensUsed;
        this.tokensLimit = tokensLimit;
    }
}

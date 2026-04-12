export class TimeoutError extends Error {
    constructor(message: string = 'Request timeout') {
        super(message);
        this.name = 'TimeoutError';
    }
}

export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage?: string
): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new TimeoutError(errorMessage || `Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
    }
}

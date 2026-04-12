import { groqRateLimiter, getCurrentUserId } from '../../utils/masonRateLimiter';
import { retryWithBackoff, MASON_RETRY_CONFIG } from '../../utils/retry';
import { aiService, AI_MODELS } from '../ai';
import { groqCircuitBreaker } from './circuitBreaker';

export const cleanJson = (text: string): string => {
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<thought>[\s\S]*?<\/thought>/g, '');
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');

    const firstOpen = cleaned.indexOf('{');
    const firstSquare = cleaned.indexOf('[');

    let startIndex = -1;
    let openChar = '{';
    let closeChar = '}';

    if (firstOpen !== -1 && (firstSquare === -1 || firstOpen < firstSquare)) {
        startIndex = firstOpen;
    } else if (firstSquare !== -1) {
        startIndex = firstSquare;
        openChar = '[';
        closeChar = ']';
    }

    if (startIndex !== -1) {
        let balance = 0;
        let inString = false;
        let escape = false;

        for (let i = startIndex; i < cleaned.length; i++) {
            const char = cleaned[i];

            if (escape) {
                escape = false;
                continue;
            }

            if (char === '\\') {
                escape = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === openChar) {
                    balance++;
                } else if (char === closeChar) {
                    balance--;
                    if (balance === 0) {
                        return cleaned.substring(startIndex, i + 1);
                    }
                }
            }
        }
    }

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        return cleaned.substring(start, end + 1);
    }

    return cleaned;
};

export interface GroqMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const callGroq = async (
    messages: GroqMessage[],
    temperature: number = 0.3,
    options: { jsonMode?: boolean } = {}
) => {
    const userId = await getCurrentUserId();

    const rateLimit = await groqRateLimiter.check(userId);
    if (!rateLimit.allowed) {
        const retryAfterSec = Math.ceil((rateLimit.retryAfter || 5000) / 1000);
        throw new Error(
            `Rate limit exceeded. Please wait ${retryAfterSec} seconds before trying again.`
        );
    }

    return retryWithBackoff(async () => {
        return groqCircuitBreaker.execute('groq-api', async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);

            try {
                const startTime = performance.now();

                const result = await aiService.generate({
                    messages: messages.map(m => ({
                        role: m.role as 'user' | 'assistant',
                        content: m.content,
                    })),
                    model: AI_MODELS.POWERFUL,
                    temperature,
                    max_tokens: 6144,
                });

                clearTimeout(timeoutId);
                const durationMs = performance.now() - startTime;

                if (result.error) {
                    throw new Error(`Groq API Error: ${result.error}`);
                }

                import('../../utils/monitoring').then(({ groqLogger }) => {
                    groqLogger.metric('API Call', {
                        latency: Math.round(durationMs),
                        model: AI_MODELS.POWERFUL,
                        userId,
                    });
                }).catch(() => {});

                return result.content || '{"questions": []}';
            } catch (error: any) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('GROQ API Request Timed Out (45s)');
                }
                throw error;
            }
        });
    }, MASON_RETRY_CONFIG);
};

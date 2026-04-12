import { jsonrepair } from 'jsonrepair';

import { groqRateLimiter, getCurrentUserId } from '../../utils/masonRateLimiter';
import { retryWithBackoff, MASON_RETRY_CONFIG } from '../../utils/retry';

import { groqCircuitBreaker } from './circuitBreaker';
import { GROQ_PROXY_URL, MODEL_NAME } from './config';
import { supabase } from '../supabase';

export const cleanJson = (text: string): string => {
    // 1. Remove think blocks
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<thought>[\s\S]*?<\/thought>/g, '');

    // 2. Remove markdown code blocks
    cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '');

    // 3. Find first '{'
    const firstOpen = cleaned.indexOf('{');
    const firstSquare = cleaned.indexOf('[');

    // Determine if we should look for array or object
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

    // Fallback: simple substring (if balanced logic fails)
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
        return cleaned.substring(start, end + 1);
    }

    return cleaned;
};

/**
 * Call GROQ API via secure Edge Function proxy with rate limiting and circuit breaker
 * API key is handled server-side for security
 */
export const callGroq = async (messages: any[], temperature: number = 0.3, options: { jsonMode?: boolean } = {}) => {
    const userId = await getCurrentUserId();

    // Rate limit check — done ONCE, before any retries
    const rateLimit = await groqRateLimiter.check(userId);
    if (!rateLimit.allowed) {
        const retryAfterSec = Math.ceil((rateLimit.retryAfter || 5000) / 1000);
        throw new Error(
            `Rate limit exceeded. Please wait ${retryAfterSec} seconds before trying again.`
        );
    }

    // Retry with backoff → Circuit breaker → API call
    return retryWithBackoff(async () => {
        return groqCircuitBreaker.execute('groq-api', async () => {
            const body: any = {
                model: MODEL_NAME,
                messages,
                temperature,
                max_tokens: 6144
            };

            if (options.jsonMode) {
                body.response_format = { type: "json_object" };
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s Timeout

            try {
                // Get session for Authorization header
                const { data: { session } } = await supabase.auth.getSession();
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json'
                };
                if (session?.access_token) {
                    headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                // Call Edge Function proxy instead of GROQ API directly
                const startTime = performance.now();
                const res = await fetch(GROQ_PROXY_URL, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                const durationMs = performance.now() - startTime;

                if (!res.ok) {
                    const err = await res.text();

                    // Parse retry-after header for 429 responses
                    if (res.status === 429) {
                        const retryAfter = res.headers.get('retry-after');
                        const waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;
                        throw new Error(
                            `Rate limit exceeded (429). Please wait ${waitSec}s before trying again.`
                        );
                    }

                    throw new Error(`GROQ Proxy Error: ${res.status} - ${err}`);
                }

                const data = await res.json();

                // Log latency metric for monitoring dashboard
                import('../../utils/monitoring').then(({ groqLogger }) => {
                    groqLogger.metric('API Call', {
                        latency: Math.round(durationMs),
                        model: MODEL_NAME,
                        userId
                    });
                }).catch(() => { });

                return data.choices[0]?.message?.content || '{"questions": []}';
            } catch (error: any) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error("GROQ API Request Timed Out (45s)");
                }
                throw error;
            }
        });
    }, MASON_RETRY_CONFIG);
};


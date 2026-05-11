/**
 * Unified AI Provider
 * Exclusively uses Groq for generation.
 * All AI calls go through Groq. TTS uses Kitten TTS (Python Backend).
 */

import { CanonicalQuestionV1, SectionType } from "../types";

import { TokenLimitError } from './errors';
import { consumeToken as checkTokenBudget } from './subscriptionService';

export type AIProvider = 'groq';

export interface AIProviderOptions {
    provider?: AIProvider;
    parallel?: boolean; // Kept for interface compatibility but ignored
    maxRetries?: number;
}

const DEFAULT_OPTIONS: AIProviderOptions = {
    provider: 'groq',
    parallel: false,
    maxRetries: 1
};

/**
 * Translate raw API/infra errors into user-friendly messages.
 * TokenLimitError is re-thrown as-is since App.tsx handles it specially.
 */
function toUserFriendlyError(error: unknown): Error {
    if (error instanceof TokenLimitError) return error;

    const msg = error instanceof Error ? error.message : String(error);

    // Rate limit (429 or client-side rate limiter)
    if (msg.includes('Rate limit') || msg.includes('429')) {
        const waitMatch = msg.match(/(\d+)\s*(?:seconds?|s)\b/i);
        const waitSec = waitMatch ? waitMatch[1] : '30';
        return new Error(`AI is busy right now. Please wait ${waitSec} seconds and try again. ⏳`);
    }

    // Timeout
    if (msg.includes('Timed Out') || msg.includes('AbortError') || msg.includes('timeout')) {
        return new Error('Generation took too long. Please try again with a simpler topic. ⏱️');
    }

    // Circuit breaker open
    if (msg.includes('Circuit breaker') || msg.includes('circuit is open')) {
        return new Error('AI service is temporarily recovering. Please try again in 1-2 minutes. 🔄');
    }

    // GROQ proxy errors (400, 500, etc.)
    if (msg.includes('GROQ Proxy Error') || msg.includes('GROQ API error')) {
        if (msg.includes('400')) {
            return new Error('Question generation failed. Please try a different skill or topic. 🔄');
        }
        if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
            return new Error('AI server is temporarily down. Please try again in a moment. 🛠️');
        }
        return new Error('AI generation encountered an issue. Please try again. 🔄');
    }

    // Network errors
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch') || msg.includes('ERR_')) {
        return new Error('Network connection issue. Check your internet and try again. 📡');
    }

    // JSON parsing errors from quizGenerator
    if (msg.includes('JSON') || msg.includes('parse') || msg.includes('json_validate_failed')) {
        return new Error('AI returned an invalid response. Please try again. 🔄');
    }

    // Generic fallback — still friendly
    return new Error('Something went wrong generating questions. Please try again. 🔄');
}

/**
 * Generate quiz questions using Groq
 */
export const generateQuizUnified = async (
    topic: string,
    section: SectionType = 'STRUCTURE',
    count: number = 5,
    skillIdOverride?: number,
    options: AIProviderOptions = DEFAULT_OPTIONS
): Promise<CanonicalQuestionV1[]> => {
    console.log(`[AIProvider] Generating ${count} questions via Groq for ${topic} (${section}), skillIdOverride=${skillIdOverride ?? 'none'}`);

    // Preflight only: this checks quota without charging usage before backend generation succeeds.
    const tokenCheck = await checkTokenBudget('quiz_generation', { strict: true });
    if (!tokenCheck.allowed) {
        console.warn(`[AIProvider] Token limit reached (${tokenCheck.usage.tokens_used}/${tokenCheck.usage.tokens_limit}).`);
        throw new TokenLimitError(tokenCheck.usage.tokens_used, tokenCheck.usage.tokens_limit);
    }

    try {
        const { generateQuizBatch } = await import('./groq/generators');
        const result = await generateQuizBatch(topic, section, count, skillIdOverride);
        console.log(`[AIProvider] Groq generated ${result.length} questions`);
        return result;
    } catch (error) {
        console.warn('[AIProvider] Generation unavailable:', error);
        throw toUserFriendlyError(error);
    }
};


/**
 * Generate distractor options using Groq
 */
export const generateDistractorsUnified = async (
    sentence: string,
    correctAnswer: string,
    options: AIProviderOptions = DEFAULT_OPTIONS
): Promise<string[]> => {
    // Check token budget for distractor generation
    const tokenCheck = await checkTokenBudget('distractor_generation', { strict: true });
    if (!tokenCheck.allowed) {
        console.warn('[AIProvider] Token limit reached for distractors.');
        throw new TokenLimitError(tokenCheck.usage.tokens_used, tokenCheck.usage.tokens_limit);
    }

    try {
        const { generateDistractors } = await import('./groq/generators');
        return await generateDistractors(sentence, correctAnswer);
    } catch (error) {
        console.error('[AIProvider] Distractor generation failed:', error);
        throw toUserFriendlyError(error);
    }
};

/**
 * Check which providers are currently available
 */
export const getAvailableProviders = (): AIProvider[] => {
    return ['groq'];
};

/**
 * Get the current default provider
 */
export const getDefaultProvider = (): AIProvider => {
    return 'groq';
};

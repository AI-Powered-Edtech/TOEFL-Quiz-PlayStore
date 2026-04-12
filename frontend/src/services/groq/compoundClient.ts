/**
 * Groq Compound Client
 * API client for Groq's agentic compound model
 * Now uses VIL Backend AI service
 */

import { aiService, AI_MODELS } from '../ai';

export type CompoundModel = 'compound' | 'compound-beta' | 'compound-beta-mini';

export interface CompoundConfig {
    model?: CompoundModel;
    temperature?: number;
    maxTokens?: number;
}

export interface Citation {
    title: string;
    url: string;
    snippet?: string;
}

export interface CodeExecutionResult {
    code: string;
    output: string;
    error?: string;
}

export interface CompoundResponse {
    content: string;
    citations?: Citation[];
    executedCode?: CodeExecutionResult[];
    model: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export const callCompound = async (
    messages: Message[],
    config: CompoundConfig = {}
): Promise<CompoundResponse> => {
    const {
        temperature = 0.3,
        maxTokens = 4096
    } = config;

    try {
        const result = await aiService.generate({
            messages: messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            model: AI_MODELS.QWEN,
            temperature,
            max_tokens: maxTokens,
        });

        if (result.error) {
            throw new Error(`Compound API Error: ${result.error}`);
        }

        return {
            content: result.content || '',
            model: AI_MODELS.QWEN,
        };

    } catch (error) {
        console.error('[CompoundClient] Request failed:', error);
        throw error;
    }
};

export const extractWithCompound = async (
    pdfText: string,
    options: {
        validateWithWeb?: boolean;
        analyzeWithCode?: boolean;
    } = {}
): Promise<CompoundResponse> => {
    const systemPrompt = `You are a TOEFL Expert Agent. Extract questions from PDF text.

OUTPUT FORMAT (JSON):
{
  "detected_sections": ["structure", "written", "reading"],
  "questions": [
    {
      "section": "structure|written|reading|listening",
      "skill_id": number,
      "prompt": "Question text with ___ for blanks or {A}{B}{C}{D} for error markers",
      "choices": ["A", "B", "C", "D"],
      "correct_response": ["B"],
      "explanation": "Why this is correct"
    }
  ]
}

SECTION RULES:
- section MUST be: "structure", "written", "reading", or "listening"
- structure: Skills 1-19, fill-in-blank with ___
- written: Skills 20-60, error identification with {A}{B}{C}{D}`;

    const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract TOEFL questions from this PDF text:\n\n${pdfText.substring(0, 15000)}` }
    ];

    return callCompound(messages);
};

export const generateDistractorsWithCompound = async (
    correctAnswer: string,
    context: string,
    skillType: string
): Promise<string[]> => {
    const messages: Message[] = [
        {
            role: 'system',
            content: `Generate 3 plausible but incorrect TOEFL answer options (distractors).
Make distractors look correct at first glance but have specific errors.
Return ONLY a JSON array of 3 strings.`
        },
        {
            role: 'user',
            content: `Correct answer: ${correctAnswer}\nContext: ${context}\nGenerate 3 distractors.`
        }
    ];

    const response = await callCompound(messages, { temperature: 0.7 });

    try {
        const distractors = JSON.parse(response.content);
        if (Array.isArray(distractors) && distractors.length === 3) {
            return distractors;
        }
    } catch {
        console.warn('[CompoundClient] Failed to parse distractors');
    }

    return [];
};

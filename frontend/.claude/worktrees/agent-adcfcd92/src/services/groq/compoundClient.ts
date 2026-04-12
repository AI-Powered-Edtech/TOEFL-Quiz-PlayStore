/**
 * Groq Compound Client
 * API client for Groq's agentic compound model with web search and code execution
 * Now uses secure Edge Function proxy instead of direct API calls
 */

import { GROQ_PROXY_URL } from './config';

// ========================================
// TYPES
// ========================================

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

// ========================================
// COMPOUND CLIENT
// ========================================

/**
 * Call Groq Compound model with agentic capabilities
 * 
 * @param messages - Conversation messages
 * @param config - Model configuration
 * @returns Compound response with content, citations, and code results
 */
export const callCompound = async (
    messages: Message[],
    config: CompoundConfig = {}
): Promise<CompoundResponse> => {
    const {
        model = 'compound-beta-mini',
        temperature = 0.3,
        maxTokens = 4096
    } = config;

    console.log(`[CompoundClient] Calling ${model} via Edge Function...`);

    try {
        // Call Edge Function proxy instead of GROQ API directly
        const response = await fetch(GROQ_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No Authorization header - Edge Function handles it
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[CompoundClient] Proxy Error:', response.status, errorText);
            throw new Error(`GROQ Proxy error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Extract content from response
        const content = data.choices?.[0]?.message?.content || '';

        // Extract citations if present (Compound may include these)
        const citations: Citation[] = [];
        if (data.choices?.[0]?.message?.citations) {
            citations.push(...data.choices[0].message.citations);
        }

        // Extract executed code results if present
        const executedCode: CodeExecutionResult[] = [];
        if (data.choices?.[0]?.message?.tool_calls) {
            data.choices[0].message.tool_calls.forEach((call: any) => {
                if (call.type === 'code_interpreter') {
                    executedCode.push({
                        code: call.code || '',
                        output: call.output || '',
                        error: call.error
                    });
                }
            });
        }

        console.log(`[CompoundClient] Response received: ${content.length} chars, ${citations.length} citations`);

        return {
            content,
            citations: citations.length > 0 ? citations : undefined,
            executedCode: executedCode.length > 0 ? executedCode : undefined,
            model: data.model,
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens
            } : undefined
        };

    } catch (error) {
        console.error('[CompoundClient] Request failed:', error);
        throw error;
    }
};

/**
 * Call Compound for TOEFL question extraction
 * Specialized wrapper with TOEFL-specific prompting
 */
export const extractWithCompound = async (
    pdfText: string,
    options: {
        validateWithWeb?: boolean;
        analyzeWithCode?: boolean;
    } = {}
): Promise<CompoundResponse> => {
    const { validateWithWeb = true, analyzeWithCode = true } = options;

    const toolInstructions = [];
    if (validateWithWeb) {
        toolInstructions.push('- Use web search to validate question formats against TOEFL standards');
    }
    if (analyzeWithCode) {
        toolInstructions.push('- Use code execution to analyze text structure and word counts');
    }

    const systemPrompt = `You are a TOEFL Expert Agent. Extract questions from PDF text.

${toolInstructions.length > 0 ? 'AVAILABLE TOOLS:\n' + toolInstructions.join('\n') : ''}

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
      "explanation": "Why this is correct",
      "stimulus": { "text": "passage if reading" }
    }
  ]
}

SECTION RULES:
- section MUST be: "structure", "written", "reading", or "listening"
- structure: Skills 1-19, fill-in-blank with ___
- written: Skills 20-60, error identification with {A}{B}{C}{D}
- reading: Skills 101+, passage comprehension
- listening: Skills 201+, audio-based (mark for audio generation)`;

    const messages: Message[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract TOEFL questions from this PDF text:\n\n${pdfText.substring(0, 15000)}` }
    ];

    return callCompound(messages, { model: 'compound-beta-mini' });
};

/**
 * Generate distractors using Compound with web validation
 */
export const generateDistractorsWithCompound = async (
    correctAnswer: string,
    context: string,
    skillType: string
): Promise<string[]> => {
    const messages: Message[] = [
        {
            role: 'system',
            content: `Generate 3 plausible but incorrect TOEFL answer options (distractors).
Use web search to find common grammar mistakes for ${skillType}.
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
        console.warn('[CompoundClient] Failed to parse distractors, extracting from text');
    }

    // Fallback: extract array from response
    const match = response.content.match(/\[.*\]/s);
    if (match) {
        try {
            return JSON.parse(match[0]).slice(0, 3);
        } catch {
            // Return empty on failure
        }
    }

    return [];
};

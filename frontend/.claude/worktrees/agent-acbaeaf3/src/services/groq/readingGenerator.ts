import { callGroq, cleanJson } from './client';
import { parseJsonSafely } from './utils/jsonParser';
import { READING_DEFINE_SYSTEM_PROMPT, READING_EXPLAIN_SYSTEM_PROMPT } from './prompts/readingPrompts';

export interface DefinitionResult {
    word: string;
    partOfSpeech: string;
    phonetic: string;
    definition: string;
    example: string;
}

export interface ExplanationResult {
    title: string;
    explanation: string;
    keyTakeaway: string;
}

/**
 * Gets a contextual definition for a selected word or phrase from the TOEFL reading text.
 */
export const generateDefinition = async (
    selectedText: string,
    contextText: string,
    skillContext?: string
): Promise<DefinitionResult> => {
    const prompt = `
Context Paragraph:
"""
${contextText}
"""

Skill Context (Optional): ${skillContext || 'General Reading'}

The user has selected the following word or phrase to be defined:
>>> "${selectedText}" <<<

Provide the definition, part of speech, phonetic spelling, and a clear example sentence based strictly on how it is used in the Context Paragraph. Provide the response as JSON.`;

    const messages = [
        { role: 'system', content: READING_DEFINE_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
    ];

    try {
        const responseText = await callGroq(messages, 0.2, { jsonMode: true });
        const cleanedData = cleanJson(responseText);
        const data = parseJsonSafely(cleanedData);

        if (!data || !data.definition) {
            throw new Error("Invalid definition format received from AI.");
        }

        return data as DefinitionResult;
    } catch (error) {
        console.error("Error generating definition:", error);
        throw error;
    }
};

/**
 * Gets a grammatical or structural explanation for a selected phrase from the TOEFL reading text.
 */
export const generateExplanation = async (
    selectedText: string,
    contextText: string,
    skillContext?: string
): Promise<ExplanationResult> => {
    const prompt = `
Context Paragraph:
"""
${contextText}
"""

Skill Context (Optional): ${skillContext || 'General Structure'}

The user wants you to explain the grammatical structure or mechanics of the following selected text:
>>> "${selectedText}" <<<

Provide a title, an explanation suitable for an intermediate English learner, and a key takeaway rule. Base your explanation on the provided Context Paragraph. Provide the response as JSON.`;

    const messages = [
        { role: 'system', content: READING_EXPLAIN_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
    ];

    try {
        const responseText = await callGroq(messages, 0.3, { jsonMode: true });
        const cleanedData = cleanJson(responseText);
        const data = parseJsonSafely(cleanedData);

        if (!data || !data.explanation) {
            throw new Error("Invalid explanation format received from AI.");
        }

        return data as ExplanationResult;
    } catch (error) {
        console.error("Error generating explanation:", error);
        throw error;
    }
};

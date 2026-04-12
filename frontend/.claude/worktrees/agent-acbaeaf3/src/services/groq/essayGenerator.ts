import { callGroq, cleanJson } from './client';
import { parseJsonSafely } from './utils/jsonParser';

/**
 * Generate Essay Writing Task (Task 1 or Task 2)
 */
export const generateEssayTask = async (
    type: 'Task 1' | 'Task 2'
): Promise<any> => {
    // API key is handled by Edge Function

    const { TASK_1_PROMPT, TASK_2_PROMPT } = await import('./prompts/essayPrompts');

    const systemPrompt = "You are an expert IELTS/TOEFL exam creator. Return ONLY valid JSON.";
    const userPrompt = type === 'Task 1' ? TASK_1_PROMPT : TASK_2_PROMPT;
    // Inject randomness
    const topics = ["Education", "Environment", "Technology", "Society", "Health", "Crime", "Government", "Family", "Work"];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const uniqueSeed = Date.now().toString(36);

    const enhancedUserPrompt = `${userPrompt}\n\nTOPIC CATEGORY: ${randomTopic}\nUNIQUENESS SEED: ${uniqueSeed}\nGenerate a unique and challenging prompt.`;

    try {
        const content = await callGroq([
            { role: "system", content: systemPrompt },
            { role: "user", content: enhancedUserPrompt }
        ], 0.9, { jsonMode: true });

        const cleaned = cleanJson(content);
        let parsed;
        try {
            parsed = parseJsonSafely(cleaned);
        } catch (e) {
            console.warn("[EssayGenerator] Repair failed, trying raw parse", e);
            parsed = JSON.parse(cleaned);
        }

        return parsed;

    } catch (e) {
        console.error("[EssayGenerator] Generation failed:", e);
        throw e;
    }
};

/**
 * Generate a Band 9 Model Essay with annotations
 */
export const generateModelEssay = async (
    topic?: string
): Promise<any> => {
    // API key is handled by Edge Function

    const { MODEL_ESSAY_SYSTEM_PROMPT } = await import('./prompts/essayPrompts');

    const userPrompt = topic
        ? `TOPIC: "${topic}"`
        : `TOPIC: Pick a common IELTS Task 2 topic related to Education, Environment, or Society.`;

    try {
        const content = await callGroq([
            { role: "system", content: MODEL_ESSAY_SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
        ], 0.7, { jsonMode: true });

        const cleaned = cleanJson(content);

        // Aggressive cleaning: Remove markdown code blocks if present
        let cleanText = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();

        // Remove potential leading text
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        let parsed;
        try {
            parsed = parseJsonSafely(cleanText);
        } catch (e) {
            console.warn("[ModelEssay] jsonrepair failed, trying direct parse on cleaned text");
            parsed = JSON.parse(cleanText);
        }

        // Ensure ID and basic fields
        parsed.id = parsed.id || crypto.randomUUID();
        parsed.created_at = new Date().toISOString();
        parsed.source = 'ai_generated';
        parsed.views_count = 0;
        parsed.saves_count = 0;

        // Post-processing: Find indices for annotations
        // The AI returns "quote", we need to find "start_index" and "end_index" in "content"
        if (parsed.content && Array.isArray(parsed.annotations)) {
            parsed.annotations = parsed.annotations.map((anno: any) => {
                if (!anno.quote) return anno;

                // Find first occurrence of quote
                const startIndex = parsed.content.indexOf(anno.quote);

                if (startIndex !== -1) {
                    return {
                        ...anno,
                        start_index: startIndex,
                        end_index: startIndex + anno.quote.length
                    };
                } else {
                    // Try fuzzy matching or strip punctuation if exact match fails
                    // For now, just mark invalid indices so UI can handle gracefully
                    // console.warn(`Annotation match failed for: "${anno.quote}"`);
                    return {
                        ...anno,
                        start_index: -1,
                        end_index: -1
                    };
                }
            }).filter((a: any) => a.start_index !== -1); // Filter out unmatched annotations to avoid UI bugs
        }

        return parsed;
    } catch (e) {
        console.error("[ModelEssay] Generation failed:", e);
        throw e;
    }
};

/**
 * Evaluate essay using AI
 */
export const evaluateEssay = async (
    promptText: string,
    essay: string,
    taskType: 'Task 1' | 'Task 2'
): Promise<any> => {
    // API key is handled by Edge Function

    const { ESSAY_EVALUATION_SYSTEM_PROMPT } = await import('./prompts/essayPrompts');
    const { TASK_1_EVALUATION_CRITERIA, TASK_2_EVALUATION_CRITERIA } = await import('./prompts/taskSpecificPrompts');

    const specificCriteria = taskType === 'Task 1' ? TASK_1_EVALUATION_CRITERIA : TASK_2_EVALUATION_CRITERIA;

    const userPrompt = `
TASK TYPE: ${taskType}
${specificCriteria}

PROMPT: "${promptText}"
STUDENT ESSAY:
"${essay}"

Analyze this essay and generate the JSON report.
`;

    try {
        const content = await callGroq([
            { role: "system", content: ESSAY_EVALUATION_SYSTEM_PROMPT },
            { role: "user", content: userPrompt }
        ], 0.2, { jsonMode: true }); // Low temp for consistent grading

        const cleaned = cleanJson(content);
        return parseJsonSafely(cleaned);
    } catch (e) {
        console.error("[EssayEvaluator] Evaluation failed:", e);
        throw e;
    }
};

/**
 * Chat with examiner about feedback
 */
export const chatWithExaminer = async (
    history: any[],
    context: { prompt: string; essay: string; feedback: string },
    userMessage: string
): Promise<string> => {
    // API key is handled by Edge Function

    const { CHAT_WITH_EXAMINER_SYSTEM_PROMPT } = await import('./prompts/essayPrompts');

    const contextBlock = `
CONTEXT:
Prompt: ${context.prompt}
Student Essay: ${context.essay}
Examiner Feedback: ${context.feedback}
`;

    // Convert history format if needed
    const messages = [
        { role: "system", content: CHAT_WITH_EXAMINER_SYSTEM_PROMPT + contextBlock },
        ...history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.text
        })),
        { role: "user", content: userMessage }
    ];

    try {
        const content = await callGroq(messages as any, 0.7);
        return content;
    } catch (e) {
        console.error("[ExaminerChat] Failed:", e);
        return "Sorry, I'm having trouble thinking right now.";
    }
};

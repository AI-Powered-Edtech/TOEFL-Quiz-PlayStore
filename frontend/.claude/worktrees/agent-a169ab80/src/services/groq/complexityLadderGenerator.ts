import { callGroq, cleanJson } from './client';
import { parseJsonSafely } from './utils/jsonParser';
import type { ComplexityVerificationResult } from '../../types';

/**
 * Generate Complexity Ladder
 */
export const generateComplexityLadder = async (topic: string, skillId?: string): Promise<any> => {
    console.log(`[Generators] 🎯 generateComplexityLadder called for topic: "${topic}", skill: ${skillId}`);

    // API key is handled by Edge Function

    const { LADDER_GENERATION_PROMPT } = await import('./prompts/complexityLadderPrompts');
    let prompt = LADDER_GENERATION_PROMPT.replace('{topic}', topic);

    if (skillId) {
        const { getComplexityLadderSkill } = await import('../../data/complexityLadderSkills');
        const skill = getComplexityLadderSkill(skillId);
        if (skill) {
            prompt += `\n\nTARGET SKILL: ${skill.name}\nDESCRIPTION: ${skill.description}\nTARGET STRUCTURES: ${skill.structures.join(', ')}\n\nINSTRUCTION: Generate a 5-step ladder specifically focused on practicing "${skill.name}". Start with a very simple instance of this structure and make it progressively more complex (longer, more vocabulary, combining with other forms) while KEEPING the core structure "${skill.name}" as the main requirement.`;
        }
    }
    console.log('[Generators] 📝 Prompt prepared, starting API calls...');

    let lastError;
    for (let i = 0; i < 3; i++) {
        try {
            console.log(`[Generators] 🔄 Attempt ${i + 1}/3: Calling Groq API...`);
            const apiStartTime = Date.now();

            const content = await callGroq([
                { role: "system", content: "You are a linguistics expert. Output valid JSON array only." },
                { role: "user", content: prompt }
            ], 0.7, { jsonMode: true });

            const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(2);
            console.log(`[Generators] ⚡ API responded in ${apiDuration}s`);
            console.log('[Generators] 🔍 Parsing response...');

            const cleaned = cleanJson(content);
            const parsed = parseJsonSafely(cleaned);

            // Handle both array and object-with-levels responses
            let levels: any[];
            if (Array.isArray(parsed)) {
                levels = parsed;
            } else if (parsed.levels && Array.isArray(parsed.levels)) {
                levels = parsed.levels;
            } else {
                // Try to find any array property
                const arrayProp = Object.values(parsed).find(v => Array.isArray(v)) as any[];
                levels = arrayProp || [];
            }

            console.log(`[Generators] ✅ Successfully parsed ${levels.length} levels`);
            return levels;
        } catch (e) {
            console.warn(`[Generators] ❌ Attempt ${i + 1} failed:`, e);
            lastError = e;
            if (i < 2) {
                console.log('[Generators] ⏳ Waiting 1s before retry...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    console.error("[Generators] 💥 All ladder generation attempts failed", lastError);
    throw lastError;
};

/**
 * Verify Complexity Level
 */
export const verifyComplexityLevel = async (
    userInput: string,
    levelName: string,
    instruction: string,
    topic: string
): Promise<ComplexityVerificationResult> => {
    // API key is handled by Edge Function

    const { LADDER_VERIFICATION_PROMPT } = await import('./prompts/complexityLadderPrompts');
    const prompt = LADDER_VERIFICATION_PROMPT
        .replace('{topic}', topic)
        .replace('{levelName}', levelName)
        .replace('{instruction}', instruction)
        .replace('{userInput}', userInput);

    try {
        const content = await callGroq([
            { role: "system", content: "You are a syntax verifier. Output valid JSON only." },
            { role: "user", content: prompt }
        ], 0.3, { jsonMode: true });

        const cleaned = cleanJson(content);
        const parsed = parseJsonSafely(cleaned) as ComplexityVerificationResult;

        // Backward-compat: if structureAnalysis is absent, fall back to feedback
        return parsed.structureAnalysis
            ? parsed
            : { ...parsed, structureAnalysis: parsed.feedback };
    } catch (e) {
        console.error("Verification Gen Failed", e);
        return {
            isValid: false,
            feedback: "Unable to verify. Please try again.",
            structureAnalysis: "Unable to verify.",
            corrections: [],
            modelSentence: "",
            score: 0,
        };
    }
};

/**
 * Get Level Hint
 */
export const getLevelHint = async (levelName: string, topic: string): Promise<string> => {
    // API key is handled by Edge Function

    const { LADDER_HINT_PROMPT } = await import('./prompts/complexityLadderPrompts');
    const prompt = LADDER_HINT_PROMPT
        .replace('{topic}', topic)
        .replace('{instruction}', levelName); // Using levelName/instruction as hint context

    try {
        const content = await callGroq([
            { role: "system", content: "You are a helpful tutor." },
            { role: "user", content: prompt }
        ], 0.7);

        return content.replace(/"/g, '').trim();
    } catch (e) {
        console.error("Hint Gen Failed", e);
        return "Try using a different sentence structure.";
    }
};

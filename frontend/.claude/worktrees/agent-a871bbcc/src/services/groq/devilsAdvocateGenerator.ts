import { callGroq, cleanJson } from './client';
import { parseJsonSafely } from './utils/jsonParser';

/**
 * Generate Devil's Advocate Challenge
 * Analyzes user's argument and generates a critical counter-argument
 */
export const generateDevilsAdvocateChallenge = async (
    userArgument: string
): Promise<any> => {
    // API key is handled by Edge Function

    const systemPrompt = `You are a critical thinking AI trained in rhetoric, logic, and argumentation.
Your role is to identify the core claim in a user's argument and generate a strong, evidence-based counter-argument.

TASKS:
1. Extract the main claim from the user's argument
2. Identify any logical fallacies (if present)
3. Generate a compelling counter-argument that challenges the weakest point
4. Provide 3 concession starters to help the user defend their position

OUTPUT FORMAT (JSON):
{
  "detected_claim": "The core claim you identified",
  "counter_point": "Your counter-argument (2-3 sentences, academic tone)",
  "logical_fallacy_check": "Name of fallacy if detected, or 'None'",
  "suggested_starters": [
    "While it's true that..., ",
    "I acknowledge that..., however, ",
    "That's a valid point, but "
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks.`;

    const userPrompt = `USER ARGUMENT: "${userArgument}"

Generate a critical counter-argument. Be intellectually rigorous but fair.`;

    try {
        // Import timeout utility
        const { withTimeout } = await import('../../utils/timeout');

        const content = await withTimeout(
            callGroq(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                0.7,
                { jsonMode: true }
            ),
            30000, // 30 second timeout
            'AI challenge generation timed out. Please try again.'
        );

        const cleaned = cleanJson(content);
        return parseJsonSafely(cleaned);
    } catch (e) {
        console.error('[DevilsAdvocate] Challenge generation failed:', e);
        throw e;
    }
};

/**
 * Evaluate user's defense against counter-argument
 * Scores the defense based on logic, evidence, and rhetoric
 */
export const evaluateAdvocateDefense = async (
    originalClaim: string,
    counterPoint: string,
    userDefense: string
): Promise<any> => {
    // API key is handled by Edge Function

    const systemPrompt = `You are an expert debate judge and rhetoric professor.
Evaluate the user's defense of their argument against a counter-point.

CRITERIA:
1. Did they acknowledge the counter-point? (Concession)
2. Did they provide new evidence or reasoning?
3. Is their logic sound and coherent?
4. Did they maintain their original position effectively?

SCORING:
- 90-100: Excellent defense with strong reasoning
- 70-89: Good defense with minor weaknesses
- 50-69: Adequate but needs improvement
- Below 50: Weak defense, failed to address counter-point

OUTPUT FORMAT (JSON):
{
  "is_successful": true/false (score >= 70),
  "score": 0-100,
  "feedback": "Constructive feedback (2-3 sentences)",
  "improved_version": "C2-level rewrite of their defense"
}

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks.`;

    const userPrompt = `ORIGINAL CLAIM: "${originalClaim}"
COUNTER-POINT: "${counterPoint}"
USER'S DEFENSE: "${userDefense}"

Evaluate the defense and provide feedback.`;

    try {
        const content = await callGroq(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            0.3, // Lower temperature for consistent grading
            { jsonMode: true }
        );

        const cleaned = cleanJson(content);
        return parseJsonSafely(cleaned);
    } catch (e) {
        console.error('[DevilsAdvocate] Evaluation failed:', e);
        throw e;
    }
};

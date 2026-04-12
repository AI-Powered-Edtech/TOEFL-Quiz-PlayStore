
import { EssaySubmission } from '../types';

import { callGroq } from './groq/client';

/**
 * Service for Essay Evaluation
 */
export const essayEvaluationService = {

    async evaluateIntegrated(
        readingPassage: string,
        lectureSummary: string,
        userEssay: string
    ): Promise<EssaySubmission['ai_feedback']> {
        // TODO: Implement real AI evaluation for Integrated Writing when needed
        // Currently there are no consumers for this method (IntegratedWritingTask uses its own service)
        return {
            overall_score: 3,
            linguistic_range: 60,
            coherence: 60,
            task_response: 60,
            suggestions: ["Use more academic vocabulary.", "Connect your ideas better."],
            improvements: []
        };
    },

    async evaluateDiscussion(
        prompt: string,
        userEssay: string
    ): Promise<EssaySubmission['ai_feedback']> {
        try {
            // Import dynamically to avoid circular dependencies if any
            const { ESSAY_EVALUATION_SYSTEM_PROMPT } = await import('./groq/prompts/essayPrompts');

            const systemPrompt = ESSAY_EVALUATION_SYSTEM_PROMPT;
            const userPrompt = `
Task: Academic Discussion
Topic/Question: "${prompt}"

Student Essay:
"${userEssay}"

Evaluate this essay according to the system prompt.
`;

            const response = await callGroq([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ], 0.3, { jsonMode: true });

            // Parse response
            let parsed: any;
            try {
                parsed = JSON.parse(response);
            } catch (e) {
                // Try to repair JSON if needed
                const { jsonrepair } = await import('jsonrepair');
                parsed = JSON.parse(jsonrepair(response));
            }

            // Map IELTS Band (0-9) to Application Score (0-5)
            // Formula: Band / 9 * 5
            const overall_score = Math.round((parsed.band_score || 5) / 9 * 5 * 10) / 10;

            // Map Breakdown (0-9) to Percentages (0-100)
            const mapToPercent = (band: number) => Math.round((band || 5) / 9 * 100);

            const breakdown = parsed.breakdown || {};

            return {
                overall_score: Math.min(5, Math.max(0, overall_score)), // Clamp 0-5
                linguistic_range: mapToPercent(breakdown.lexical_resource),
                coherence: mapToPercent(breakdown.coherence_cohesion),
                task_response: mapToPercent(breakdown.task_response),
                suggestions: [
                    parsed.feedback,
                    ...(parsed.vocabulary_srs || []).map((v: any) => `Try using "${v.word}" (${v.definition}) instead of simpler words.`),
                ].slice(0, 3) as string[],
                improvements: (parsed.indoglish_analysis || []).map((item: any) => ({
                    original: item.fragment,
                    improved: item.correction,
                    skill_ref: item.explanation
                }))
            };

        } catch (error) {
            console.error('Essay evaluation failed:', error);
            // Fallback for error state
            return {
                overall_score: 0,
                linguistic_range: 0,
                coherence: 0,
                task_response: 0,
                suggestions: ["AI evaluation is currently unavailable. Please try again later."],
                improvements: []
            };
        }
    }
};

/**
 * Listening Quiz Engine
 * Generates listening comprehension questions for TOEFL Listening section (Skills 201-227).
 */

import { getSkillRule } from "../../data/rules";
import { AdaptiveDifficulty, CanonicalQuestionV1, SectionType } from "../../types";
import { validateCanonicalQuestion } from "../validationService";

import { callGroq, cleanJson } from './client';
import { getTargetSkill } from './helpers';
import { parseJsonSafely } from './utils/jsonParser';
import {
    BASE_SYSTEM_PROMPT,
    getListeningPromptForSkill,
} from './prompts';
import {
    deduplicateQuestions,
    sanitizeQuestion,
    buildDiversityBlock,
    getDifficultyPromptModifier,
    estimateCefrFromDifficulty,
    getDefaultDifficultyScore,
} from './quizEngineCore';

/**
 * Generate a batch of Listening comprehension questions for a given skill.
 */
export const generateListeningBatch = async (
    topic: string,
    count: number = 5,
    skillIdOverride?: number,
    difficulty?: AdaptiveDifficulty
): Promise<CanonicalQuestionV1[]> => {
    const section: SectionType = 'LISTENING';
    const targetSkill = getTargetSkill(topic, section);
    const numericSkillId = skillIdOverride
        ? skillIdOverride
        : (targetSkill ? parseInt(targetSkill.id.replace(/\\D/g, ''), 10) : 201);

    console.log(`[ListeningEngine] 🎯 Generating for Skill ID: ${numericSkillId}`);

    let contextInstruction = targetSkill
        ? `Target Skill: "${targetSkill.name}". Rule: ${targetSkill.description}. ID: ${numericSkillId}.`
        : `Topic: ${topic}. Skill ID: ${numericSkillId}`;

    const detailedRule = getSkillRule(numericSkillId, section);
    if (detailedRule) {
        contextInstruction += `\nCRITICAL GRAMMAR RULE: ${detailedRule}`;
    }

    // Listening-specific prompt selection
    const skillPrefix = targetSkill?.id || `L${numericSkillId.toString().padStart(2, '0')}`;
    const interactionInstruction = getListeningPromptForSkill(skillPrefix);

    // Anti-duplication diversity
    const { uniqueSeed, diversityInstruction } = buildDiversityBlock(count);

    const userPrompt = `Generate ${count} UNIQUE LISTENING questions for Skill ID ${numericSkillId}.
Context: ${contextInstruction}
Style: ${interactionInstruction}

UNIQUENESS ID: ${uniqueSeed}
MANDATORY TOPIC ASSIGNMENTS (use different academic subjects, but ALL questions must test the SAME grammar skill described in Context above):
${diversityInstruction}

CRITICAL: Each question MUST use a DIFFERENT academic topic/subject. But the grammar concept being tested MUST match the skill described in "Context" above.${getDifficultyPromptModifier(difficulty)}`;

    const content = await callGroq([
        { role: "system", content: BASE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
    ], 0.5, { jsonMode: true });

    const cleaned = cleanJson(content);
    const parsed = parseJsonSafely(cleaned);
    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    const validated = questions.map((q: any) => {
        const normalizedChoices = q.choices || q.options || [];
        const normalizedCorrect = q.correct_response || (q.answer ? [q.answer] : []);
        const normalizedPrompt = q.prompt || q.question_text || '';

        if (normalizedChoices.length === 0) {
            console.warn(`[ListeningEngine] Skipping question without choices:`, q);
            return null;
        }

        return {
            ...q,
            interaction: 'multiple_choice',
            prompt: normalizedPrompt,
            choices: normalizedChoices,
            correct_response: normalizedCorrect,
            skill_id: numericSkillId,
            skill_type: 'listening',
            section: 'listening',
            cefr_target: q.cefr_target || estimateCefrFromDifficulty(q.difficulty_score || getDefaultDifficultyScore(difficulty)),
            difficulty_score: q.difficulty_score || getDefaultDifficultyScore(difficulty),
            metadata: {
                explanation: q.metadata?.explanation || q.explanation || "No explanation provided.",
                source: 'ai',
                qti_compliant: true,
                cefr_compliant: true
            }
        };
    }).filter((q: any) => q !== null)
        .map((q: any) => sanitizeQuestion(q))
        .filter((q: any): q is CanonicalQuestionV1 => validateCanonicalQuestion(q));

    return deduplicateQuestions(validated);
};

/**
 * Structure Quiz Engine
 * Generates fill_blank questions for TOEFL Structure section (Skills 1-19).
 */

import { getSkillRule } from "../../data/rules";
import { AdaptiveDifficulty, CanonicalQuestionV1, SectionType } from "../../types";
import { validateCanonicalQuestion } from "../validationService";

import { callGroq, cleanJson } from './client';
import { getTargetSkill } from './helpers';
import {
    BASE_SYSTEM_PROMPT,
    STRUCTURE_PROMPT,
    STRUCTURE_FOCUSED_PROMPT,
} from './prompts';
import { getSkillSpecificPrompt } from './prompts/structure';
import {
    deduplicateQuestions,
    sanitizeQuestion,
    buildDiversityBlock,
    getDifficultyPromptModifier,
    estimateCefrFromDifficulty,
    getDefaultDifficultyScore,
} from './quizEngineCore';
import { parseJsonSafely } from './utils/jsonParser';

/**
 * Generate a batch of Structure (fill_blank) questions for a given skill.
 */
export const generateStructureBatch = async (
    topic: string,
    count: number = 5,
    skillIdOverride?: number,
    difficulty?: AdaptiveDifficulty
): Promise<CanonicalQuestionV1[]> => {
    const section: SectionType = 'STRUCTURE';
    const targetSkill = getTargetSkill(topic, section);
    const numericSkillId = skillIdOverride
        ? skillIdOverride
        : (targetSkill ? parseInt(targetSkill.id.replace(/\\D/g, ''), 10) : 1);

    console.log(`[StructureEngine] 🎯 Generating for Skill ID: ${numericSkillId}`);

    let contextInstruction = targetSkill
        ? `Target Skill: "${targetSkill.name}". Rule: ${targetSkill.description}. ID: ${numericSkillId}.`
        : `Topic: ${topic}. Skill ID: ${numericSkillId}`;

    const detailedRule = getSkillRule(numericSkillId, section);
    if (detailedRule) {
        contextInstruction += `\nCRITICAL GRAMMAR RULE: ${detailedRule}`;
    }

    // For Structure: Use FOCUSED prompt if specific skill requested
    let interactionInstruction: string;
    if (numericSkillId > 0) {
        const skillSpecificPrompt = getSkillSpecificPrompt(numericSkillId);
        interactionInstruction = STRUCTURE_FOCUSED_PROMPT + (skillSpecificPrompt ? '\n' + skillSpecificPrompt : '');
    } else {
        interactionInstruction = STRUCTURE_PROMPT;
    }

    // Anti-duplication diversity
    const { uniqueSeed, diversityInstruction } = buildDiversityBlock(count);

    // Strict constraint for focused skill generation
    const strictConstraint = numericSkillId > 0
        ? `\n\n⚠️ ABSOLUTE CONSTRAINT: ALL ${count} questions MUST test Skill ID ${numericSkillId} ONLY.
- DO NOT generate Subject-Verb Agreement questions unless Skill ID is 1-5.
- DO NOT generate Inversion questions unless Skill ID is 15-19.
- DO NOT generate Connector questions unless Skill ID is 6-12.
- The grammar pattern in EVERY question must match the CRITICAL GRAMMAR RULE above.
- Each question must follow the exact pattern described in the skill definition.
- ALL choices MUST be UNIQUE - NO DUPLICATE OPTIONS ALLOWED.`
        : '';

    const userPrompt = `Generate ${count} UNIQUE STRUCTURE questions for Skill ID ${numericSkillId}.
Context: ${contextInstruction}
Style: ${interactionInstruction}

UNIQUENESS ID: ${uniqueSeed}
MANDATORY TOPIC ASSIGNMENTS (use different academic subjects, but ALL questions must test the SAME grammar skill described in Context above):
${diversityInstruction}

CRITICAL: Each question MUST use a DIFFERENT academic topic/subject. But the grammar concept being tested MUST match the skill described in "Context" above.${strictConstraint}${getDifficultyPromptModifier(difficulty)}`;

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

        // Skip structure questions without proper choices
        if (normalizedChoices.length === 0) {
            console.warn(`[StructureEngine] Skipping question without choices:`, q);
            return null;
        }

        const normalizedPrompt = q.prompt || q.question_text || '';

        return {
            ...q,
            interaction: 'fill_blank',
            prompt: normalizedPrompt,
            choices: normalizedChoices,
            correct_response: normalizedCorrect,
            skill_id: numericSkillId,
            skill_type: 'structure',
            section: 'structure',
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

/**
 * Written Expression Quiz Engine
 * Generates identify_error questions for TOEFL Written Expression section (Skills 20-60).
 * Handles {A}/{B}/{C}/{D} tag injection and recovery logic.
 */

import { getSkillRule } from "../../data/rules";
import { AdaptiveDifficulty, CanonicalQuestionV1, SectionType } from "../../types";
import { debugLog } from "../../utils/debugLogger";
import { validateCanonicalQuestion } from "../validationService";

import { callGroq, cleanJson } from './client';
import { getTargetSkill } from './helpers';
import {
    BASE_SYSTEM_PROMPT,
    WRITTEN_PROMPT,
    ERROR_ID_PROTOCOL,
} from './prompts';
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
 * Generate a batch of Written Expression (identify_error) questions for a given skill.
 */
export const generateWrittenBatch = async (
    topic: string,
    count: number = 5,
    skillIdOverride?: number,
    difficulty?: AdaptiveDifficulty
): Promise<CanonicalQuestionV1[]> => {
    const section: SectionType = 'STRUCTURE'; // Written uses STRUCTURE section routing
    const targetSkill = getTargetSkill(topic, section);
    const numericSkillId = skillIdOverride
        ? skillIdOverride
        : (targetSkill ? parseInt(targetSkill.id.replace(/\\D/g, ''), 10) : 20);

    console.log(`[WrittenEngine] 🎯 Generating for Skill ID: ${numericSkillId}`);

    let contextInstruction = targetSkill
        ? `Target Skill: "${targetSkill.name}". Rule: ${targetSkill.description}. ID: ${numericSkillId}.`
        : `Topic: ${topic}. Skill ID: ${numericSkillId}`;

    const detailedRule = getSkillRule(numericSkillId, section);
    if (detailedRule) {
        contextInstruction += `\nCRITICAL GRAMMAR RULE: ${detailedRule}`;
    }

    const interactionInstruction = WRITTEN_PROMPT;
    const sectionProtocol = ERROR_ID_PROTOCOL;

    // Anti-duplication diversity
    const { uniqueSeed, diversityInstruction } = buildDiversityBlock(count);

    // Written-specific format reminder (models pay most attention to end of prompt)
    const formatReminder = `\n\n⚠️ ABSOLUTELY CRITICAL FORMAT REMINDER: Every "prompt" field MUST contain the FULL sentence with {A}word(s){/A} {B}word(s){/B} {C}word(s){/C} {D}word(s){/D} tags INLINE. "choices" MUST be EXACTLY ["A","B","C","D"]. "interaction" MUST be "identify_error". Without tags = REJECTED. Do NOT write "Choose the correct answer". Write ONLY the sentence.`;

    const userPrompt = `Generate ${count} UNIQUE written expression questions for Skill ID ${numericSkillId}.
Context: ${contextInstruction}
Style: ${interactionInstruction}${sectionProtocol}

UNIQUENESS ID: ${uniqueSeed}
MANDATORY TOPIC ASSIGNMENTS (use different academic subjects, but ALL questions must test the SAME grammar skill described in Context above):
${diversityInstruction}

CRITICAL: Each question MUST use a DIFFERENT academic topic/subject. But the grammar concept being tested MUST match the skill described in "Context" above.${formatReminder}${getDifficultyPromptModifier(difficulty)}`;

    const content = await callGroq([
        { role: "system", content: BASE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
    ], 0.5, { jsonMode: true });

    const cleaned = cleanJson(content);
    const parsed = parseJsonSafely(cleaned);
    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    // DEBUG: Log raw AI output for Written Expression skills
    debugLog('WrittenEngine', `Skill ${numericSkillId}: Raw AI generated ${questions.length} questions`);
    questions.forEach((q: any, i: number) => {
        debugLog('WrittenEngine', `Q${i + 1}: prompt="${(q.prompt || q.question_text || '').substring(0, 80)}..."`);
        debugLog('WrittenEngine', `Q${i + 1}: choices=${JSON.stringify(q.choices || q.options)}`);
        debugLog('WrittenEngine', `Q${i + 1}: correct_response=${JSON.stringify(q.correct_response || q.answer)}`);
        debugLog('WrittenEngine', `Q${i + 1}: interaction=${q.interaction}, hasTags=${(q.prompt || '').includes('{A}')}`);
    });

    const validated = questions.map((q: any) => {
        const normalizedChoices = q.choices || q.options || [];
        const normalizedCorrect = q.correct_response || (q.answer ? [q.answer] : []);

        let rawPrompt = q.prompt || q.question_text || '';
        let rawStimulus = q.stimulus?.text || '';

        // Move tags from stimulus to prompt if misplaced
        if (!rawPrompt.includes('{A}') && rawStimulus.includes('{A}')) {
            rawPrompt = rawStimulus;
            rawStimulus = '';
        }

        // Tag injection recovery: if identify_error but no tags, try to inject them from choices
        if (!rawPrompt.includes('{A}')) {
            debugLog('WrittenEngine', `Skill ${numericSkillId}: Attempting tag injection`);
            debugLog('WrittenEngine', `rawPrompt="${rawPrompt.substring(0, 100)}..."`);
            debugLog('WrittenEngine', `normalizedChoices=${JSON.stringify(normalizedChoices)}`);

            // Check if we have word-based choices (not just A/B/C/D letters) to inject
            const wordChoices = normalizedChoices.filter((c: string) => c && c.length > 1 && !['A', 'B', 'C', 'D'].includes(c.toUpperCase()));
            debugLog('WrittenEngine', `wordChoices=${JSON.stringify(wordChoices)} (length=${wordChoices.length})`);

            if (wordChoices.length >= 4) {
                const tags = ['A', 'B', 'C', 'D'];
                let injectedPrompt = rawPrompt;
                let injectedCount = 0;
                for (let ti = 0; ti < Math.min(4, wordChoices.length); ti++) {
                    const word = wordChoices[ti].trim();
                    if (word.length > 1 && injectedPrompt.includes(word) && !injectedPrompt.includes(`{${tags[ti]}}`)) {
                        injectedPrompt = injectedPrompt.replace(word, `{${tags[ti]}}${word}{/${tags[ti]}}`);
                        injectedCount++;
                    }
                }
                if (injectedCount === 4) {
                    console.log(`[WrittenEngine] Successfully injected {A}-{D} tags for skill ${numericSkillId}`);
                    rawPrompt = injectedPrompt;
                } else {
                    console.warn(`[WrittenEngine] Failed: only ${injectedCount}/4 tags injected for skill ${numericSkillId}. Skipping.`);
                    return null;
                }
            } else {
                console.warn(`[WrittenEngine] Skill ${numericSkillId}: identify_error question missing tags. Skipping.`);
                return null;
            }
        }

        // Normalize choices and correct_response for Written Expression
        const finalChoices = ['A', 'B', 'C', 'D'];
        const finalCorrect = normalizedCorrect.map((ans: string) => {
            const upper = ans.toUpperCase().trim();
            if (['A', 'B', 'C', 'D'].includes(upper) && upper.length === 1) return upper;
            const idx = normalizedChoices.findIndex((choice: string) =>
                choice.toLowerCase().trim() === ans.toLowerCase().trim() ||
                (choice.length > 2 && ans.toLowerCase().includes(choice.toLowerCase()))
            );
            if (idx !== -1) return String.fromCharCode(65 + idx);
            const promptMatch = rawPrompt.match(new RegExp(`\\{([A-D])\\}[^\\{]*?${ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\}]*?\\{\/[A-D]\\}`, 'i'));
            if (promptMatch) return promptMatch[1].toUpperCase();
            if (ans.length > 1 && ['A', 'B', 'C', 'D'].includes(ans[0].toUpperCase()) && (ans[1] === ')' || ans[1] === '.' || ans[1] === ' ')) {
                return ans[0].toUpperCase();
            }
            return upper;
        });

        return {
            ...q,
            interaction: 'identify_error',
            prompt: rawPrompt,
            choices: finalChoices,
            correct_response: finalCorrect,
            skill_id: numericSkillId,
            skill_type: 'written',
            section: 'written',
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

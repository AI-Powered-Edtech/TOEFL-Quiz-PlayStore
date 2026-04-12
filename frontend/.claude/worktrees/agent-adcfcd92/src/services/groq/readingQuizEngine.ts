/**
 * Reading Quiz Engine
 * Generates reading comprehension questions with auto-generated passages.
 * Two-step flow: generate passage → generate questions based on passage.
 */

import { AdaptiveDifficulty, CanonicalQuestionV1 } from "../../types";
import { validateCanonicalQuestion } from "../validationService";

import { callGroq, cleanJson } from './client';
import { parseJsonSafely } from './utils/jsonParser';
import {
    BASE_SYSTEM_PROMPT,
    READING_PROMPT,
} from './prompts';
import { sanitizeQuestion, getDifficultyPromptModifier, estimateCefrFromDifficulty, getDefaultDifficultyScore } from './quizEngineCore';

/**
 * Generate a set of Reading Comprehension questions with a freshly generated passage.
 */
export const generateReadingBatch = async (
    topic: string,
    count: number,
    skillId?: number,
    difficulty?: AdaptiveDifficulty
): Promise<CanonicalQuestionV1[]> => {
    // Skill-specific passage guidance to ensure variety
    const skillGuidance: Record<number, string> = {
        1: "Include a clear central theme and main idea that can be identified.",
        2: "Include specific facts, dates, names, and statistics that can be directly referenced.",
        3: "Include several related facts, but leave some details unmentioned for contrast questions.",
        4: "Include information that requires inference and logical deduction.",
        5: "Include 3-4 advanced vocabulary words (B2-C1 level) with strong context clues for meaning.",
        6: "Organize information clearly across 2-3 distinct paragraphs with clear topic sentences."
    };

    // Random elements to ensure unique passages every time
    const randomAngles = [
        "from a historical perspective",
        "focusing on recent developments",
        "examining the scientific aspects",
        "exploring the cultural significance",
        "analyzing the economic impact",
        "discussing the environmental implications",
        "from an educational viewpoint",
        "considering global perspectives"
    ];
    const randomAngle = randomAngles[Math.floor(Math.random() * randomAngles.length)];
    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

    const skillHint = skillId && skillGuidance[skillId]
        ? `\nIMPORTANT: ${skillGuidance[skillId]}`
        : '';

    // Step 1: Generate the passage
    const passagePrompt = `Generate a COMPLETELY UNIQUE TOEFL Reading Passage (approx 250 words) about ${topic} ${randomAngle}.
    UNIQUENESS REQUIREMENT: This passage MUST be different from any previous passage. Include unique facts, examples, or perspectives.
    Session ID: ${uniqueId} (use this to inspire unique content)
    ${skillHint}${getDifficultyPromptModifier(difficulty)}
    Output ONLY the passage content. No title, no headers, no preamble.`;

    const passageRaw = await callGroq([
        { role: "system", content: "You are a Reading Passage Generator. Output raw text content only. Each passage you generate must be completely unique and different from any previous one." },
        { role: "user", content: passagePrompt }
    ], 0.8); // Higher temperature for more creativity

    const passageText = passageRaw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Step 2: Generate questions based on the passage
    const qPrompt = `Based on this passage: "${passageText}", generate ${count} Reading Comprehension questions for Skill ${skillId || 1}.
    Each question MUST be multiple_choice with EXACTLY 4 choices.
    ${READING_PROMPT}`;

    const content = await callGroq([
        { role: "system", content: BASE_SYSTEM_PROMPT },
        { role: "user", content: qPrompt }
    ], 0.3, { jsonMode: true });

    const cleanedCode = cleanJson(content);
    const parsed = parseJsonSafely(cleanedCode);

    const rawQuestions = Array.isArray(parsed) ? parsed : (parsed.questions || []);

    return rawQuestions.map((q: any) => ({
        ...q,
        interaction: 'multiple_choice',
        skill_id: q.skill_id || 101,
        skill_type: 'reading',
        section: 'reading',
        cefr_target: q.cefr_target || estimateCefrFromDifficulty(q.difficulty_score || getDefaultDifficultyScore(difficulty)),
        difficulty_score: q.difficulty_score || getDefaultDifficultyScore(difficulty),
        stimulus: { text: passageText },
        metadata: {
            ...q.metadata,
            explanation: q.metadata?.explanation || q.explanation || "No explanation provided.",
            source: 'ai',
            qti_compliant: true,
            cefr_compliant: true
        }
    })).map((q: any) => sanitizeQuestion(q))
        .filter((q: any) => validateCanonicalQuestion(q));
};

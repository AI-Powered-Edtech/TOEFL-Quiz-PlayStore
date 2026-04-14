/**
 * Quiz Generator — Thin Facade
 * 
 * Routes quiz generation to section-specific engines while preserving
 * the original public API surface for backwards compatibility.
 * 
 * Section-specific logic lives in:
 *   - structureQuizEngine.ts  (Skills 1-19,  fill_blank)
 *   - writtenQuizEngine.ts    (Skills 20-60, identify_error)
 *   - readingQuizEngine.ts    (Skills 101+,  passage + comprehension)
 *   - listeningQuizEngine.ts  (Skills 201+,  listening comprehension)
 * 
 * Shared utilities live in:
 *   - quizEngineCore.ts       (sanitize, validate, dedup, diversity)
 */

import { CanonicalQuestionV1, SectionType } from "../../types";
import { validateCanonicalQuestion } from "../validationService";

import { callGroq, cleanJson } from './client';
import { getTargetSkill, isLikelyQuestion } from './helpers';
import { generateListeningBatch } from './listeningQuizEngine';
import {
    BASE_SYSTEM_PROMPT,
    READING_PROMPT,
    LISTENING_PROMPT,
    STRUCTURE_PROMPT,
    WRITTEN_PROMPT,
    ERROR_ID_PROTOCOL,
} from './prompts';
import {
    sanitizeQuestion,
    validateGeneratedQuestion,
} from './quizEngineCore';
import { generateReadingBatch } from './readingQuizEngine';
import { generateStructureBatch } from './structureQuizEngine';
import { parseJsonSafely } from './utils/jsonParser';

// Import section-specific engines
import { generateWrittenBatch } from './writtenQuizEngine';

// ─── PUBLIC API (Backwards Compatible) ───────────────────────────────────────

/**
 * Main quiz generation entry point.
 * Routes to the appropriate section-specific engine.
 */
export const generateQuizBatch = async (
    topic: string,
    section: SectionType = 'STRUCTURE',
    count: number = 5,
    skillIdOverride?: number
): Promise<CanonicalQuestionV1[]> => {
    try {
        const numericSkillId = skillIdOverride
            ? skillIdOverride
            : (() => {
                const targetSkill = getTargetSkill(topic, section);
                return targetSkill ? parseInt(targetSkill.id.replace(/\\D/g, ''), 10) : 1;
            })();

        console.log(`[Generator] 🎯 Routing to engine for section=${section}, Skill ID=${numericSkillId}`);

        // Route to Reading engine
        if (section === 'READING') {
            return await generateReadingBatch(topic, count, numericSkillId);
        }

        // Route to Listening engine
        if (section === 'LISTENING') {
            return await generateListeningBatch(topic, count, skillIdOverride);
        }

        // Detect Written Expression (Skills 20-60)
        const isWrittenExpression =
            section === 'WRITTEN' ||
            (numericSkillId >= 20 && numericSkillId <= 60) ||
            topic.toLowerCase().includes('written expression');

        if (isWrittenExpression) {
            return await generateWrittenBatch(topic, count, skillIdOverride);
        }

        // Default: Structure engine
        return await generateStructureBatch(topic, count, skillIdOverride);

    } catch (e) {
        console.error("Groq Batch Generation Failed:", e);
        throw e;
    }
};

/**
 * Generate a reading set — delegates to readingQuizEngine.
 */
export const generateReadingSet = generateReadingBatch;

// ─── MULTI-PURPOSE FUNCTIONS (Remain here — they span multiple sections) ─────

/**
 * Generate questions from a given context text.
 */
export const generateQuestionsFromContext = async (
    contextText: string,
    skillId: number | 'AUTO',
    count: number = 5,
    mode: 'structure' | 'reading' | 'written' | 'digitize' = 'structure'
): Promise<CanonicalQuestionV1[]> => {
    let modeInstruction = "";
    if (mode === 'digitize') {
        modeInstruction = "DIGITIZE: Extract passage into stimulus.text. If the input is ONLY questions (no reading passage), LEAVE `stimulus` EMPTY (null). Extract questions into prompt/choices.";
    } else if (mode === 'reading') {
        modeInstruction = READING_PROMPT;
    } else if (mode === 'written') {
        modeInstruction = WRITTEN_PROMPT;
    } else {
        modeInstruction = STRUCTURE_PROMPT;
    }

    try {
        const sanitizedContextText = contextText.substring(0, 6000).replace(/System:|Assistant:|User:|Instruction:|\\[INST\\]|<\/s>|<\|.*?\|>/gi, '[REDACTED]');
        const content = await callGroq([
            { role: "system", content: BASE_SYSTEM_PROMPT + "\n" + modeInstruction + (mode === 'written' ? ERROR_ID_PROTOCOL : "") },
            { role: "user", content: `CONTEXT:\n${sanitizedContextText}` }
        ], 0.2, { jsonMode: true });

        const cleanedCtx = cleanJson(content);
        const parsed = parseJsonSafely(cleanedCtx);

        return (parsed.questions || []).map((q: any) => ({
            ...q,
            interaction: (mode === 'reading' || mode === 'digitize') ? 'multiple_choice' : q.interaction,
            skill_id: q.skill_id || (typeof skillId === 'number' ? skillId : 1),
            skill_type: mode === 'reading' || mode === 'digitize' ? 'reading' : (mode === 'written' ? 'written' : 'structure'),
            section: mode === 'reading' || mode === 'digitize' ? 'reading' : (mode === 'written' ? 'written' : 'structure'),
            cefr_target: q.cefr_target || 'B1',
            difficulty_score: q.difficulty_score || 50,
            stimulus: (mode === 'reading' || mode === 'digitize')
                ? (q.stimulus?.text ? q.stimulus : (isLikelyQuestion(contextText) ? undefined : { text: contextText.substring(0, 1000) }))
                : q.stimulus,
            metadata: {
                ...q.metadata,
                source: 'ai',
                qti_compliant: true,
                cefr_compliant: true,
                needs_explanation: !q.explanation || (q.explanation || '').length < 30
            }
        })).map((q: any) => sanitizeQuestion(q))
            .filter((q: any) => {
                const validation = validateGeneratedQuestion(q);
                if (!validation.valid) {
                    console.warn(`[Generator] ❌ REJECTED (context): ${validation.reason}`, (q.prompt || '').substring(0, 60));
                    return false;
                }
                return validateCanonicalQuestion(q);
            });
    } catch (e) {
        console.error("Groq Context Generation Failed:", e);
        throw e;
    }
};

/**
 * Generate questions for ALL 4 SECTIONS from a single context.
 * Returns structured output grouped by section type.
 */
export const generateMultiSectionFromContext = async (
    contextText: string,
    countPerSection: number = 3
): Promise<{
    structure: CanonicalQuestionV1[];
    written: CanonicalQuestionV1[];
    reading: CanonicalQuestionV1[];
    listening: CanonicalQuestionV1[];
    total: number;
}> => {
    console.log(`[Generator] 📚 Multi-section generation starting...`);

    const systemPrompt = `${BASE_SYSTEM_PROMPT}

You are generating a COMPLETE TOEFL practice set. Generate questions for ALL 4 sections from the given context.

=== CONTEXT USAGE INSTRUCTION ===
Use the following text as ACADEMIC CONTEXT and TOPIC INSPIRATION.
If the text is technical, informal, or marketing-focused, ADAPT it to be
formal, academic TOEFL-style content. Do NOT just copy sentences.
Generate ORIGINAL TOEFL-quality questions inspired by the subject matter.
===================================

--- STRUCTURE SECTION ---
${STRUCTURE_PROMPT}

--- WRITTEN EXPRESSION SECTION ---
${WRITTEN_PROMPT}

--- READING SECTION ---
${READING_PROMPT}

--- LISTENING SECTION ---
${LISTENING_PROMPT}

OUTPUT FORMAT:
{
  "sections": {
    "structure": [{ questions... }],
    "written": [{ questions... }],
    "reading": [{ questions... }],
    "listening": [{ questions... }]
  }
}

EACH QUESTION MUST HAVE:
- prompt: Question text (with _______ blank for Structure, with {A}...{/A} tags for Written)
- choices: 4 options (text for Structure/Reading/Listening, ["A","B","C","D"] for Written)
- correct_response: Full text for Structure/Reading/Listening (e.g., ["has saved"]), letter for Written (e.g., ["B"])
- skill_id: number (1-19 for Structure, 20-60 for Written, 101-106 for Reading, 201-227 for Listening)
- explanation: Brief reason
- interaction: "fill_blank" | "identify_error" | "multiple_choice"
- stimulus: (Reading only) { text: "passage content..." }`;

    try {
        const content = await callGroq([
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate TOEFL questions for ALL 4 sections from this context:\n\n${contextText.substring(0, 10000)}` }
        ], 0.4, { jsonMode: true });

        const cleanedCtx = cleanJson(content);
        const parsed = parseJsonSafely(cleanedCtx);

        // Handle multiple AI response formats
        let allQuestions: any[] = [];

        if (parsed.sections) {
            console.log(`[Generator] 🔍 AI returned structured sections format`);
            allQuestions = [
                ...(parsed.sections.structure || []).map((q: any) => ({ ...q, _aiSection: 'structure' })),
                ...(parsed.sections.written || []).map((q: any) => ({ ...q, _aiSection: 'written' })),
                ...(parsed.sections.reading || []).map((q: any) => ({ ...q, _aiSection: 'reading' })),
                ...(parsed.sections.listening || []).map((q: any) => ({ ...q, _aiSection: 'listening' }))
            ];
        } else if (parsed.questions && Array.isArray(parsed.questions)) {
            console.log(`[Generator] 🔍 AI returned flat questions array (${parsed.questions.length} questions)`);
            allQuestions = parsed.questions;
        } else if (Array.isArray(parsed)) {
            console.log(`[Generator] 🔍 AI returned direct array (${parsed.length} questions)`);
            allQuestions = parsed;
        }

        console.log(`[Generator] 📊 Total raw questions: ${allQuestions.length}`);

        // Auto-classify each question by analyzing its content
        const classifyQuestion = (q: any): { section: string; interaction: string; skillRange: [number, number] } => {
            const prompt = (q.prompt || q.question_text || q.question || '').toLowerCase();
            const interaction = (q.interaction || '').toLowerCase();
            const aiSection = (q._aiSection || q.section || q.type || '').toLowerCase();

            if (aiSection.includes('written') || interaction === 'identify_error' || (prompt.includes('{a}') && prompt.includes('{b}'))) {
                return { section: 'written', interaction: 'identify_error', skillRange: [20, 60] };
            }
            if (aiSection.includes('structure') || interaction === 'fill_blank' || prompt.includes('___') || prompt.includes('____')) {
                return { section: 'structure', interaction: 'fill_blank', skillRange: [1, 19] };
            }
            if (aiSection.includes('reading') || q.stimulus?.text || q.passage) {
                return { section: 'reading', interaction: 'multiple_choice', skillRange: [101, 106] };
            }
            if (aiSection.includes('listening') || prompt.includes('speaker') || prompt.includes('conversation') || prompt.includes('lecture')) {
                return { section: 'listening', interaction: 'multiple_choice', skillRange: [201, 227] };
            }

            if ((prompt.includes('{a}') && prompt.includes('{b}'))) {
                return { section: 'written', interaction: 'identify_error', skillRange: [20, 60] };
            }
            if (prompt.includes('___') || prompt.includes('blank')) {
                return { section: 'structure', interaction: 'fill_blank', skillRange: [1, 19] };
            }

            return { section: 'structure', interaction: 'fill_blank', skillRange: [1, 19] };
        };

        const skillCounters = { structure: 1, written: 20, reading: 101, listening: 201 };

        const transformQuestion = (q: any): CanonicalQuestionV1 | null => {
            const choices = q.choices || q.options || [];
            const prompt = q.prompt || q.question_text || q.question || '';
            let correctResponse = q.correct_response || (q.answer ? [q.answer] : q.correct ? [q.correct] : ['A']);

            if (!prompt || choices.length < 4) {
                console.log(`[Generator] ❌ Skipped question - missing prompt or choices`);
                return null;
            }

            const classification = classifyQuestion(q);

            let skillId = q.skill_id;
            if (!skillId || typeof skillId !== 'number' || skillId < classification.skillRange[0] || skillId > classification.skillRange[1]) {
                skillId = skillCounters[classification.section as keyof typeof skillCounters];
                skillCounters[classification.section as keyof typeof skillCounters]++;
                if (classification.section === 'structure' && skillCounters.structure > 19) skillCounters.structure = 1;
                if (classification.section === 'written' && skillCounters.written > 60) skillCounters.written = 20;
            }

            // Normalize correct_response format
            if (classification.section === 'written') {
                const answer = correctResponse[0] || '';
                if (answer.length > 1 || !['A', 'B', 'C', 'D'].includes(answer)) {
                    const idx = choices.findIndex((c: string) =>
                        c.toLowerCase().trim() === answer.toLowerCase().trim()
                    );
                    if (idx !== -1) {
                        correctResponse = [String.fromCharCode(65 + idx)];
                    } else {
                        correctResponse = ['A'];
                    }
                }
            } else {
                const answer = correctResponse[0] || '';
                if (['A', 'B', 'C', 'D'].includes(answer)) {
                    const idx = answer.charCodeAt(0) - 65;
                    if (choices[idx]) {
                        correctResponse = [choices[idx]];
                    }
                }
            }

            const transformed: CanonicalQuestionV1 = {
                ...q,
                prompt,
                choices,
                correct_response: correctResponse,
                interaction: classification.interaction,
                skill_id: skillId,
                skill_type: classification.section,
                section: classification.section,
                cefr_target: q.cefr_target || 'B1',
                difficulty_score: q.difficulty_score || 50,
                stimulus: classification.section === 'reading' ? { text: q.stimulus?.text || q.passage || contextText.substring(0, 500) } : q.stimulus,
                metadata: {
                    ...q.metadata,
                    source: 'ai_multisection',
                    qti_compliant: true,
                    explanation: q.explanation || '',
                    needs_explanation: !q.explanation || (q.explanation || '').length < 30
                }
            };

            const validation = validateGeneratedQuestion(transformed);
            if (!validation.valid) {
                console.warn(`[Generator] ❌ REJECTED: ${validation.reason}`, prompt.substring(0, 60));
                return null;
            }

            return transformed;
        };

        const classifiedQuestions = allQuestions.map(transformQuestion).filter((q): q is CanonicalQuestionV1 => q !== null);

        const result = {
            structure: classifiedQuestions.filter(q => q.section === 'structure'),
            written: classifiedQuestions.filter(q => q.section === 'written'),
            reading: classifiedQuestions.filter(q => q.section === 'reading'),
            listening: classifiedQuestions.filter(q => q.section === 'listening'),
            total: classifiedQuestions.length
        };

        console.log(`[Generator] ✅ Multi-section complete: Structure=${result.structure.length}, Written=${result.written.length}, Reading=${result.reading.length}, Listening=${result.listening.length}`);
        console.log(`[Generator] 📊 Skill IDs assigned:`, classifiedQuestions.map(q => `${q.section}:${q.skill_id}`).join(', '));

        return result;
    } catch (e) {
        console.error("[Generator] Multi-section generation failed:", e);
        return {
            structure: [],
            written: [],
            reading: [],
            listening: [],
            total: 0
        };
    }
};

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────────────────

export const classifyQuestionsBatch = async (questions: CanonicalQuestionV1[]): Promise<CanonicalQuestionV1[]> => {
    return questions.map((q, i) => ({ ...q, skill_id: q.skill_id || (i + 1) }));
};

export const repairQuizQuestion = async (question: CanonicalQuestionV1, issues: string[]): Promise<CanonicalQuestionV1> => {
    const prompt = `Fix these issues: ${issues.join(', ')}. Question JSON: ${JSON.stringify(question)}`;
    try {
        const content = await callGroq([
            { role: "system", content: BASE_SYSTEM_PROMPT },
            { role: "user", content: prompt }
        ], 0.2, { jsonMode: true });
        const cleanedRep = cleanJson(content);
        const parsed = parseJsonSafely(cleanedRep);
        const fixed = parsed.questions?.[0] || parsed;
        return validateCanonicalQuestion(fixed) ? fixed : question;
    } catch (e) {
        return question;
    }
};

export const generateQuizFromContext = async (contextText: string, instruction: string): Promise<CanonicalQuestionV1> => {
    const sanitizedContext = contextText.substring(0, 3000).replace(/System:|Assistant:|User:|Instruction:|\\[INST\\]|<\/s>|<\|.*?\|>/gi, '[REDACTED]');
    const prompt = `Context: ${sanitizedContext}\nTask: ${instruction}`;
    try {
        const content = await callGroq([
            { role: "system", content: BASE_SYSTEM_PROMPT },
            { role: "user", content: prompt }
        ], 0.3, { jsonMode: true });
        const cleanedGen = cleanJson(content);
        const parsed = parseJsonSafely(cleanedGen);
        const q = parsed.questions?.[0] || parsed;
        if (!q.stimulus) q.stimulus = { text: contextText.substring(0, 1000) };
        return q;
    } catch (e) {
        console.error("Groq Context Single Generation Failed:", e);
        throw e;
    }
};

/**
 * Generate AI distractors for structure fill-blank questions.
 * Creates 3 grammatically plausible but incorrect options.
 */
export const generateDistractors = async (
    sentence: string,
    correctAnswer: string
): Promise<string[]> => {
    const prompt = `You are a TOEFL question designer. Given a fill-blank sentence and the correct answer, generate 3 DISTRACTOR options.

Sentence: "${sentence}"
Correct Answer: "${correctAnswer}"

REQUIREMENTS:
1. Distractors should be grammatically similar to the correct answer (same word form)
2. Distractors should be WRONG but plausible (common mistakes students make)
3. For verbs: use wrong tense, wrong subject-verb agreement, or wrong form
4. For nouns/articles: use similar but incorrect words
5. Each distractor should be a single word or short phrase like the correct answer

Return ONLY a JSON array with exactly 3 distractors:
["distractor1", "distractor2", "distractor3"]`;

    try {
        const content = await callGroq([
            { role: "system", content: "Generate TOEFL distractors. Return ONLY valid JSON array." },
            { role: "user", content: prompt }
        ], 0.5, { jsonMode: true });

        const cleaned = cleanJson(content);
        const distractors = JSON.parse(cleaned);

        if (Array.isArray(distractors) && distractors.length >= 3) {
            const allChoices = [correctAnswer, ...distractors.slice(0, 3)];
            for (let i = allChoices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allChoices[i], allChoices[j]] = [allChoices[j], allChoices[i]];
            }
            return allChoices;
        }

        return [correctAnswer, 'option B', 'option C', 'option D'];
    } catch (e) {
        console.error("[Distractor] Generation failed:", e);
        return [correctAnswer, 'option B', 'option C', 'option D'];
    }
};

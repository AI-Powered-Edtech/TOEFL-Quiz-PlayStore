import { QuizData, SectionType } from '../types';

import { generateQuizUnified as generateQuizBatch } from './aiProvider';
import { validateQuizBatch } from './qualityService';
import { getUnifiedQuestionsBySkill, importQuestionsToBank } from './questionBankService';
import { validateQuestionStrictly } from './validationService';

/**
 * EMERGENCY BACKUP BANK
 */
const EMERGENCY_BACKUP: QuizData[] = [
    {
        id: 'backup_1', skill_id: 1, skill_type: 'structure', section: 'structure', interaction: 'multiple_choice',
        prompt: "Because of the rain, the baseball game _______.",
        choices: ['was canceled', 'canceling', 'canceled', 'cancel'],
        correct_response: ['was canceled'], cefr_target: 'A2', difficulty_score: 20,
        stimulus: { text: '' },
        metadata: { source: 'db', explanation: "Passive voice is required here.", pattern_tip: "Passive Voice", qti_compliant: true, cefr_compliant: true }
    },
    {
        id: 'backup_2', skill_id: 1, skill_type: 'structure', section: 'structure', interaction: 'multiple_choice',
        prompt: "The scientist _______ the microscope before starting the experiment.",
        choices: ['adjusting', 'adjusted', 'adjust', 'adjustment'],
        correct_response: ['adjusted'], cefr_target: 'A2', difficulty_score: 20,
        stimulus: { text: '' },
        metadata: { source: 'db', explanation: "Simple past tense is required.", pattern_tip: "Verb Tense", qti_compliant: true, cefr_compliant: true }
    }
];

/**
 * Hybrid Quiz Orchestrator with Aggressive Gap Filling
 */
export const getHybridQuiz = async (
    skillId: string,
    skillName: string,
    section: SectionType,
    totalCount: number = 10
): Promise<QuizData[]> => {

    console.log(`[QuizRepo] Orchestrating quiz for SKILL ID: ${skillId} (${section})`);

    // --- STEP 1: FETCH FROM UNIFIED BANK ---
    // Try to get 70% from DB
    const targetDbCount = Math.floor(totalCount * 0.7);
    const rawDbQuestions = await getUnifiedQuestionsBySkill(skillId, targetDbCount + 5);
    const validDbQuestions = rawDbQuestions.filter(q => validateQuestionStrictly(q, skillId, section));
    const finalDbQuestions = validDbQuestions.slice(0, targetDbCount);

    const isDbEmpty = finalDbQuestions.length === 0;
    console.log(`[QuizRepo] DB Result: Kept ${finalDbQuestions.length}. ${isDbEmpty ? 'DB EMPTY - Switching to Pure AI Mode.' : 'DB Data Found.'}`);

    // --- STEP 2: PARALLEL AI GENERATION ---
    let aiQuestions: QuizData[] = [];
    const deficit = totalCount - finalDbQuestions.length;
    let rawAiQuestions: QuizData[] = [];

    // Extract numeric ID for AI injection
    const numericSkillId = parseInt(skillId.replace(/\D/g, ''), 10);

    if (deficit > 0) {
        console.log(`[QuizRepo] Deficit: ${deficit}. Engaging Parallel Fetching.`);
        try {
            const promptTopic = `[${section}] ${skillName}`;

            const fetchSizePerProvider = Math.max(2, Math.ceil(deficit * 0.6));

            console.log(`[QuizRepo] Requesting ${deficit} questions from Groq for Skill ID: ${numericSkillId}.`);
            rawAiQuestions = await generateQuizBatch(promptTopic, section, deficit, numericSkillId)
                .catch(e => { console.error("Groq failed", e); return []; });

            // Processing & Validation
            rawAiQuestions = rawAiQuestions.map(q => ({
                ...q,
                skill_id: numericSkillId,
                metadata: {
                    ...q.metadata,
                    source: 'ai' as const
                }
            }));

            // STRICT VALIDATION
            const schemaValidAi = rawAiQuestions.filter(q => validateQuestionStrictly(q, skillId, section));

            // Deduplicate based on prompt text
            const uniqueAi = Array.from(new Map(schemaValidAi.map(item => [item.prompt, item])).values());

            // Quality Check (Parallel)
            const healedQuestions: QuizData[] = [];

            const qualityPromises = uniqueAi.map(async (q) => {
                if (isDbEmpty) return { q, score: 90, issues: [] };

                const textToCheck = q.prompt.length > 200 ? q.prompt.substring(0, 200) : q.prompt;
                return { q, ...await import('./qualityService').then(m => m.checkGrammarQuality(textToCheck)) };
            });

            const qualityResults = await Promise.all(qualityPromises);

            for (const res of qualityResults) {
                if (res.score >= 85) {
                    healedQuestions.push(res.q);
                } else {
                    // Try fast repair
                    try {
                        const { repairQuizQuestion } = await import('./groq/generators');
                        const fixedQ = await repairQuizQuestion(res.q, res.issues);
                        healedQuestions.push(fixedQ);
                    } catch (err) { /* ignore */ }
                }
            }

            aiQuestions = healedQuestions;

            // Save to DB
            if (aiQuestions.length > 0) {
                console.log(`[QuizRepo] Saving ${aiQuestions.length} AI questions to Bank...`);
                try {
                    const res = await importQuestionsToBank(aiQuestions);
                    console.log(`[QuizRepo] Saved ${res.added} questions.`);
                } catch (err) {
                    console.error("[QuizRepo] Background save failed", err);
                }
            }

        } catch (error) {
            console.error("[QuizRepo] AI Generation failed.", error);
        }
    }

    // --- STEP 3: GAP FILLING (FINAL SPRINT) ---
    let combined = [...finalDbQuestions, ...aiQuestions];
    combined = Array.from(new Map(combined.map(item => [item.prompt, item])).values());

    const finalDeficit = totalCount - combined.length;

    if (finalDeficit > 0) {
        console.log(`[QuizRepo] Still missing ${finalDeficit} questions. Executing Gap Fill Sprint for Skill ID: ${numericSkillId}...`);
        try {
            const gapFillQs = await generateQuizBatch(`[${section}] ${skillName}`, section, finalDeficit + 1, numericSkillId);

            const validGapFill = gapFillQs
                .map(q => ({ ...q, skill_id: numericSkillId, metadata: { ...q.metadata, source: 'ai' as const } }))
                .filter(q => validateQuestionStrictly(q, skillId, section));

            if (validGapFill.length > 0) {
                try {
                    await importQuestionsToBank(validGapFill);
                } catch (err) {
                    console.error("[QuizRepo] Gap fill save failed", err);
                }
            }

            combined = [...combined, ...validGapFill];
        } catch (e) {
            console.error("Gap fill failed", e);
        }
    }

    // --- STEP 4: EMERGENCY FALLBACK ---
    if (combined.length < 3) {
        combined = [...combined, ...EMERGENCY_BACKUP.map(q => ({ ...q, skill_id: numericSkillId }))];
    }

    return combined
        .slice(0, totalCount)
        .sort(() => 0.5 - Math.random());
};
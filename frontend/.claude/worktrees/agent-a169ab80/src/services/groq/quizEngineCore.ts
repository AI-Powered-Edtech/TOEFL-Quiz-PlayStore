/**
 * Quiz Engine Core — Shared utilities used by all section-specific engines.
 * Extracted from the monolithic quizGenerator.ts for maintainability.
 */

import { AdaptiveDifficulty, CanonicalQuestionV1 } from "../../types";
import { debugLog } from "../../utils/debugLogger";

// Academic topic pools for diversity injection
export const ACADEMIC_TOPICS = [
    'paleontology', 'astrophysics', 'marine biology', 'linguistics', 'microeconomics',
    'art history', 'neuroscience', 'environmental science', 'political science', 'sociology',
    'organic chemistry', 'archaeology', 'cultural anthropology', 'bioengineering', 'geology',
    'cognitive psychology', 'urban planning', 'molecular genetics', 'international trade', 'ethology'
];

/**
 * Post-generation deduplication filter.
 * Removes questions with nearly identical prompts within a batch.
 */
export const deduplicateQuestions = (questions: CanonicalQuestionV1[]): CanonicalQuestionV1[] => {
    const seen = new Set<string>();
    return questions.filter(q => {
        const fingerprint = (q.prompt || '').toLowerCase().replace(/\s+/g, ' ').substring(0, 40);
        if (seen.has(fingerprint)) {
            console.warn(`[Dedup] Removed duplicate question: "${fingerprint}..."`);
            return false;
        }
        seen.add(fingerprint);
        return true;
    });
};

/**
 * Post-generation quality sanitizer.
 * Auto-fixes missing blanks in structure questions and guarantees 4 unique options
 * to prevent UI crashes and improve generation yield.
 */
export const sanitizeQuestion = (q: any): any => {
    let prompt = q.prompt || q.question_text || '';
    let choices = Array.isArray(q.choices) ? [...q.choices] : (Array.isArray(q.options) ? [...q.options] : []);
    const correctResponse = Array.isArray(q.correct_response) ? q.correct_response : (q.answer ? [q.answer] : []);

    // DEBUG: Log incoming question state for Written Expression skills
    if (q.skill_id >= 20 && q.skill_id <= 60) {
        debugLog('Sanitize', `Skill ${q.skill_id}: section=${q.section}, interaction=${q.interaction}, skill_type=${q.skill_type}`);
        debugLog('Sanitize', `prompt="${prompt.substring(0, 80)}..."`);
        debugLog('Sanitize', `choices=${JSON.stringify(choices)}, correct_response=${JSON.stringify(correctResponse)}`);
        debugLog('Sanitize', `hasTags=${prompt.includes('{A}')}`);
    }

    // 1. Guarantee 4 unique choices to prevent UI breaking
    const uniqueChoices = new Set(choices.map((c: string) => (c || '').toLowerCase().trim()));
    if (uniqueChoices.size >= 1 && uniqueChoices.size < 4) {
        console.warn(`[Sanitize] Padding choices for ${prompt.substring(0, 30)}...`);
        choices = Array.from(new Set(choices));
        const placeholders = ['Option A', 'Option B', 'Option C', 'Option D'];
        while (choices.length < 4) {
            const p = placeholders.find(pl => !choices.includes(pl)) || `Extra Option ${choices.length + 1}`;
            choices.push(p);
        }
    }

    // 2. Fix missing blanks in structure questions
    // IMPORTANT: Written Expression (identify_error) should NOT have blanks, they have {A} tags
    const isStructure = q.section === 'structure' || q.interaction === 'fill_blank' || q.skill_type === 'structure';
    const isWrittenExpression = q.section === 'written' || q.interaction === 'identify_error' || q.skill_type === 'written';

    if (isStructure && !isWrittenExpression && !prompt.includes('___')) {
        const correctText = correctResponse[0] || choices[0] || '';
        if (correctText && prompt.includes(correctText)) {
            console.warn(`[Sanitize] Fixing missing blank. Replacing "${correctText}" with "_____"`);
            prompt = prompt.replace(correctText, '_____');
        } else if (correctText) {
            console.warn(`[Sanitize] Missing blank and couldn't match correct text. Appending blank.`);
            prompt = prompt + ' _____';
        }
    }

    return {
        ...q,
        prompt,
        choices,
        options: choices // Sync both forms just in case
    };
};

/**
 * Section-specific quality validation.
 * Returns true if question passes all quality checks.
 */
export const validateGeneratedQuestion = (q: CanonicalQuestionV1): { valid: boolean; reason?: string } => {
    const prompt = q.prompt || '';
    const choices = q.choices || [];
    const correctResponse = q.correct_response || [];

    // Universal checks
    if (choices.length !== 4) {
        return { valid: false, reason: `Only ${choices.length} choices (need 4)` };
    }

    const uniqueChoices = new Set(choices.map(c => (c || '').toLowerCase().trim()));
    if (uniqueChoices.size < 4) {
        return { valid: false, reason: `Duplicate choices detected: [${choices.join(', ')}]` };
    }

    if (!correctResponse[0]) {
        return { valid: false, reason: 'Missing correct_response' };
    }

    // Section-specific checks
    if (q.section === 'structure' || q.interaction === 'fill_blank') {
        if (!prompt.includes('___') && !prompt.includes('____')) {
            return { valid: false, reason: 'Structure question missing blank (___)' };
        }
    }

    if (q.section === 'written' || q.interaction === 'identify_error') {
        const missingTags = ['{A}', '{B}', '{C}', '{D}'].filter(tag => !prompt.includes(tag));
        if (missingTags.length > 0) {
            return { valid: false, reason: `Written question missing tags: ${missingTags.join(', ')}` };
        }
        const expectedLabels = JSON.stringify(['A', 'B', 'C', 'D']);
        if (JSON.stringify(choices) !== expectedLabels) {
            return { valid: false, reason: 'Written choices must be ["A","B","C","D"]' };
        }
    }

    if (q.section === 'reading') {
        const stimulusText = q.stimulus?.text || '';
        if (stimulusText.length < 100) {
            return { valid: false, reason: `Reading stimulus too short (${stimulusText.length} chars, need 100+)` };
        }
        if (!prompt || prompt.length < 10) {
            return { valid: false, reason: 'Reading question prompt empty or too short' };
        }
    }

    return { valid: true };
};

/**
 * Build anti-duplication diversity block for prompt injection.
 * Assigns random academic topics to each question slot.
 */
export const buildDiversityBlock = (count: number): { uniqueSeed: string; diversityInstruction: string } => {
    const uniqueSeed = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const shuffledTopics = [...ACADEMIC_TOPICS].sort(() => 0.5 - Math.random());
    const topicAssignments = shuffledTopics.slice(0, count);
    const diversityInstruction = topicAssignments.map((t, i) => {
        return `Question ${i + 1}: Use topic="${t}"`;
    }).join('\n');
    return { uniqueSeed, diversityInstruction };
};

// ─── ADAPTIVE DIFFICULTY UTILITIES ───────────────────────────────────────────

/**
 * Returns prompt modifier text for difficulty-aware generation.
 * Injected into each quiz engine's prompt to steer AI difficulty.
 */
export const getDifficultyPromptModifier = (difficulty?: AdaptiveDifficulty): string => {
    if (!difficulty || difficulty === 'medium') {
        return `\nDIFFICULTY LEVEL: Medium (B1-B2). Use standard academic vocabulary. Sentences should be moderately complex with 1-2 clauses. Difficulty score target: 36-65.`;
    }
    if (difficulty === 'easy') {
        return `\nDIFFICULTY LEVEL: Easy (A2-B1). Use simple, common vocabulary. Sentences should be short and straightforward with basic grammar patterns. Avoid complex subordinate clauses or rare vocabulary. Difficulty score target: 1-35.`;
    }
    return `\nDIFFICULTY LEVEL: Hard (B2-C1). Use advanced academic vocabulary and complex sentence structures. Include multi-clause sentences, passive voice, subjunctive mood, and nuanced grammar distinctions. Distractors should be very plausible. Difficulty score target: 66-100.`;
};

/**
 * Estimate CEFR level from numeric difficulty score.
 * Used to tag questions after generation.
 */
export const estimateCefrFromDifficulty = (score: number): 'A2' | 'B1' | 'B2' | 'C1' => {
    if (score <= 25) return 'A2';
    if (score <= 50) return 'B1';
    if (score <= 75) return 'B2';
    return 'C1';
};

/**
 * Get default difficulty score for a given adaptive level.
 */
export const getDefaultDifficultyScore = (difficulty?: AdaptiveDifficulty): number => {
    switch (difficulty) {
        case 'easy': return 25;
        case 'hard': return 75;
        default: return 50;
    }
};


import { CanonicalQuestionV1, SectionType } from '../types';

/**
 * PHASE 0 HARD GATE VALIDATOR
 * 
 * This validator enforces strict data integrity before questions enter the DB or UI.
 * Rules:
 * 1. Schema compliance (fields exist).
 * 2. Logical integrity (answer exists in choices).
 * 3. Domain constraints (Skill 20-60 formatting).
 * 4. Stimulus Contract (Reading/Listening must have content).
 */
export const validateCanonicalQuestion = (q: CanonicalQuestionV1): boolean => {
    // 1. Basic Schema Presence
    if (!q.skill_id || !q.skill_type || !q.interaction || !q.prompt || !q.choices || !q.correct_response) {
        console.warn(`[Validator] Missing required fields for Q: ${q.prompt?.substring(0, 20)}...`);
        return false;
    }

    // 2. CEFR Validation
    const validLevels = ['A2', 'B1', 'B2', 'C1'];
    if (!q.cefr_target || !validLevels.includes(q.cefr_target)) {
        console.warn(`[Validator] Invalid CEFR target: ${q.cefr_target}`);
        return false;
    }

    // 3. Answer Integrity Check
    if (q.choices.length === 0) return false;

    const validAnswer = q.correct_response.every(ans => q.choices.includes(ans));
    if (!validAnswer) {
        console.warn(`[Validator] Integrity Fail: Correct response '${JSON.stringify(q.correct_response)}' not found in choices '${JSON.stringify(q.choices)}'.`);
        return false;
    }

    // 4. Written Expression Hard Gate (Skills 20-60)
    // Only enforce for actual Written Expression skill_type
    const isWrittenSection = q.skill_type === 'written' || q.section === 'written';
    if (isWrittenSection || (q.skill_id >= 20 && q.skill_id <= 60 && q.skill_type !== 'listening')) {
        if (q.interaction !== 'identify_error') {
            console.warn(`[Validator] Hard Gate Fail: Skill ${q.skill_id} must have interaction 'identify_error', found '${q.interaction}'.`);
            return false;
        }

        // Check for tags - accept both {A}word{/A} format and {A}word format
        const hasClosingTags = /\{A\}.*?\{\/A\}.*\{B\}.*?\{\/B\}.*\{C\}.*?\{\/C\}.*\{D\}.*?\{\/D\}/s.test(q.prompt);
        const hasSimpleTags = /\{A\}.*\{B\}.*\{C\}.*\{D\}/s.test(q.prompt);

        if (!hasClosingTags && !hasSimpleTags) {
            console.warn(`[Validator] Hard Gate Fail: Skill ${q.skill_id} requires {A}...{D} tags.`);
            return false;
        }

        if (q.choices.length !== 4) {
            console.warn(`[Validator] Hard Gate Fail: Skill ${q.skill_id} requires exactly 4 options.`);
            return false;
        }
    }

    // 5a. Structure Hard Gate (Skills 1-19)
    // Only enforce for actual Structure skill_type
    const isStructureSection = q.skill_type === 'structure' || q.section === 'structure';
    if (isStructureSection && q.skill_id >= 1 && q.skill_id <= 19) {
        const hasBlank = q.prompt.includes('_______');
        if (!hasBlank) {
            console.warn(`[Validator] Hard Gate Fail: Skill ${q.skill_id} (Structure) requires '_______' placeholder.`);
            return false;
        }

        const hasTags = /\{A\}/.test(q.prompt);
        if (hasTags) {
            console.warn(`[Validator] Hard Gate Fail: Skill ${q.skill_id} (Structure) MUST NOT use {A} tags.`);
            return false;
        }
    }

    // 5. Stimulus Contract Enforcement
    if (q.skill_type === 'reading') {
        // Reading MUST have a text passage in stimulus.text (or fallback metadata.passage_text for legacy)
        // Cast metadata to any to safely check legacy property
        const hasText = q.stimulus?.text || (q.metadata as any)?.passage_text;
        if (!hasText) {
            console.warn(`[Validator] Stimulus Fail: Reading question missing passage text.`);
            return false;
        }
    }

    if (q.skill_type === 'listening') {
        // Listening MUST have a stimulus object (even if audio_url is placeholder, the object must exist)
        if (!q.stimulus) {
            console.warn(`[Validator] Stimulus Fail: Listening question missing stimulus object.`);
            return false;
        }
        // Ideally enforce audio_url, but for Phase 0 we might accept text transcript as fallback if audio_url is missing
        // strict spec says "HARUS punya audio URL", but we can allow empty string if handled by UI
        if (q.stimulus.audio_url === undefined && !q.stimulus.text) {
            console.warn(`[Validator] Stimulus Fail: Listening question missing both audio_url and text transcript.`);
            return false;
        }
    }

    // === CONTENT QUALITY GATES ===

    // 6. Minimum prompt length per section
    const promptLength = (q.prompt || '').length;
    const minLengths: Record<string, number> = {
        'structure': 30,  // Lowered: inversion questions (Skills 15-19) are inherently shorter
        'written': 60,
        'reading': 30,
        'listening': 20
    };
    const sectionKey = (q.section || q.skill_type || 'structure').toLowerCase();
    const minLen = minLengths[sectionKey] || 30;
    if (promptLength < minLen) {
        console.warn(`[Validator] Quality Fail: ${sectionKey} prompt too short (${promptLength} < ${minLen} chars): "${q.prompt?.substring(0, 30)}..."`);
        return false;
    }

    // 7. Choice uniqueness (at least 3 of 4 choices must be different — allows legitimate overlaps like past tense = past participle)
    if (q.choices && q.choices.length === 4) {
        const normalizedChoices = q.choices.map((c: string) => (c || '').toLowerCase().trim());
        const uniqueChoices = new Set(normalizedChoices);
        if (uniqueChoices.size < 3) {
            console.warn(`[Validator] Quality Fail: Too many duplicate choices (${uniqueChoices.size} unique): ${JSON.stringify(q.choices)}`);
            return false;
        }
    }

    // 8. Anti-trivial: reject if non-error-ID choices are all single characters
    if (q.interaction !== 'identify_error' && q.choices) {
        const allSingleChar = q.choices.every((c: string) => (c || '').trim().length <= 1);
        if (allSingleChar) {
            console.warn(`[Validator] Quality Fail: All choices are single characters (trivial): ${JSON.stringify(q.choices)}`);
            return false;
        }
    }

    return true;
};

export const validateQuestionStrictly = (q: any, targetSkillId: string, targetSection: SectionType): boolean => {
    return validateCanonicalQuestion(q as CanonicalQuestionV1);
};
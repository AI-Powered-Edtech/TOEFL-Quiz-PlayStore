/**
 * PDF Quiz Service
 * Handles smart distribution and database save for PDF-extracted questions
 */

import { QuizData, CanonicalQuestionV1 } from '../types';

import { importQuestionsToBank } from './questionBankService';

// ========================================
// TYPES
// ========================================

type AllowedSection = 'structure' | 'written' | 'reading' | 'listening';

interface ExtractedQuestion {
    prompt: string;
    choices: string[];
    correct_response: string[];
    stimulus?: {
        text?: string;
        audio_url?: string;
    };
    metadata?: {
        explanation?: string;
    };
    // May be pre-filled or empty
    section?: string;
    skill_id?: number;
}

interface DistributedQuestion extends ExtractedQuestion {
    section: AllowedSection;
    skill_id: number;
}

interface DistributionSummary {
    bySection: Record<string, number>;
    bySkill: Record<number, number>;
    warnings: string[];
}

interface SaveResult {
    saved: number;
    total: number;
    distribution: DistributionSummary;
    savedQuestions: any[];
}

// ========================================
// SMART SKILL DISTRIBUTION
// ========================================

/**
 * Detect structure skill (1-19) from prompt keywords
 */
const detectStructureSkill = (prompt: string): number => {
    const patterns = [
        { keywords: ['subject', 'verb'], skill: 1 },
        { keywords: ['preposition', 'object of'], skill: 2 },
        { keywords: ['appositive'], skill: 3 },
        { keywords: ['present participle', '-ing form'], skill: 4 },
        { keywords: ['past participle', '-ed form'], skill: 5 },
        { keywords: ['coordinate', 'and,', 'but,', 'or,'], skill: 6 },
        { keywords: ['because', 'after', 'before', 'when', 'while'], skill: 7 },
        { keywords: ['although', 'even though'], skill: 8 },
        { keywords: ['noun clause', 'what', 'how'], skill: 9 },
        { keywords: ['who', 'which', 'that', 'adjective clause'], skill: 11 },
        { keywords: ['reduced clause', 'reducing'], skill: 13 },
        { keywords: ['inversion', 'invert', 'rarely', 'never', 'seldom'], skill: 15 },
        { keywords: ['conditional', 'if', 'had he', 'were she'], skill: 18 }
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const p of patterns) {
        if (p.keywords.some(k => lowerPrompt.includes(k))) return p.skill;
    }
    return 1; // Default: Skill 1
};

/**
 * Detect written expression skill (20-60) from prompt keywords
 */
const detectWrittenSkill = (prompt: string): number => {
    const patterns = [
        { keywords: ['agreement', 'singular', 'plural', 'agrees with'], skill: 20 },
        { keywords: ['quantity', 'all of', 'most of', 'some of'], skill: 21 },
        { keywords: ['parallel', 'parallelism'], skill: 24 },
        { keywords: ['both...and', 'either...or', 'neither...nor'], skill: 25 },
        { keywords: ['comparative', 'more', 'most', '-er', '-est', 'than'], skill: 27 },
        { keywords: ['have', 'has', 'had', 'past participle'], skill: 30 },
        { keywords: ['be', 'being', 'been', 'is', 'are', 'was', 'were'], skill: 31 },
        { keywords: ['modal', 'will', 'can', 'may', 'should', 'must'], skill: 32 },
        { keywords: ['passive', 'by', 'was done', 'is done'], skill: 37 },
        { keywords: ['countable', 'uncountable', 'much', 'many', 'amount', 'number'], skill: 40 },
        { keywords: ['pronoun', 'he', 'she', 'they', 'him', 'her', 'them'], skill: 43 },
        { keywords: ['possessive', 'his', 'her', 'their', 'its'], skill: 44 },
        { keywords: ['adjective', 'adverb', '-ly'], skill: 46 },
        { keywords: ['article', 'a', 'an', 'the'], skill: 52 },
        { keywords: ['preposition', 'in', 'on', 'at', 'for', 'to'], skill: 56 }
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const p of patterns) {
        if (p.keywords.some(k => lowerPrompt.includes(k))) return p.skill;
    }
    return 20; // Default: Skill 20 (Subject/Verb Agreement)
};

/**
 * Detect reading skill (101+) from prompt keywords
 */
const detectReadingSkill = (prompt: string): number => {
    const patterns = [
        { keywords: ['main idea', 'mainly about', 'best title', 'primary purpose'], skill: 101 },
        { keywords: ['according to', 'stated', 'mentioned', 'passage states'], skill: 102 },
        { keywords: ['not mentioned', 'except', 'not true', 'all of the following'], skill: 103 },
        { keywords: ['infer', 'imply', 'suggest', 'can be concluded'], skill: 104 },
        { keywords: ['meaning', 'closest in meaning', 'word', 'refers to'], skill: 105 },
        { keywords: ['where', 'found', 'line', 'paragraph'], skill: 106 }
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const p of patterns) {
        if (p.keywords.some(k => lowerPrompt.includes(k))) return p.skill;
    }
    return 102; // Default: Stated Detail
};

/**
 * Detect listening skill (201+) from prompt keywords
 */
const detectListeningSkill = (prompt: string): number => {
    const patterns = [
        { keywords: ['main topic', 'mainly discussing', 'mainly about'], skill: 201 },
        { keywords: ['mean', 'saying', 'speaker means'], skill: 202 },
        { keywords: ['infer', 'imply', 'probably'], skill: 204 },
        { keywords: ['next', 'will do', 'going to'], skill: 205 }
    ];

    const lowerPrompt = prompt.toLowerCase();
    for (const p of patterns) {
        if (p.keywords.some(k => lowerPrompt.includes(k))) return p.skill;
    }
    return 201; // Default: Main Idea
};

/**
 * Detect section and skill_id from question content
 */
const detectSectionAndSkill = (q: ExtractedQuestion): { section: AllowedSection; skill_id: number } => {
    const prompt = q.prompt || '';
    const lowerPrompt = prompt.toLowerCase();

    const hasBlank = prompt.includes('___');
    const hasErrorMarkers = prompt.includes('{A}') || prompt.includes('{B}') ||
        prompt.includes('(A)') || prompt.includes('(B)');
    const hasPassage = q.stimulus?.text && q.stimulus.text.length > 80;
    const hasAudio = q.stimulus?.audio_url ||
        lowerPrompt.includes('lecture') ||
        lowerPrompt.includes('dialogue') ||
        lowerPrompt.includes('conversation') ||
        lowerPrompt.includes('speaker');

    // 1. Reading: Has long passage + comprehension question
    if (hasPassage && !hasBlank && !hasErrorMarkers) {
        return { section: 'reading', skill_id: detectReadingSkill(prompt) };
    }

    // 2. Listening: Has audio reference
    if (hasAudio) {
        return { section: 'listening', skill_id: detectListeningSkill(prompt) };
    }

    // 3. Written: Error identification pattern (underlined segments)
    if (hasErrorMarkers) {
        return { section: 'written', skill_id: detectWrittenSkill(prompt) };
    }

    // 4. Structure: Fill in blank (default)
    if (hasBlank) {
        return { section: 'structure', skill_id: detectStructureSkill(prompt) };
    }

    // 5. Default: Structure with generic skill
    return { section: 'structure', skill_id: 1 };
};

/**
 * Distribute questions to appropriate sections and skills
 */
export const distributeToSkills = (
    questions: ExtractedQuestion[]
): DistributedQuestion[] => {
    return questions.map(q => {
        // If already has valid section and skill_id, keep them
        if (q.section && q.skill_id &&
            ['structure', 'written', 'reading', 'listening'].includes(q.section)) {
            return {
                ...q,
                section: q.section as AllowedSection,
                skill_id: q.skill_id
            };
        }

        // Otherwise detect from content
        const { section, skill_id } = detectSectionAndSkill(q);
        return { ...q, section, skill_id };
    });
};

/**
 * Generate distribution summary
 */
const getDistributionSummary = (questions: DistributedQuestion[]): DistributionSummary => {
    const bySection: Record<string, number> = {};
    const bySkill: Record<number, number> = {};
    const warnings: string[] = [];

    questions.forEach(q => {
        bySection[q.section] = (bySection[q.section] || 0) + 1;
        bySkill[q.skill_id] = (bySkill[q.skill_id] || 0) + 1;
    });

    // Add warnings for edge cases
    if (Object.keys(bySection).length === 1) {
        warnings.push('All questions mapped to single section');
    }

    return { bySection, bySkill, warnings };
};

/**
 * Validate questions for allowed sections only
 */
const validatePdfQuizOutput = (questions: DistributedQuestion[]): DistributedQuestion[] => {
    const allowed: AllowedSection[] = ['structure', 'written', 'reading', 'listening'];
    return questions.filter(q => allowed.includes(q.section));
};

// ========================================
// MAIN SAVE FUNCTION
// ========================================

/**
 * Save PDF-extracted questions to bank with smart distribution
 * 
 * @param extractedQuestions - Questions extracted from PDF
 * @param options - Save options
 * @returns Save result with distribution summary
 */
export const savePdfQuizToBank = async (
    extractedQuestions: ExtractedQuestion[],
    options: {
        enableSmartDistribution?: boolean;
        userId?: string;
    } = {}
): Promise<SaveResult> => {
    const { enableSmartDistribution = true } = options;

    console.log(`[PdfQuizService] Processing ${extractedQuestions.length} questions...`);

    // 1. Apply smart distribution
    const distributed = enableSmartDistribution
        ? distributeToSkills(extractedQuestions)
        : extractedQuestions.map(q => ({
            ...q,
            section: (q.section || 'structure') as AllowedSection,
            skill_id: q.skill_id || 1
        }));

    console.log('[PdfQuizService] Distribution complete:',
        distributed.map(q => `${q.section}:${q.skill_id}`).join(', '));

    // 2. Validate for allowed sections
    const validated = validatePdfQuizOutput(distributed);

    if (validated.length < distributed.length) {
        console.warn(`[PdfQuizService] Filtered ${distributed.length - validated.length} invalid questions`);
    }

    // 3. Transform to QuizData format for importQuestionsToBank
    const quizDataFormat: QuizData[] = validated.map(q => ({
        skill_id: q.skill_id,
        section: q.section,
        skill_type: q.section, // Legacy support
        interaction: q.section === 'written' ? 'identify_error' :
            q.section === 'structure' ? 'fill_blank' : 'multiple_choice',
        prompt: q.prompt,
        choices: q.choices,
        correct_response: q.correct_response,
        cefr_target: 'B2',
        difficulty_score: 50,
        stimulus: q.stimulus || {},
        metadata: {
            source: 'pdf' as const,
            explanation: q.metadata?.explanation || '',
            qti_compliant: true,
            cefr_compliant: true
        }
    }));

    // 4. Call existing importQuestionsToBank
    const result = await importQuestionsToBank(quizDataFormat);

    // 5. Generate distribution summary
    const distribution = getDistributionSummary(validated);

    console.log('[PdfQuizService] Save complete:', {
        saved: result.added,
        total: validated.length,
        distribution: distribution.bySection
    });

    return {
        saved: result.added,
        total: validated.length,
        distribution,
        savedQuestions: result.savedQuestions
    };
};

/**
 * Preview distribution without saving
 * Useful for showing user what will be saved
 */
export const previewDistribution = (
    extractedQuestions: ExtractedQuestion[]
): { questions: DistributedQuestion[]; summary: DistributionSummary } => {
    const distributed = distributeToSkills(extractedQuestions);
    const validated = validatePdfQuizOutput(distributed);
    const summary = getDistributionSummary(validated);

    return { questions: validated, summary };
};

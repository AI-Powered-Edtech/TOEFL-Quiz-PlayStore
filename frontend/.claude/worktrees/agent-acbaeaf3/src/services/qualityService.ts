import { QuizData } from '../types';

// CONFIGURATION
const LT_API_URL = 'https://api.languagetool.org/v2/check'; 

interface LTMatch {
    message: string;
    shortMessage: string;
    replacements: { value: string }[];
    offset: number;
    length: number;
    rule: {
        id: string;
        description: string;
        issueType: string;
        category: { id: string; name: string };
    };
}

interface LTResponse {
    matches: LTMatch[];
}

/**
 * Checks the grammar quality of a generated question.
 * Returns a score (0-100) and a list of issues.
 */
export const checkGrammarQuality = async (text: string): Promise<{ score: number; issues: string[] }> => {
    try {
        // Clean text for checking (remove custom tags like {A}...{/A} or underscores)
        const cleanText = text
            .replace(/\{[A-D]\}/g, '')
            .replace(/\{\/[A-D]\}/g, '')
            .replace(/_+/g, 'something'); // Replace blanks with dummy word to check sentence structure

        const params = new URLSearchParams();
        params.append('text', cleanText);
        params.append('language', 'en-US');

        const response = await fetch(LT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: params
        });

        if (!response.ok) {
            console.warn('[QualityService] LT API unreachable. Skipping check.');
            return { score: 100, issues: [] };
        }

        const data: LTResponse = await response.json();
        
        const criticalErrors = data.matches.filter(m => 
            m.rule.issueType === 'grammar' || 
            m.rule.issueType === 'misspelling'
        );

        const score = Math.max(0, 100 - (criticalErrors.length * 15));
        const issues = criticalErrors.map(m => `${m.message} -> "${cleanText.substr(m.offset, m.length)}"`);

        return { score, issues };

    } catch (error) {
        console.error('[QualityService] Error checking grammar:', error);
        return { score: 100, issues: [] };
    }
};

/**
 * Validates a batch of quiz questions.
 * Returns only questions that meet the quality threshold.
 */
export const validateQuizBatch = async (questions: QuizData[], threshold = 85): Promise<QuizData[]> => {
    const validated: QuizData[] = [];

    for (const q of questions) {
        // We only check the main prompt text for now to save API calls
        // For Reading, checking the whole passage might be too heavy/expensive
        // Use stimulus.text for passage text instead of deprecated metadata.passage_text
        const textToCheck = q.skill_type === 'reading' && q.stimulus?.text 
            ? q.prompt // Only check question stem for reading
            : q.prompt;

        const { score, issues } = await checkGrammarQuality(textToCheck);

        if (score >= threshold) {
            // Since CanonicalQuestionV1 doesn't store quality score/issues directly in root,
            // we skip storing them or add to metadata if needed.
            // For now, we just return the question if it passes.
            validated.push(q);
        } else {
            console.warn(`[QualityService] Dropped Low Quality Question (${score}/100):`, issues);
        }
    }

    return validated;
};
export interface EssayValidationResult {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    stats: {
        wordCount: number;
        paragraphCount: number;
        sentenceCount: number;
        averageSentenceLength: number;
    };
}

/**
 * Validates an essay against minimum structural requirements for IELTS scoring.
 */
export function validateEssayStructure(
    essay: string,
    taskType: 'Task 1' | 'Task 2'
): EssayValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Word count validation
    const words = essay.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    // Standard IELTS minimums
    const minWords = taskType === 'Task 1' ? 150 : 250;

    if (wordCount < minWords) {
        warnings.push(`Essay is under length: ${wordCount} words (minimum: ${minWords}). This will reduce your score.`);
    }

    // Paragraph count
    const paragraphs = essay.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length < 3) {
        warnings.push(`Only ${paragraphs.length} paragraphs (recommended: 3+)`);
    }

    // Task 1: Check for overview
    if (taskType === 'Task 1') {
        const overviewKeywords = ['overall', 'in general', 'generally', 'overview'];
        const hasOverview = overviewKeywords.some(kw => essay.toLowerCase().includes(kw));
        if (!hasOverview) {
            warnings.push('No clear overview detected. Task 1 requires an overview.');
        }
    }

    // Task 2: Check for thesis
    if (taskType === 'Task 2') {
        const thesisKeywords = ['i believe', 'i think', 'in my opinion', 'i agree', 'this essay', 'will argue', 'my point of view'];
        const hasThesis = thesisKeywords.some(kw => essay.toLowerCase().includes(kw));
        if (!hasThesis) {
            warnings.push('No clear thesis statement detected.');
        }
    }

    const sentences = essay.split(/[.!?]+/).filter(s => s.trim().length > 0);

    return {
        isValid: errors.length === 0,
        warnings,
        errors,
        stats: {
            wordCount,
            paragraphCount: paragraphs.length,
            sentenceCount: sentences.length,
            averageSentenceLength: wordCount / (sentences.length || 1)
        }
    };
}

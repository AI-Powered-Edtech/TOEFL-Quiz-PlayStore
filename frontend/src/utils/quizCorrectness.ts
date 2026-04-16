import { CanonicalQuestionV1 } from '../types';

function normalizeToken(token: string): string {
    return token.trim().replace(/\s+/g, ' ').toLowerCase();
}

function extractLeadingChoiceLetter(token: string): string | null {
    const m = token.trim().match(/^[\(\[\s]*([A-D])[\)\]\.\:\-\s]*/i);
    return m ? m[1].toUpperCase() : null;
}

export function isCorrectOption(question: CanonicalQuestionV1, optionIndex: number): boolean {
    const choiceText = question.choices?.[optionIndex];
    if (choiceText == null) return false;

    const responses = Array.isArray(question.correct_response) ? question.correct_response : [];
    if (responses.length === 0) return false;

    const normalizedChoice = normalizeToken(choiceText);
    const letter = String.fromCharCode(65 + optionIndex);

    for (const raw of responses) {
        if (typeof raw !== 'string') continue;
        if (raw === choiceText) return true;

        const norm = normalizeToken(raw);
        if (norm === normalizedChoice) return true;

        const lead = extractLeadingChoiceLetter(raw);
        if (lead && lead === letter) return true;

        if (norm === letter.toLowerCase()) return true;
    }

    return false;
}


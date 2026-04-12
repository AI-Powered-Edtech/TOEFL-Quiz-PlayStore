export interface IndoglishPattern {
    incorrect: string;
    correct: string;
    explanation: string;
    category: 'Wordiness' | 'Preposition' | 'Direct Translation' | 'Redundancy' | 'Subject-Verb';
    pattern?: RegExp;
    severity?: 'minor' | 'moderate' | 'severe';
}

export const INDOGLISH_PATTERNS: IndoglishPattern[] = [
    { incorrect: "Discuss about", correct: "Discuss", explanation: "The verb 'discuss' is transitive and does not need a preposition.", category: "Preposition", pattern: /\bdiscuss\s+about\b/gi, severity: "moderate" },
    { incorrect: "Ask to [someone]", correct: "Ask [someone]", explanation: "The verb 'ask' is transitive and takes a direct object.", category: "Preposition", pattern: /\bask\s+to\s+(?:him|her|them|me|us|you|someone|somebody)\b/gi, severity: "moderate" },
    { incorrect: "Thanks before", correct: "Thanks in advance", explanation: "Direct translation from Indonesian 'Terima kasih sebelumnya'.", category: "Direct Translation", pattern: /\bthanks?\s+before\b/gi, severity: "minor" },
    { incorrect: "Join with", correct: "Join", explanation: "The verb 'join' does not require 'with'.", category: "Preposition", pattern: /\bjoin\s+with\b/gi, severity: "moderate" },
    { incorrect: "In my opinion, I think", correct: "In my opinion / I think", explanation: "Redundant phrasing. Use one or the other.", category: "Redundancy", pattern: /\bin my opinion[,;.]?\s*i think\b/gi, severity: "severe" },
    { incorrect: "Make a decision", correct: "Decide", explanation: "Wordy noun phrase. A single strong verb is better.", category: "Wordiness", pattern: /\bmake\s+a\s+decision\b/gi, severity: "minor" },
    { incorrect: "The people they are", correct: "The people are", explanation: "Double subject (noun + pronoun) is an error.", category: "Subject-Verb", pattern: /\bthe\s+(?:people|students?|teachers?|workers?)\s+they\s+(?:are|were|is|was)\b/gi, severity: "severe" },
    { incorrect: "Ever go to", correct: "Have been to", explanation: "Translating 'Pernah ke' literally.", category: "Direct Translation", pattern: /\bever\s+go\s+to\b/gi, severity: "moderate" },
    { incorrect: "Same with", correct: "Same as", explanation: "Incorrect preposition usage.", category: "Preposition", pattern: /\bsame\s+with\b/gi, severity: "moderate" },
    { incorrect: "Boring with", correct: "Bored with", explanation: "Confusing -ed (feeling) and -ing (cause) adjectives.", category: "Direct Translation", pattern: /\bboring\s+with\b/gi, severity: "moderate" },
    { incorrect: "Hard to be found", correct: "Hard to find", explanation: "Translating passive 'sulit ditemukan' too literally.", category: "Direct Translation", pattern: /\bhard\s+to\s+be\s+found\b/gi, severity: "moderate" },
    { incorrect: "Make me happy", correct: "Makes me happy", explanation: "Often misused contextually with wrong conjugation.", category: "Direct Translation", pattern: /\bmake\s+me\s+(?:happy|sad|angry|tired)\b/gi, severity: "minor" },
    { incorrect: "According to me", correct: "In my opinion", explanation: "Translate 'Menurut saya' literally. 'According to' is used for external sources.", category: "Direct Translation", pattern: /\baccording\s+to\s+me\b/gi, severity: "severe" },
    { incorrect: "Cannot to do", correct: "Cannot do", explanation: "Adding 'to' after modals is a common error.", category: "Direct Translation", pattern: /\b(?:cannot|can't|could\s+not|couldn't)\s+to\s+\w+/gi, severity: "severe" },
    { incorrect: "Different with", correct: "Different from", explanation: "Incorrect preposition. 'With' implies accompaniment.", category: "Preposition", pattern: /\bdifferent\s+with\b/gi, severity: "moderate" },
    { incorrect: "More better", correct: "Better", explanation: "Double comparative.", category: "Redundancy", pattern: /\bmore\s+(?:better|worse|bigger|smaller|faster|slower)\b/gi, severity: "severe" },
    { incorrect: "Although [X], but [Y]", correct: "Although [X], [Y]", explanation: "Double conjunction. Use 'Although' OR 'but', not both.", category: "Redundancy", pattern: /\balthough\b[^.]*\bbut\b/gi, severity: "severe" },
    { incorrect: "Because [X], so [Y]", correct: "Because [X], [Y]", explanation: "Double conjunction. Use 'Because' OR 'so', not both.", category: "Redundancy", pattern: /\bbecause\b[^.]*\bso\b/gi, severity: "severe" },
    { incorrect: "Search about", correct: "Search for", explanation: "Incorrect preposition.", category: "Preposition", pattern: /\bsearch\s+about\b/gi, severity: "moderate" },
    { incorrect: "Return back", correct: "Return", explanation: "Redundant. 'Return' already means 'go back' or 'give back'.", category: "Redundancy", pattern: /\breturn\s+back\b/gi, severity: "moderate" },
    { incorrect: "Repeat again", correct: "Repeat", explanation: "Redundant. 'Repeat' already means doing it again.", category: "Redundancy", pattern: /\brepeat\s+again\b/gi, severity: "moderate" },
];

/**
 * Detect Indoglish patterns in text using regex
 */
export function detectIndoglishInText(text: string): Array<{
    pattern: IndoglishPattern;
    matches: string[];
    positions: Array<{ start: number; end: number }>;
}> {
    const results: Array<{
        pattern: IndoglishPattern;
        matches: string[];
        positions: Array<{ start: number; end: number }>;
    }> = [];

    for (const pat of INDOGLISH_PATTERNS) {
        if (!pat.pattern) continue;

        const matches: string[] = [];
        const positions: Array<{ start: number; end: number }> = [];

        // Reset regex lastIndex since we use /g flag
        pat.pattern.lastIndex = 0;

        let match;
        while ((match = pat.pattern.exec(text)) !== null) {
            matches.push(match[0]);
            positions.push({ start: match.index, end: match.index + match[0].length });
        }

        if (matches.length > 0) {
            results.push({ pattern: pat, matches, positions });
        }
    }

    return results;
}

export const generateIndoglishPromptSection = (): string => {
    let section = `1. Strict Grading: Be keen on "Indoglish" (Indonesian-English interference). Look for the following common patterns:\n`;
    INDOGLISH_PATTERNS.forEach(p => {
        section += `   - "${p.incorrect}" (Incorrect) -> "${p.correct}" (Correct). ${p.explanation}\n`;
    });
    return section;
};

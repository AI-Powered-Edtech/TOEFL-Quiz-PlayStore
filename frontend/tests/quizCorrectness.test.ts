import { describe, expect, it } from 'vitest';

import { isCorrectOption } from '../src/utils/quizCorrectness';

describe('isCorrectOption', () => {
    it('matches by exact choice text', () => {
        const q: any = {
            choices: ['go', 'goes', 'going', 'gone'],
            correct_response: ['go'],
        };
        expect(isCorrectOption(q, 0)).toBe(true);
        expect(isCorrectOption(q, 1)).toBe(false);
    });

    it('matches by letter token', () => {
        const q: any = {
            choices: ['alpha', 'beta', 'gamma', 'delta'],
            correct_response: ['C'],
        };
        expect(isCorrectOption(q, 2)).toBe(true);
        expect(isCorrectOption(q, 1)).toBe(false);
    });

    it('matches by letter with punctuation', () => {
        const q: any = {
            choices: ['alpha', 'beta', 'gamma', 'delta'],
            correct_response: ['(B)'],
        };
        expect(isCorrectOption(q, 1)).toBe(true);
        expect(isCorrectOption(q, 0)).toBe(false);
    });
});


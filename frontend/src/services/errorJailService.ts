/**
 * Error Jail Service
 * Manages questions that users answered incorrectly
 */

import { QuizData } from '../types';

const ERROR_JAIL_KEY = 'error_jail_';

const getErrorJailKey = (userId: string): string => `${ERROR_JAIL_KEY}${userId}`;

const getLocalErrorJail = (userId: string): { questionId: string; question: QuizData; section: string; answeredAt: string }[] => {
    try {
        const stored = localStorage.getItem(getErrorJailKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveLocalErrorJail = (userId: string, entries: { questionId: string; question: QuizData; section: string; answeredAt: string }[]): void => {
    localStorage.setItem(getErrorJailKey(userId), JSON.stringify(entries));
};

export const getIncorrectQuestions = async (
    userId: string,
    section?: string
): Promise<QuizData[]> => {
    console.log(`[ErrorJail] Fetching incorrect questions for user ${userId}${section ? ` (section: ${section})` : ''}`);

    let questions = getLocalErrorJail(userId);

    if (section && section !== 'all') {
        questions = questions.filter(q => q.section === section);
    }

    if (questions.length === 0) {
        console.log('[ErrorJail] No incorrect questions found');
        return [];
    }

    return questions.map(q => q.question);
};

export const addToErrorJail = async (
    userId: string,
    question: QuizData,
    section: string
): Promise<void> => {
    const entries = getLocalErrorJail(userId);
    const existingIndex = entries.findIndex(e => e.questionId === question.id);

    const entry = {
        questionId: question.id || `q_${Date.now()}`,
        question,
        section,
        answeredAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        entries[existingIndex] = entry;
    } else {
        entries.push(entry);
    }

    if (entries.length > 200) {
        entries.splice(0, entries.length - 200);
    }

    saveLocalErrorJail(userId, entries);
};

export const removeFromErrorJail = async (
    userId: string,
    questionId: string
): Promise<void> => {
    const entries = getLocalErrorJail(userId);
    const filtered = entries.filter(e => e.questionId !== questionId);
    saveLocalErrorJail(userId, filtered);
};

export const clearErrorJail = async (
    userId: string,
    section?: string
): Promise<void> => {
    if (section) {
        const entries = getLocalErrorJail(userId);
        const filtered = entries.filter(e => e.section !== section);
        saveLocalErrorJail(userId, filtered);
    } else {
        localStorage.removeItem(getErrorJailKey(userId));
    }
};

export const clearJail = clearErrorJail;

export const getJailStats = async (
    userId: string
): Promise<{ total: number; bySection: Record<string, number> }> => {
    const entries = getLocalErrorJail(userId);
    const bySection: Record<string, number> = {};

    for (const entry of entries) {
        bySection[entry.section] = (bySection[entry.section] || 0) + 1;
    }

    return { total: entries.length, bySection };
};

export const reviewErrorJailItem = async (
    userId: string,
    questionId: string,
    markAsCorrect: boolean
): Promise<void> => {
    if (markAsCorrect) {
        await removeFromErrorJail(userId, questionId);
    }
};

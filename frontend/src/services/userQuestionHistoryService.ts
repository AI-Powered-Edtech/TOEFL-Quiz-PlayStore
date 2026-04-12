/**
 * User Question History Service
 * Tracks which questions each user has completed in Full Simulation
 */

import { apiClient } from './apiClient';

const HISTORY_KEY_PREFIX = 'quiz_history_';

interface QuestionHistoryEntry {
    id: string;
    user_id: string;
    question_id: string;
    section: string;
    answered_at: string;
    is_correct: boolean;
}

interface CompletionStats {
    answered: number;
    correct: number;
}

/**
 * Get local storage key for user's history
 */
const getHistoryKey = (userId: string): string => `${HISTORY_KEY_PREFIX}${userId}`;

/**
 * Get all history from local storage
 */
const getLocalHistory = (userId: string): QuestionHistoryEntry[] => {
    try {
        const stored = localStorage.getItem(getHistoryKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

/**
 * Save history to local storage
 */
const saveLocalHistory = (userId: string, history: QuestionHistoryEntry[]): void => {
    localStorage.setItem(getHistoryKey(userId), JSON.stringify(history));
};

/**
 * Menyimpan bahwa user sudah menjawab soal tertentu
 */
export const markQuestionAsAnswered = async (
    userId: string,
    questionId: string,
    section: string,
    isCorrect: boolean
): Promise<void> => {
    try {
        const history = getLocalHistory(userId);
        const existingIndex = history.findIndex(h => h.question_id === questionId);

        const entry: QuestionHistoryEntry = {
            id: existingIndex >= 0 ? history[existingIndex].id : crypto.randomUUID(),
            user_id: userId,
            question_id: questionId,
            section,
            is_correct: isCorrect,
            answered_at: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            history[existingIndex] = entry;
        } else {
            history.push(entry);
        }

        saveLocalHistory(userId, history);
    } catch (err) {
        console.error('[HistoryService] Failed to mark question as answered:', err);
    }
};

/**
 * Batch mark multiple questions as answered
 */
export const markQuestionsAsAnswered = async (
    userId: string,
    entries: { questionId: string; section: string; isCorrect: boolean; questionSnapshot?: Record<string, any> }[]
): Promise<void> => {
    try {
        const history = getLocalHistory(userId);
        const existingIds = new Set(history.map(h => h.question_id));

        for (const entry of entries) {
            if (existingIds.has(entry.questionId)) {
                const idx = history.findIndex(h => h.question_id === entry.questionId);
                if (idx >= 0) {
                    history[idx] = {
                        ...history[idx],
                        section: entry.section,
                        is_correct: entry.isCorrect,
                        answered_at: new Date().toISOString()
                    };
                }
            } else {
                history.push({
                    id: crypto.randomUUID(),
                    user_id: userId,
                    question_id: entry.questionId,
                    section: entry.section,
                    is_correct: entry.isCorrect,
                    answered_at: new Date().toISOString()
                });
            }
        }

        saveLocalHistory(userId, history);
        console.log(`[HistoryService] Marked ${entries.length} questions as answered for user ${userId}`);
    } catch (err) {
        console.error('[HistoryService] Failed to batch mark questions:', err);
    }
};

/**
 * Mendapatkan semua question_id yang sudah dijawab user untuk section tertentu
 */
export const getAnsweredQuestionIds = async (
    userId: string,
    section?: string
): Promise<string[]> => {
    try {
        const history = getLocalHistory(userId);

        if (section) {
            return history
                .filter(h => h.section === section)
                .map(h => h.question_id);
        }

        return history.map(h => h.question_id);
    } catch (err) {
        console.error('[HistoryService] Failed to get answered questions:', err);
        return [];
    }
};

/**
 * Clear history untuk user (reset progress)
 */
export const clearUserHistory = async (
    userId: string,
    section?: string
): Promise<void> => {
    try {
        if (section) {
            const history = getLocalHistory(userId);
            const filtered = history.filter(h => h.section !== section);
            saveLocalHistory(userId, filtered);
            console.log(`[HistoryService] Cleared history for user ${userId} (section: ${section})`);
        } else {
            localStorage.removeItem(getHistoryKey(userId));
            console.log(`[HistoryService] Cleared all history for user ${userId}`);
        }
    } catch (err) {
        console.error('[HistoryService] Failed to clear history:', err);
    }
};

/**
 * Get completion stats per section
 */
export const getCompletionStats = async (
    userId: string
): Promise<Record<string, CompletionStats>> => {
    try {
        const history = getLocalHistory(userId);
        const stats: Record<string, CompletionStats> = {};

        for (const entry of history) {
            if (!stats[entry.section]) {
                stats[entry.section] = { answered: 0, correct: 0 };
            }
            stats[entry.section].answered++;
            if (entry.is_correct) {
                stats[entry.section].correct++;
            }
        }

        return stats;
    } catch (err) {
        console.error('[HistoryService] Failed to get stats:', err);
        return {};
    }
};

/**
 * Get recent history entries
 */
export const getRecentHistory = async (
    userId: string,
    limit: number = 50
): Promise<QuestionHistoryEntry[]> => {
    try {
        const history = getLocalHistory(userId);
        return history
            .sort((a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime())
            .slice(0, limit);
    } catch (err) {
        console.error('[HistoryService] Failed to get recent history:', err);
        return [];
    }
};

/**
 * Sync history with server (optional - for future backend implementation)
 */
export const syncHistoryWithServer = async (userId: string): Promise<void> => {
    try {
        const localHistory = getLocalHistory(userId);
        if (localHistory.length === 0) return;

        // Future: POST to backend endpoint when implemented
        console.log(`[HistoryService] Would sync ${localHistory.length} entries to server`);
    } catch (err) {
        console.error('[HistoryService] Failed to sync with server:', err);
    }
};

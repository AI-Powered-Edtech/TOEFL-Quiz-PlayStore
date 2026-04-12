/**
 * User Question History Service
 * Tracks which questions each user has completed in Full Simulation
 */

import { supabase } from './supabase';

interface QuestionHistoryEntry {
    id: string;
    user_id: string;
    question_id: string;
    section: string;
    answered_at: string;
    is_correct: boolean;
}

/**
 * Menyimpan bahwa user sudah menjawab soal tertentu
 */
export const markQuestionAsAnswered = async (
    userId: string,
    questionId: string,
    section: string,
    isCorrect: boolean
): Promise<void> => {
    const { error } = await supabase
        .from('user_question_history')
        .upsert({
            user_id: userId,
            question_id: questionId,
            section,
            is_correct: isCorrect,
            answered_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,question_id'
        });

    if (error) {
        console.error('[HistoryService] Failed to mark question as answered:', error);
    }
};

/**
 * Batch mark multiple questions as answered
 */
export const markQuestionsAsAnswered = async (
    userId: string,
    entries: { questionId: string; section: string; isCorrect: boolean; questionSnapshot?: Record<string, any> }[]
): Promise<void> => {
    const payload = entries.map(e => ({
        user_id: userId,
        question_id: e.questionId,
        section: e.section,
        is_correct: e.isCorrect,
        answered_at: new Date().toISOString(),
        question_snapshot: e.questionSnapshot || null
    }));

    const { error } = await supabase
        .from('user_question_history')
        .upsert(payload, { onConflict: 'user_id,question_id' });

    if (error) {
        console.error('[HistoryService] Failed to batch mark questions:', error);
    } else {
        console.log(`[HistoryService] Marked ${entries.length} questions as answered for user ${userId}`);
    }
};

/**
 * Mendapatkan semua question_id yang sudah dijawab user untuk section tertentu
 */
export const getAnsweredQuestionIds = async (
    userId: string,
    section?: string
): Promise<string[]> => {
    let query = supabase
        .from('user_question_history')
        .select('question_id')
        .eq('user_id', userId);

    if (section) {
        query = query.eq('section', section);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[HistoryService] Failed to get answered questions:', error);
        return [];
    }

    return (data || []).map(d => d.question_id);
};

/**
 * Clear history untuk user (reset progress)
 */
export const clearUserHistory = async (
    userId: string,
    section?: string
): Promise<void> => {
    let query = supabase
        .from('user_question_history')
        .delete()
        .eq('user_id', userId);

    if (section) {
        query = query.eq('section', section);
    }

    const { error } = await query;

    if (error) {
        console.error('[HistoryService] Failed to clear history:', error);
    } else {
        console.log(`[HistoryService] Cleared history for user ${userId}${section ? ` (section: ${section})` : ''}`);
    }
};

/**
 * Get completion stats per section
 */
export const getCompletionStats = async (
    userId: string
): Promise<Record<string, { answered: number; correct: number }>> => {
    const { data, error } = await supabase
        .from('user_question_history')
        .select('section, is_correct')
        .eq('user_id', userId);

    if (error) {
        console.error('[HistoryService] Failed to get stats:', error);
        return {};
    }

    const stats: Record<string, { answered: number; correct: number }> = {};

    for (const row of data || []) {
        if (!stats[row.section]) {
            stats[row.section] = { answered: 0, correct: 0 };
        }
        stats[row.section].answered++;
        if (row.is_correct) {
            stats[row.section].correct++;
        }
    }

    return stats;
};

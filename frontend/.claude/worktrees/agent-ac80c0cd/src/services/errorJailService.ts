/**
 * Error Jail Service
 * Manages questions that users answered incorrectly
 * Uses user_question_history table with is_correct = false filter
 * Reads question data from question_snapshot JSONB column
 */

import { QuizData } from '../types';

import { supabase } from './supabase';

/**
 * Get all questions user answered incorrectly
 * Uses question_snapshot stored in user_question_history
 */
export const getIncorrectQuestions = async (
    userId: string,
    section?: string
): Promise<QuizData[]> => {
    console.log(`[ErrorJail] Fetching incorrect questions for user ${userId}${section ? ` (section: ${section})` : ''}`);

    let query = supabase
        .from('user_question_history')
        .select('question_id, section, answered_at, question_snapshot')
        .eq('user_id', userId)
        .eq('is_correct', false)
        .order('answered_at', { ascending: false });

    // Optional section filter
    if (section && section !== 'all') {
        query = query.eq('section', section);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[ErrorJail] Failed to fetch incorrect questions:', error);
        throw error;
    }

    if (!data || data.length === 0) {
        console.log('[ErrorJail] No incorrect questions found');
        return [];
    }

    // Map to QuizData format using question_snapshot
    const questions: QuizData[] = data
        .filter(record => record.question_snapshot)
        .map(record => {
            const snap = record.question_snapshot as any;
            return {
                id: snap.id || record.question_id,
                skill_id: snap.skill_id,
                section: snap.section || record.section,
                skill_type: snap.section || record.section,
                interaction: snap.interaction,
                prompt: snap.prompt,
                choices: snap.choices || [],
                correct_response: snap.correct_response || [],
                cefr_target: snap.cefr_target,
                difficulty_score: snap.difficulty_score,
                stimulus: snap.stimulus || {},
                metadata: {
                    source: 'db' as const,
                    explanation: snap.metadata?.explanation || '',
                    pattern_tip: snap.metadata?.pattern_tip,
                    referenced_text: snap.metadata?.referenced_text,
                    hints: snap.metadata?.hints || [],
                    qti_compliant: true,
                    cefr_compliant: true,
                }
            };
        });

    console.log(`[ErrorJail] Found ${questions.length} incorrect questions`);
    return questions;
};

/**
 * Get count of incorrect questions per section
 */
export const getJailStats = async (
    userId: string
): Promise<Record<string, number>> => {
    console.log(`[ErrorJail] Fetching stats for user ${userId}`);

    const { data, error } = await supabase
        .from('user_question_history')
        .select('section')
        .eq('user_id', userId)
        .eq('is_correct', false);

    if (error) {
        console.error('[ErrorJail] Failed to fetch stats:', error);
        return {};
    }

    // Count by section
    const stats: Record<string, number> = {};
    for (const row of data || []) {
        stats[row.section] = (stats[row.section] || 0) + 1;
    }

    console.log('[ErrorJail] Stats:', stats);
    return stats;
};

/**
 * Clear all incorrect questions for user
 * Deletes history records where is_correct = false
 */
export const clearJail = async (
    userId: string,
    section?: string
): Promise<void> => {
    console.log(`[ErrorJail] Clearing jail for user ${userId}${section ? ` (section: ${section})` : ''}`);

    let query = supabase
        .from('user_question_history')
        .delete()
        .eq('user_id', userId)
        .eq('is_correct', false);

    if (section && section !== 'all') {
        query = query.eq('section', section);
    }

    const { error } = await query;

    if (error) {
        console.error('[ErrorJail] Failed to clear jail:', error);
        throw error;
    }

    console.log('[ErrorJail] Jail cleared successfully');
};

/**
 * Get total count of jailed questions
 */
export const getJailCount = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
        .from('user_question_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_correct', false);

    if (error) {
        console.error('[ErrorJail] Failed to get count:', error);
        return 0;
    }

    return count || 0;
};

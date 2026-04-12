
import { QuizReportData } from '../types';

import { supabase } from './supabase';

export const saveQuizReport = async (data: {
    topic: string;
    score: number;
    total: number;
    correct: number;
    answers: any[];
    studentName: string;
    userId?: string; // Made Optional for Guest sharing
}): Promise<string | null> => {
    
    // Construct payload strictly matching DB schema
    const payload: any = {
        student_name: data.studentName,
        quiz_topic: data.topic,
        score: data.score,
        total_questions: data.total,
        correct_count: data.correct,
        answers_snapshot: data.answers, // JSONB
    };

    // Only attach user_id if it exists (authenticated user)
    // For guests, this column will be NULL (Requires DB column to be nullable)
    if (data.userId) {
        payload.user_id = data.userId;
    }

    const { data: inserted, error } = await supabase
        .from('quiz_reports')
        .insert([payload])
        .select('id')
        .single();

    if (error) {
        console.error("Failed to save report:", error);
        return null;
    }

    return inserted.id;
};

export const getQuizReportById = async (id: string): Promise<QuizReportData | null> => {
    const { data, error } = await supabase
        .from('quiz_reports')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error("Failed to fetch report:", error);
        return null;
    }

    return data as QuizReportData;
};

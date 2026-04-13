/**
 * @deprecated Use quizService from './quiz.ts' instead.
 */
import { QuizReportData } from '../types';

const REPORTS_KEY = 'quiz_reports';

const getReports = (): QuizReportData[] => {
    try {
        const stored = localStorage.getItem(REPORTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveReports = (reports: QuizReportData[]): void => {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

export const saveQuizReport = async (data: {
    topic: string;
    score: number;
    total: number;
    correct: number;
    answers: any[];
    studentName: string;
    userId?: string;
}): Promise<string | null> => {
    const id = crypto.randomUUID();

    const report: QuizReportData = {
        id,
        student_name: data.studentName,
        quiz_topic: data.topic,
        score: data.score,
        total_questions: data.total,
        correct_count: data.correct,
        answers_snapshot: data.answers,
        user_id: data.userId || null,
        created_at: new Date().toISOString()
    };

    const reports = getReports();
    reports.unshift(report);
    if (reports.length > 100) reports.splice(100);
    saveReports(reports);

    return id;
};

export const getQuizReportById = async (id: string): Promise<QuizReportData | null> => {
    const reports = getReports();
    return reports.find(r => r.id === id) || null;
};

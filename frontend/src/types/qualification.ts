/**
 * Reviewer Qualification Types
 * Type definitions for reviewer qualification and training system
 */

export interface QualificationStatus {
    user_id: string;
    tutorial_completed: boolean;
    tutorial_completed_at?: string;
    quiz_completed?: boolean;
    quiz_score?: number;
    quiz_passed?: boolean;
    quiz_attempts: number;
    qualified: boolean;
    qualified_at?: string;
    started_at?: string;
    qualification_level?: number;
    expires_at?: string;
}

export interface QualificationTutorial {
    id: string;
    title: string;
    description: string;
    steps: TutorialStep[];
    estimated_time: number; // in minutes
}

export interface TutorialStep {
    id: string;
    title: string;
    content: string;
    type: 'text' | 'example' | 'interactive' | 'video';
    example?: TutorialExample;
    interactive_task?: InteractiveTask;
}

export interface TutorialExample {
    essay_content: string;
    prompt: string;
    task_type: 'Task 1' | 'Task 2';
    sample_review: {
        scores: {
            taskResponse: number;
            coherence: number;
            lexical: number;
            grammar: number;
        };
        strengths: string;
        weaknesses: string;
        suggestions: string;
        inline_corrections: Array<{
            original: string;
            correction: string;
            explanation: string;
        }>;
    };
    explanation: string;
}

export interface InteractiveTask {
    type: 'score_essay' | 'identify_error' | 'write_feedback';
    essay_content: string;
    prompt: string;
    correct_answer: any;
    points: number;
}

export interface QualificationQuiz {
    id: string;
    questions: QuizQuestion[];
    passing_score: number; // percentage
    time_limit: number; // in minutes
}

export interface QuizQuestion {
    id: string;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'matching';
    options?: string[];
    correct_answer: string | number;
    explanation: string;
    points: number;
}

export interface QuizResult {
    user_id: string;
    quiz_id: string;
    score: number;
    passed: boolean;
    answers: Array<{
        question_id: string;
        answer: string | number;
        correct: boolean;
    }>;
    completed_at: string;
    time_taken: number; // in seconds
}

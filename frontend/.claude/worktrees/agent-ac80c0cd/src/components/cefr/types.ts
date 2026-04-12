export type Phase = 'intro' | 'loading' | 'reading' | 'listening_intro' | 'listening' | 'writing_intro' | 'writing' | 'speaking_intro' | 'speaking' | 'grading' | 'results';

export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
}

export interface ReadingData {
    part1: Question[];
    part2: { passage: string; questions: Question[] };
    part3: { passage: string; questions: Question[] };
}

export interface ListeningClip {
    id: string;
    difficulty: string; // A2, B1, B2, C1
    context: string; // Short description: 'At the library', 'University lecture', etc.
    audioScript: string;
    audioId?: string;
    questions: Question[];
}

export type ListeningData = ListeningClip[];

export interface WritingData {
    part1: string;
    part2: string;
    part3: string;
    part4: string;
}

export interface SpeakingData {
    part1: { prompt: string; audioId?: string };
    part2: { prompt: string; audioId?: string };
    part3: { prompt: string; audioId?: string };
    part4: { prompt: string; audioId?: string };
}

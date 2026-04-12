/**
 * CEFR Scoring Utilities
 * 
 * Extracted from CefrSimulationView for testability and reuse.
 */

import type { ReadingData, ListeningData } from '../components/cefr/types';

// === CEFR Level Mapping ===

export interface CefrLevelInfo {
    level: string;
    name: string;
    description: string;
    color: string;      // Tailwind color class stem (e.g. 'green', 'blue')
    gradient: string;   // Tailwind gradient for the hero badge
}

const CEFR_LEVELS: Record<string, Omit<CefrLevelInfo, 'level'>> = {
    C2: {
        name: 'Mastery',
        description: 'Near-native fluency with precise and nuanced expression.',
        color: 'violet',
        gradient: 'from-violet-500 to-purple-600',
    },
    C1: {
        name: 'Advanced',
        description: 'Excellent! You have mastered complex tasks and express yourself fluently.',
        color: 'blue',
        gradient: 'from-blue-500 to-indigo-600',
    },
    B2: {
        name: 'Upper Intermediate',
        description: 'Strong understanding of complex texts and interactions.',
        color: 'emerald',
        gradient: 'from-emerald-500 to-teal-600',
    },
    B1: {
        name: 'Intermediate',
        description: 'Can handle most travel and work situations effectively.',
        color: 'amber',
        gradient: 'from-amber-500 to-orange-600',
    },
    A2: {
        name: 'Elementary',
        description: 'Can communicate in simple everyday situations.',
        color: 'orange',
        gradient: 'from-orange-500 to-red-500',
    },
    A1: {
        name: 'Beginner',
        description: 'Basic phrases and simple interactions.',
        color: 'red',
        gradient: 'from-red-500 to-rose-600',
    },
};

export const getCefrLevel = (score: number): string => {
    if (score >= 71) return 'C2';
    if (score >= 61) return 'C1';
    if (score >= 51) return 'B2';
    if (score >= 41) return 'B1';
    if (score >= 31) return 'A2';
    return 'A1';
};

export const getCefrLevelInfo = (score: number): CefrLevelInfo => {
    const level = getCefrLevel(score);
    return { level, ...CEFR_LEVELS[level] };
};

// === Grading Functions ===

export interface GradeResult {
    score: number;
    correct: number;
    total: number;
}

export const gradeReading = (
    readingData: ReadingData | null,
    readingAnswers: Record<string, string>
): GradeResult => {
    if (!readingData) return { score: 0, correct: 0, total: 0 };
    let correct = 0, total = 0;

    if (Array.isArray(readingData.part1)) {
        for (const q of readingData.part1) {
            total++;
            if (readingAnswers[q.id] === q.correctAnswer) correct++;
        }
    }
    if (readingData.part2?.questions) {
        for (const q of readingData.part2.questions) {
            total++;
            if (readingAnswers[q.id] === q.correctAnswer) correct++;
        }
    }
    if (readingData.part3?.questions) {
        for (const q of readingData.part3.questions) {
            total++;
            if (readingAnswers[q.id] === q.correctAnswer) correct++;
        }
    }

    return {
        score: total > 0 ? Math.round((correct / total) * 100) : 0,
        correct,
        total,
    };
};

export const gradeListening = (
    listeningData: ListeningData | null,
    listeningAnswers: Record<string, string>
): GradeResult => {
    if (!listeningData) return { score: 0, correct: 0, total: 0 };
    let correct = 0, total = 0;

    for (const clip of listeningData) {
        if (!clip.questions) continue;
        for (const q of clip.questions) {
            total++;
            if (listeningAnswers[q.id] === q.correctAnswer) correct++;
        }
    }

    return {
        score: total > 0 ? Math.round((correct / total) * 100) : 0,
        correct,
        total,
    };
};

// === Results Type ===

export interface CefrTestResults {
    readingScore: number;
    listeningScore: number | null;
    writingScore: number;
    speakingScore: number | null;
    overallScore: number;
    cefrLevel: string;
    isPartial: boolean;
    feedback: {
        reading: string;
        listening: string;
        writing: string;
        speaking: string;
    };
}

import { create } from 'zustand';

import { CanonicalQuestionV1 } from '../types';

type QuizStatus = 'idle' | 'generating' | 'playing' | 'answered' | 'finished';

interface QuizStore {
    topic: string;
    status: QuizStatus;
    queue: CanonicalQuestionV1[];
    index: number;
    answers: Record<number, number>;
    score: number;
    marked: number[];

    setTopic: (topic: string) => void;
    setStatus: (status: QuizStatus) => void;
    startQuiz: (questions: CanonicalQuestionV1[]) => void;
    answer: (optionIndex: number) => void;
    next: () => void;
    prev: () => void;
    jump: (index: number) => void;
    toggleMark: () => void;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
    topic: '',
    status: 'idle',
    queue: [],
    index: 0,
    answers: {},
    score: 0,
    marked: [],

    setTopic: (topic) => set({ topic }),
    setStatus: (status) => set({ status }),

    startQuiz: (questions) => {
        if (!questions || questions.length === 0) {
            console.error('[QuizStore] startQuiz called with empty queue');
            return;
        }
        set({ queue: questions, index: 0, answers: {}, score: 0, marked: [], status: 'playing' });
    },

    answer: (optionIndex) => {
        const { queue, index, answers } = get();
        const currentQ = queue[index];
        if (!currentQ) return;
        if (answers[index] !== undefined) return;
        const choiceText = currentQ.choices[optionIndex];
        const isCorrect = currentQ.correct_response.includes(choiceText);
        set(prev => ({
            answers: { ...prev.answers, [index]: optionIndex },
            score: isCorrect ? prev.score + 1 : prev.score,
            status: 'answered'
        }));
    },

    next: () => {
        const { index, queue, answers } = get();
        if (index < queue.length - 1) {
            const nextIdx = index + 1;
            set({
                index: nextIdx,
                status: answers[nextIdx] !== undefined ? 'answered' : 'playing'
            });
        } else {
            set({ status: 'finished' });
        }
    },

    prev: () => {
        const { index, answers } = get();
        if (index > 0) {
            const prevIdx = index - 1;
            set({
                index: prevIdx,
                status: answers[prevIdx] !== undefined ? 'answered' : 'playing'
            });
        }
    },

    jump: (targetIndex) => {
        const { answers } = get();
        set({
            index: targetIndex,
            status: answers[targetIndex] !== undefined ? 'answered' : 'playing'
        });
    },

    toggleMark: () => {
        const { index, marked } = get();
        set({
            marked: marked.includes(index)
                ? marked.filter(i => i !== index)
                : [...marked, index]
        });
    },
}));

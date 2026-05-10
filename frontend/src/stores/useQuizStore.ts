import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CanonicalQuestionV1 } from '../types';
import { isCorrectOption } from '../utils/quizCorrectness';

type QuizStatus = 'idle' | 'generating' | 'playing' | 'answered' | 'finished';

interface QuizStore {
    topic: string;
    status: QuizStatus;
    queue: CanonicalQuestionV1[];
    index: number;
    answers: Record<number, number>;
    draftAnswers: Record<number, number>;
    score: number;
    marked: number[];
    sessionId: string | null;

    setTopic: (topic: string) => void;
    setStatus: (status: QuizStatus) => void;
    startQuiz: (questions: CanonicalQuestionV1[]) => void;
    answer: (optionIndex: number) => void;
    next: () => void;
    prev: () => void;
    jump: (index: number) => void;
    toggleMark: () => void;
    resetQuiz: () => void;
}

const makeSessionId = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `quiz_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const commitDraftAnswer = (set: any, get: () => QuizStore): boolean => {
    const { queue, index, answers, draftAnswers } = get();
    const currentQ = queue[index];
    const draft = draftAnswers[index];

    if (!currentQ || answers[index] !== undefined || draft === undefined) {
        return false;
    }

    const isCorrect = isCorrectOption(currentQ, draft);
    set((prev: QuizStore) => {
        const nextDraftAnswers = { ...prev.draftAnswers };
        delete nextDraftAnswers[index];

        return {
            answers: { ...prev.answers, [index]: draft },
            draftAnswers: nextDraftAnswers,
            score: isCorrect ? prev.score + 1 : prev.score,
            status: 'answered'
        };
    });

    return true;
};

export const useQuizStore = create<QuizStore>()(
    persist(
        (set, get) => ({
            topic: '',
            status: 'idle',
            queue: [],
            index: 0,
            answers: {},
            draftAnswers: {},
            score: 0,
            marked: [],
            sessionId: null,

            setTopic: (topic) => set({ topic }),
            setStatus: (status) => set({ status }),

            startQuiz: (questions) => {
                if (!questions || questions.length === 0) {
                    console.error('[QuizStore] startQuiz called with empty queue');
                    return;
                }

                set({
                    queue: questions,
                    index: 0,
                    answers: {},
                    draftAnswers: {},
                    score: 0,
                    marked: [],
                    status: 'playing',
                    sessionId: makeSessionId()
                });
            },

            answer: (optionIndex) => {
                const { queue, index, answers } = get();
                const currentQ = queue[index];
                if (!currentQ) return;
                if (answers[index] !== undefined) return;

                set((prev) => ({
                    draftAnswers: { ...prev.draftAnswers, [index]: optionIndex },
                    status: 'playing'
                }));
            },

            next: () => {
                const { index, queue, answers } = get();
                if (queue.length === 0) return;

                // First tap after choosing an option submits and reveals feedback.
                if (answers[index] === undefined) {
                    commitDraftAnswer(set, get);
                    return;
                }

                if (index < queue.length - 1) {
                    const nextIdx = index + 1;
                    set({
                        index: nextIdx,
                        status: answers[nextIdx] !== undefined ? 'answered' : 'playing'
                    });
                } else {
                    set({ status: 'finished', draftAnswers: {} });
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
                const { queue, answers } = get();
                if (targetIndex < 0 || targetIndex >= queue.length) return;

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

            resetQuiz: () => {
                set({
                    topic: '',
                    status: 'idle',
                    queue: [],
                    index: 0,
                    answers: {},
                    draftAnswers: {},
                    score: 0,
                    marked: [],
                    sessionId: null
                });
            },
        }),
        {
            name: 'toefl_quiz_session_v2',
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                topic: state.topic,
                status: state.status,
                queue: state.queue,
                index: state.index,
                answers: state.answers,
                draftAnswers: state.draftAnswers,
                score: state.score,
                marked: state.marked,
                sessionId: state.sessionId,
            }),
        }
    )
);

import { useState } from 'react';

import { CanonicalQuestionV1 } from '../types';

export const usePhase0Quiz = () => {
    const [queue, setQueue] = useState<CanonicalQuestionV1[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({}); // Map index -> choiceIndex
    const [score, setScore] = useState(0);
    const [status, setStatus] = useState<'idle' | 'generating' | 'playing' | 'answered' | 'finished'>('idle');
    const [marked, setMarked] = useState<number[]>([]); // RESTORED: Mark for Review

    const startQuiz = (questions: CanonicalQuestionV1[]) => {
        if (!questions || questions.length === 0) {
            console.error("StartQuiz called with empty queue");
            return;
        }
        setQueue(questions);
        setIndex(0);
        setAnswers({});
        setScore(0);
        setMarked([]);
        setStatus('playing');
    };

    const answer = (optionIndex: number) => {
        const currentQ = queue[index];
        const choiceText = currentQ.choices[optionIndex];
        const isCorrect = currentQ.correct_response.includes(choiceText);

        setAnswers(prev => ({ ...prev, [index]: optionIndex }));
        if (isCorrect) setScore(prev => prev + 1);
        setStatus('answered');
    };

    const next = () => {
        if (index < queue.length - 1) {
            setIndex(prev => prev + 1);
            // Check if next question is already answered to set status
            if (answers[index + 1] !== undefined) {
                setStatus('answered');
            } else {
                setStatus('playing');
            }
        } else {
            setStatus('finished');
        }
    };

    const prev = () => {
        if (index > 0) {
            setIndex(prev => prev - 1);
            // Always 'answered' or 'playing' state preservation isn't strictly needed if we derive it from answers map,
            // but for the card prop `isAnswered`:
            if (answers[index - 1] !== undefined) {
                setStatus('answered');
            } else {
                setStatus('playing');
            }
        }
    };

    const jump = (targetIndex: number) => {
        if (targetIndex >= 0 && targetIndex < queue.length) {
            setIndex(targetIndex);
            if (answers[targetIndex] !== undefined) {
                setStatus('answered');
            } else {
                setStatus('playing');
            }
        }
    };

    const toggleMark = () => {
        setMarked(prev => {
            if (prev.includes(index)) return prev.filter(i => i !== index);
            return [...prev, index];
        });
    };

    return {
        queue,
        index,
        currentData: queue[index],
        answers,
        score,
        status,
        setStatus,
        startQuiz,
        answer,
        next,
        prev,
        jump,
        marked,
        toggleMark
    };
};


import { useState, useCallback, useEffect } from 'react';

import { QuizData, QuizState } from '../types';
import { isCorrectOption } from '../utils/quizCorrectness';

const STORAGE_KEY = 'streamquiz_current_session_v1';

interface UseQuizReturn {
  quizState: QuizState;

  // Actions
  initializeQuiz: (initialData: QuizData | QuizData[], topic?: string) => void;
  startGenerating: () => void;
  setError: (msg: string) => void;

  // Navigation
  answerQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  jumpToQuestion: (index: number) => void;

  // Tools
  toggleMark: () => void;
  resetQuiz: () => void;

  // Resume Logic
  hasSavedSession: boolean;
  resumeSession: () => string | null; // Returns the topic if successful
}

export const useQuiz = (): UseQuizReturn => {
  // Initialize state
  const [quizState, setQuizState] = useState<QuizState>({
    status: 'idle',
    currentData: null,
    selectedOptionIndex: null,
    score: 0,
    queue: [],
    queueIndex: 0,
    answers: {}, // Record<number, number>
    marked: []
  });

  const [hasSavedSession, setHasSavedSession] = useState(false);

  // Check for saved session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as QuizState;
        // Only consider it a valid session if it's playing/answered and has data
        if ((parsed.status === 'playing' || parsed.status === 'answered') && parsed.queue.length > 0) {
          setHasSavedSession(true);
        }
      }
    } catch (e) {
      console.error("Failed to check saved session", e);
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (quizState.status === 'playing' || quizState.status === 'answered') {
      const { queue, ...lightweightState } = quizState;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightState));
      setHasSavedSession(true);
    } else if (quizState.status === 'idle') {
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedSession(false);
    }
  }, [quizState]);

  const initializeQuiz = useCallback((initialData: QuizData | QuizData[], topic: string = 'General Practice') => {
    const queue = Array.isArray(initialData) ? initialData : [initialData];
    setQuizState({
      status: 'playing',
      currentData: queue[0],
      selectedOptionIndex: null,
      score: 0,
      queue: queue,
      queueIndex: 0,
      answers: {},
      marked: [],
      topic: topic
    });
  }, []);

  const resumeSession = useCallback((): string | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as QuizState;
        setQuizState({
          ...parsed,
          queue: parsed.queue || [] // queue was excluded to save space
        });
        return parsed.topic || null;
      }
    } catch (e) {
      console.error("Failed to resume", e);
    }
    return null;
  }, []);

  const startGenerating = useCallback(() => {
    setQuizState(prev => ({ ...prev, status: 'generating', error: undefined }));
  }, []);

  const setError = useCallback((msg: string) => {
    setQuizState(prev => ({ ...prev, status: 'error', error: msg }));
  }, []);

  const answerQuestion = useCallback((choiceIndex: number) => {
    setQuizState(prev => {
      if (!prev.currentData) return prev;

      const idx = prev.queueIndex;
      const newAnswers = { ...prev.answers, [idx]: choiceIndex };

      const isCorrect = isCorrectOption(prev.currentData, choiceIndex);

      const previousIndex = prev.answers[idx];
      const previouslyCorrect = previousIndex !== undefined
        ? isCorrectOption(prev.currentData, previousIndex)
        : false;

      // Simple scoring: Add 1 if correct and wasn't previously correct
      // This logic assumes we don't decrement if they change from correct to incorrect, which is a simplification
      // Better logic: Recalculate score from scratch based on answers
      let newScore = prev.score;
      if (isCorrect && !previouslyCorrect) newScore += 1;
      if (!isCorrect && previouslyCorrect) newScore -= 1;

      return {
        ...prev,
        status: 'answered',
        selectedOptionIndex: choiceIndex,
        answers: newAnswers,
        score: newScore
      };
    });
  }, []);

  const jumpToQuestion = useCallback((index: number) => {
    setQuizState(prev => {
      if (index < 0 || index >= prev.queue.length) return prev;

      const targetQuestion = prev.queue[index];
      const savedAnswer = prev.answers[index]; // number | undefined

      return {
        ...prev,
        queueIndex: index,
        currentData: targetQuestion,
        selectedOptionIndex: savedAnswer ?? null,
        status: savedAnswer !== undefined ? 'answered' : 'playing'
      };
    });
  }, []);

  const nextQuestion = useCallback(() => {
    setQuizState(prev => {
      const nextIdx = prev.queueIndex + 1;
      // If we have more in queue, jump
      if (nextIdx < prev.queue.length) {
        const targetQuestion = prev.queue[nextIdx];
        const savedAnswer = prev.answers[nextIdx];
        return {
          ...prev,
          queueIndex: nextIdx,
          currentData: targetQuestion,
          selectedOptionIndex: savedAnswer ?? null,
          status: savedAnswer !== undefined ? 'answered' : 'playing'
        };
      }
      return prev;
    });
  }, []);

  const prevQuestion = useCallback(() => {
    setQuizState(prev => {
      const prevIdx = prev.queueIndex - 1;
      if (prevIdx >= 0) {
        const targetQuestion = prev.queue[prevIdx];
        const savedAnswer = prev.answers[prevIdx];
        return {
          ...prev,
          queueIndex: prevIdx,
          currentData: targetQuestion,
          selectedOptionIndex: savedAnswer ?? null,
          status: savedAnswer !== undefined ? 'answered' : 'playing'
        };
      }
      return prev;
    });
  }, []);

  const toggleMark = useCallback(() => {
    setQuizState(prev => {
      const idx = prev.queueIndex;
      const isMarked = prev.marked.includes(idx);
      const newMarked = isMarked
        ? prev.marked.filter(i => i !== idx)
        : [...prev.marked, idx];

      return { ...prev, marked: newMarked };
    });
  }, []);

  const resetQuiz = useCallback(() => {
    setQuizState({
      status: 'idle',
      currentData: null,
      selectedOptionIndex: null,
      score: 0,
      queue: [],
      queueIndex: 0,
      answers: {},
      marked: []
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    quizState,
    initializeQuiz,
    startGenerating,
    setError,
    answerQuestion,
    nextQuestion,
    prevQuestion,
    jumpToQuestion,
    toggleMark,
    resetQuiz,
    hasSavedSession,
    resumeSession
  };
};

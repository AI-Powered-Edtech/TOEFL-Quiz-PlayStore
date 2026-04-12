import { useRef, useCallback } from 'react';

import { writingGymProgressService } from '../services/writingGymProgressService';
import { MasonAnalytics, MasonSession, WritingExercise } from '../types';
import { calculateStars } from '../utils/masonUtils';

export const useMasonAnalytics = (userId: string, skillId: string) => {
    const startTimeRef = useRef<number>(Date.now());
    const analyticsRef = useRef<MasonAnalytics>({
        exerciseId: crypto.randomUUID(),
        userId,
        skillId,
        totalTime: 0,
        attempts: 0,
        wrongMoves: []
    });
    const exerciseDataRef = useRef<WritingExercise | null>(null);
    const scoreRef = useRef<number>(0);
    const maxTimeRef = useRef<number>(180000); // Default 3 minutes

    const startTracking = useCallback((exercise: WritingExercise, maxTime: number = 180000) => {
        startTimeRef.current = Date.now();
        maxTimeRef.current = maxTime;
        exerciseDataRef.current = exercise;
        scoreRef.current = 0;
        analyticsRef.current = {
            exerciseId: crypto.randomUUID(),
            userId,
            skillId,
            totalTime: 0,
            attempts: 0,
            wrongMoves: []
        };
    }, [userId, skillId]);

    const recordAttempt = useCallback((success: boolean) => {
        analyticsRef.current.attempts += 1;
    }, []);

    const recordWrongMove = useCallback((index: number, expectedWord: string, placedWord: string) => {
        analyticsRef.current.wrongMoves.push({
            index,
            expectedWord,
            placedWord
        });
    }, []);

    const completeTracking = useCallback(async (levelScore: number) => {
        scoreRef.current = levelScore;
        const endTime = Date.now();
        const totalTime = endTime - startTimeRef.current;
        analyticsRef.current.totalTime = totalTime;

        // Calculate stars
        const stars = calculateStars(
            scoreRef.current,
            totalTime,
            analyticsRef.current.attempts,
            maxTimeRef.current
        );

        // Save to database using the latest accurate userId from context
        try {
            await writingGymProgressService.saveSession({
                userId: userId, // Fix race condition: always use latest userId
                level: 'mason',
                skillId: analyticsRef.current.skillId,
                score: scoreRef.current,
                totalTime,
                attempts: analyticsRef.current.attempts,
                wrongMoves: analyticsRef.current.wrongMoves.length, // Send count
                starsEarned: stars,
                exerciseData: exerciseDataRef.current
            });

            await writingGymProgressService.updateProgress(
                userId,
                'mason',
                skillId,
                scoreRef.current,
                totalTime,
                stars
            );
            console.log('[Analytics] Session saved successfully');
        } catch (error) {
            console.error('[Analytics] Failed to save session:', error);
        }

        return { ...analyticsRef.current, stars };
    }, [userId, skillId]);

    return {
        startTracking,
        recordAttempt,
        recordWrongMove,
        completeTracking
    };
};

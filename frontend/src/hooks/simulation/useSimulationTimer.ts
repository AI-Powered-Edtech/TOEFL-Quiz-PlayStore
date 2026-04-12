/**
 * useSimulationTimer — Per-section timer for Full Simulation
 * 
 * Similar to CEFR's useTestTimer but designed for the multi-section
 * simulation flow. Supports start/stop/reset per section.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface SimulationTimerReturn {
    /** Current seconds remaining */
    timeLeft: number;
    /** Whether timer is actively counting down */
    isRunning: boolean;
    /** Start a new countdown with given seconds */
    startTimer: (seconds: number) => void;
    /** Stop the timer (preserves current timeLeft) */
    stopTimer: () => void;
    /** Reset timer to 0 and stop */
    resetTimer: () => void;
    /** Format seconds as MM:SS */
    formatTime: (seconds: number) => string;
    /** How many seconds have elapsed since timer started */
    elapsed: number;
}

export const useSimulationTimer = (onTimeUp?: () => void): SimulationTimerReturn => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const totalSecondsRef = useRef<number>(0);
    const onTimeUpRef = useRef(onTimeUp);

    // Keep callback ref fresh
    useEffect(() => {
        onTimeUpRef.current = onTimeUp;
    }, [onTimeUp]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const startTimer = useCallback((seconds: number) => {
        // Clear any existing timer
        if (intervalRef.current) clearInterval(intervalRef.current);

        totalSecondsRef.current = seconds;
        startTimeRef.current = Date.now();
        setTimeLeft(seconds);
        setIsRunning(true);

        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setIsRunning(false);
                    // Call onTimeUp on next tick to avoid state updates during render
                    setTimeout(() => onTimeUpRef.current?.(), 0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const stopTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsRunning(false);
    }, []);

    const resetTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setTimeLeft(0);
        setIsRunning(false);
        startTimeRef.current = 0;
        totalSecondsRef.current = 0;
    }, []);

    const formatTime = useCallback((seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, []);

    const elapsed = totalSecondsRef.current - timeLeft;

    return {
        timeLeft,
        isRunning,
        startTimer,
        stopTimer,
        resetTimer,
        formatTime,
        elapsed,
    };
};

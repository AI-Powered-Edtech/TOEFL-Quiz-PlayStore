import { useState, useEffect, useCallback, useRef } from 'react';

interface WebWorkerTimerOptions {
    onTimeUp?: (timerId: string) => void;
    autoCleanup?: boolean;
}

interface WebWorkerTimerState {
    timeLeft: number;
    isRunning: boolean;
    timerId: string;
}

interface UseWebWorkerTimerReturn {
    timeLeft: number;
    isRunning: boolean;
    startTimer: (seconds: number, timerId?: string) => void;
    stopTimer: (timerId?: string) => void;
    resetTimer: (timerId?: string) => void;
    formatTime: (seconds: number) => string;
    elapsed: number;
    getActiveTimers: () => string[];
}

const useWebWorkerTimer = (options?: WebWorkerTimerOptions): UseWebWorkerTimerReturn => {
    const { onTimeUp, autoCleanup = true } = options || {};
    const workerRef = useRef<Worker | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [timerId, setTimerId] = useState('');
    const startTimeRef = useRef<number>(0);
    const totalDurationRef = useRef<number>(0);
    const activeTimersRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        workerRef.current = new Worker('/timer-worker.js');

        workerRef.current.onmessage = (event: MessageEvent) => {
            const { type, timerId: id, remaining } = event.data;

            switch (type) {
                case 'ready':
                    console.log('[TimerWorker] Ready');
                    break;
                case 'started':
                    setIsRunning(true);
                    setTimerId(id);
                    activeTimersRef.current.add(id);
                    break;
                case 'tick':
                    setTimeLeft(remaining);
                    break;
                case 'stopped':
                    setTimeLeft(remaining);
                    setIsRunning(false);
                    break;
                case 'timeUp':
                    setTimeLeft(0);
                    setIsRunning(false);
                    onTimeUp?.(id);
                    activeTimersRef.current.delete(id);
                    break;
                case 'reset':
                    setTimeLeft(0);
                    setIsRunning(false);
                    activeTimersRef.current.delete(id);
                    break;
            }
        };

        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, [onTimeUp]);

    const startTimer = useCallback((seconds: number, timerId?: string) => {
        const id = timerId || `timer_${Date.now()}`;
        startTimeRef.current = Date.now();
        totalDurationRef.current = seconds;
        
        workerRef.current?.postMessage({
            action: 'start',
            duration: seconds,
            timerId: id,
        });
    }, []);

    const stopTimer = useCallback((timerId?: string) => {
        workerRef.current?.postMessage({
            action: 'stop',
            timerId,
        });
    }, []);

    const resetTimer = useCallback((timerId?: string) => {
        workerRef.current?.postMessage({
            action: 'reset',
            timerId,
        });
        if (autoCleanup) {
            setTimeLeft(0);
            startTimeRef.current = 0;
            totalDurationRef.current = 0;
        }
    }, [autoCleanup]);

    const formatTime = useCallback((seconds: number): string => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, []);

    const elapsed = totalDurationRef.current > 0 && startTimeRef.current > 0
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;

    const getActiveTimers = useCallback(() => {
        return Array.from(activeTimersRef.current);
    }, []);

    return {
        timeLeft,
        isRunning,
        startTimer,
        stopTimer,
        resetTimer,
        formatTime,
        elapsed,
        getActiveTimers,
    };
};

export const createSectionTimer = (
    useTimer: UseWebWorkerTimerReturn,
    sectionName: string
) => {
    return {
        ...useTimer,
        startSection: (duration: number) => useTimer.startTimer(duration, `section_${sectionName}`),
        stopSection: () => useTimer.stopTimer(`section_${sectionName}`),
        getSectionTimeLeft: () => useTimer.timeLeft,
    };
};

export default useWebWorkerTimer;
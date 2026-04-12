import { useState, useRef, useCallback } from 'react';

export const useTestTimer = (onTimeUp: () => void) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<number | null>(null);

    const startTimer = useCallback((seconds: number) => {
        setTimeLeft(seconds);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    onTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [onTimeUp]);

    const stopTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    const formatTime = useCallback((seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }, []);

    return { timeLeft, startTimer, stopTimer, formatTime };
};

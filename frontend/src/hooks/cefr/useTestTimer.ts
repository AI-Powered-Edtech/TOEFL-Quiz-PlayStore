import { useState, useRef, useCallback, useEffect } from 'react';

const TIMER_END_KEY = 'cefr_timer_end_ts';

/**
 * Timestamp-based timer that survives page refreshes.
 * Instead of counting down from a value, it stores the absolute
 * end timestamp in localStorage. On resume, it calculates remaining
 * time based on Date.now(), so background tab throttling doesn't
 * prevent the timer from running out correctly.
 */
export const useTestTimer = (onTimeUp: () => void) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<number | null>(null);
    const onTimeUpRef = useRef(onTimeUp);

    // Keep onTimeUp ref current without restarting the timer
    useEffect(() => {
        onTimeUpRef.current = onTimeUp;
    }, [onTimeUp]);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const tick = useCallback(() => {
        const endTs = Number(localStorage.getItem(TIMER_END_KEY) || 0);
        if (!endTs) return;
        const remaining = Math.max(0, Math.round((endTs - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
            clearTimer();
            localStorage.removeItem(TIMER_END_KEY);
            onTimeUpRef.current();
        }
    }, [clearTimer]);

    const startTimer = useCallback((seconds: number) => {
        clearTimer();
        const endTs = Date.now() + seconds * 1000;
        localStorage.setItem(TIMER_END_KEY, String(endTs));
        setTimeLeft(seconds);
        timerRef.current = window.setInterval(tick, 1000);
    }, [clearTimer, tick]);

    const stopTimer = useCallback(() => {
        clearTimer();
        localStorage.removeItem(TIMER_END_KEY);
    }, [clearTimer]);

    // On mount, resume a timer that was running before a refresh
    useEffect(() => {
        const endTs = Number(localStorage.getItem(TIMER_END_KEY) || 0);
        if (endTs && endTs > Date.now()) {
            const remaining = Math.round((endTs - Date.now()) / 1000);
            setTimeLeft(remaining);
            timerRef.current = window.setInterval(tick, 1000);
        }
        return () => {
            clearTimer();
        };
    }, [tick, clearTimer]);

    const formatTime = useCallback((seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }, []);

    return { timeLeft, startTimer, stopTimer, formatTime };
};

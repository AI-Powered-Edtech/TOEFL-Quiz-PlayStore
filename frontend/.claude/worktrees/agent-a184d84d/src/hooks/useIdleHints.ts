import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to track user idle time and provide progressive hints
 * Level 0: No hint
 * Level 1: Glow next correct word (10s)
 * Level 2: Show translation (15s)
 * Level 3: Lock/Auto-place correct word (20s)
 */
export const useIdleHints = (
    isGameActive: boolean,
    interactionSignal: any // Change this signal to reset timer
) => {
    const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setHintLevel(0);

        if (isGameActive) {
            // Level 1: 10 seconds
            timerRef.current = setTimeout(() => {
                setHintLevel(1);

                // Level 2: 15 seconds (total)
                timerRef.current = setTimeout(() => {
                    setHintLevel(2);

                    // Level 3: 20 seconds (total)
                    timerRef.current = setTimeout(() => {
                        setHintLevel(3);
                    }, 5000); // +5s from Level 2

                }, 5000); // +5s from Level 1

            }, 10000); // 10s start
        }
    }, [isGameActive]);

    // Reset timer on any interaction
    useEffect(() => {
        resetTimer();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [interactionSignal, isGameActive, resetTimer]);

    return hintLevel;
};

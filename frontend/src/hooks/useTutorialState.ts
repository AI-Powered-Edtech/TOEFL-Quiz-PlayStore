import { useState, useEffect, useCallback } from 'react';

export const useTutorialState = (key: string, userId?: string | null) => {
    const localKey = `tutorial_completed_${key}_${userId || 'guest'}`;

    const [hasCompleted, setHasCompleted] = useState<boolean>(() => {
        return localStorage.getItem(localKey) === 'true';
    });

    useEffect(() => {
        if (hasCompleted || !userId) return;
    }, [userId, key]);

    const markCompleted = useCallback(async () => {
        localStorage.setItem(localKey, 'true');
        setHasCompleted(true);

    }, [userId, key, localKey]);

    const reset = useCallback(() => {
        localStorage.removeItem(localKey);
        setHasCompleted(false);
    }, [localKey]);

    return { hasCompleted, markCompleted, reset };
};

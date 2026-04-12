import { useState, useEffect, useCallback } from 'react';

import { supabase } from '../services/supabase';

/**
 * Global tutorial state hook.
 * Checks localStorage first (fast path), then syncs to Supabase for logged-in users.
 *
 * Usage:
 *   const { hasCompleted, markCompleted } = useTutorialState('peer_review', userId);
 */
export const useTutorialState = (key: string, userId?: string | null) => {
    const localKey = `tutorial_completed_${key}_${userId || 'guest'}`;

    const [hasCompleted, setHasCompleted] = useState<boolean>(() => {
        return localStorage.getItem(localKey) === 'true';
    });

    // On mount, if not locally completed and user is logged in, check Supabase
    useEffect(() => {
        if (hasCompleted || !userId) return;

        const checkRemote = async () => {
            try {
                const { data } = await supabase
                    .from('user_tutorial_state')
                    .select('completed')
                    .eq('user_id', userId)
                    .eq('tutorial_key', key)
                    .single();

                if (data?.completed) {
                    // Sync remote completion to local so future visits skip the check
                    localStorage.setItem(localKey, 'true');
                    setHasCompleted(true);
                }
            } catch {
                // Table may not exist or user may be offline — fall back gracefully
            }
        };

        checkRemote();
    }, [userId, key]);

    const markCompleted = useCallback(async () => {
        localStorage.setItem(localKey, 'true');
        setHasCompleted(true);

        if (!userId) return;

        try {
            await supabase
                .from('user_tutorial_state')
                .upsert(
                    { user_id: userId, tutorial_key: key, completed: true, completed_at: new Date().toISOString() },
                    { onConflict: 'user_id,tutorial_key' }
                );
        } catch {
            // Offline or table doesn't exist — localStorage is the source of truth
        }
    }, [userId, key, localKey]);

    const reset = useCallback(() => {
        localStorage.removeItem(localKey);
        setHasCompleted(false);
    }, [localKey]);

    return { hasCompleted, markCompleted, reset };
};

// Hook for batch audio pre-loading
// Use this in quiz components to pre-load all listening audio at once

import { useEffect, useState } from 'react';

import { preloadMultiple, getCacheStats, isAudioCached } from '../services/audioCacheService';
import { checkEdgeTTSReady } from '../services/ttsService';
import { CanonicalQuestionV1 } from '../types';

interface UseAudioPreloadOptions {
    questions: CanonicalQuestionV1[];
    enabled?: boolean;
}

interface AudioPreloadState {
    isPreloading: boolean;
    progress: number;
    total: number;
    isComplete: boolean;
    error: string | null;
}

/**
 * Hook to pre-load all listening audio when a quiz starts
 * Automatically processes all questions in background
 */
export const useAudioPreload = ({ questions, enabled = true }: UseAudioPreloadOptions): AudioPreloadState => {
    const [state, setState] = useState<AudioPreloadState>({
        isPreloading: false,
        progress: 0,
        total: 0,
        isComplete: false,
        error: null
    });

    useEffect(() => {
        if (!enabled || !questions || questions.length === 0) return;

        const preloadAll = async () => {
            // Check TTS service first
            const isHealthy = await checkEdgeTTSReady();
            if (!isHealthy) {
                setState(s => ({ ...s, error: 'TTS service not available' }));
                return;
            }

            // Extract transcripts from listening questions
            const transcripts = questions
                .filter(q => q.section === 'listening' && q.stimulus?.text)
                .map(q => q.stimulus!.text);

            if (transcripts.length === 0) {
                setState(s => ({ ...s, isComplete: true }));
                return;
            }

            setState(s => ({ ...s, isPreloading: true, total: transcripts.length }));

            try {
                await preloadMultiple(transcripts);

                setState(s => ({
                    ...s,
                    isPreloading: false,
                    progress: transcripts.length,
                    isComplete: true
                }));
            } catch (err) {
                setState(s => ({
                    ...s,
                    isPreloading: false,
                    error: err instanceof Error ? err.message : 'Pre-loading failed'
                }));
            }
        };

        preloadAll();
    }, [questions, enabled]);

    // Update progress periodically
    useEffect(() => {
        if (!state.isPreloading) return;

        const interval = setInterval(() => {
            const stats = getCacheStats();
            setState(s => ({ ...s, progress: stats.size }));
        }, 500);

        return () => clearInterval(interval);
    }, [state.isPreloading]);

    return state;
};

/**
 * Check if a specific question's audio is cached
 */
export const useIsAudioCached = (transcript: string | undefined): boolean => {
    const [cached, setCached] = useState(false);

    useEffect(() => {
        if (!transcript) {
            setCached(false);
            return;
        }

        // Check immediately
        setCached(isAudioCached(transcript));

        // Check periodically while preloading
        const interval = setInterval(() => {
            setCached(isAudioCached(transcript));
        }, 500);

        return () => clearInterval(interval);
    }, [transcript]);

    return cached;
};

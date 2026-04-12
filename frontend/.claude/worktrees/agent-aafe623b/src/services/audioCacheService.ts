// Audio Cache Service - Pre-generates audio in background
// Caches audio URLs for transcripts to avoid wait times when navigating questions

import { generateAudio } from './ttsService';

interface CacheEntry {
    url: string;
    timestamp: number;
}

// In-memory cache for audio URLs
const audioCache = new Map<string, CacheEntry>();

// Queue for background generation
const preloadQueue: string[] = [];
let isProcessing = false;

// Cache expiry time (10 minutes)
const CACHE_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Get cache key for a transcript (hash for shorter keys)
 */
const getCacheKey = (transcript: string): string => {
    // FNV-1a inspired hash for transcript
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < transcript.length; i++) {
        hash ^= transcript.charCodeAt(i);
        hash = (hash * 0x01000193) | 0; // FNV prime, coerce to int32
    }
    return `audio_${Math.abs(hash).toString(36)}`;
};

/**
 * Check if audio is already cached
 */
export const isAudioCached = (transcript: string): boolean => {
    const key = getCacheKey(transcript);
    const entry = audioCache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
        audioCache.delete(key);
        return false;
    }
    return true;
};

/**
 * Get cached audio URL
 */
export const getCachedAudio = (transcript: string): string | null => {
    const key = getCacheKey(transcript);
    const entry = audioCache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
        audioCache.delete(key);
        return null;
    }

    return entry.url;
};

/**
 * Set cached audio URL from external source (e.g., database)
 * This allows pre-populating the cache with audio from Supabase Storage
 */
export const setCachedAudio = (transcript: string, url: string): void => {
    const key = getCacheKey(transcript);
    audioCache.set(key, {
        url,
        timestamp: Date.now()
    });
    console.log('🎵 Set cached audio from database');
};

// In-flight generation tracking — prevents duplicate requests for same transcript
const inFlightGenerations = new Map<string, Promise<string>>();

/**
 * Generate and cache audio for a transcript
 * If questionId is provided, also upload to Supabase Storage
 * Returns existing promise if generation already in-flight (deduplication)
 */
export const generateAndCacheAudio = async (
    transcript: string,
    questionId?: string
): Promise<string> => {
    // Check cache first
    const cached = getCachedAudio(transcript);
    if (cached) {
        console.log('🎵 Using cached audio');
        return cached;
    }

    // Check if already in-flight — return existing promise (DEDUP)
    const key = getCacheKey(transcript);
    const existing = inFlightGenerations.get(key);
    if (existing) {
        console.log('🎵 Audio already generating — reusing in-flight promise');
        return existing;
    }

    // Create new generation promise and track it
    const generationPromise = (async () => {
        try {
            console.log('🎵 Generating new audio...');
            const audioId = await generateAudio(transcript);

            // Cache it
            audioCache.set(key, {
                url: audioId,
                timestamp: Date.now()
            });

            // Upload to Supabase Storage if questionId provided
            if (questionId) {
                uploadAudioInBackground(audioId, questionId).catch(err => {
                    console.warn('⚠️ Background upload failed:', err);
                });
            }

            return audioId;
        } finally {
            // Always clean up in-flight tracking
            inFlightGenerations.delete(key);
        }
    })();

    inFlightGenerations.set(key, generationPromise);
    return generationPromise;
};

/**
 * Upload audio to Supabase Storage in background
 * Handles both single-voice and dialogue audio
 */
const uploadAudioInBackground = async (
    audioId: string,
    questionId: string
): Promise<void> => {
    try {
        const { uploadAudioToStorage, updateQuestionAudioUrl } = await import('./audioStorageService');
        const { getAudioElement: getTTSAudioElement } = await import('./ttsService');

        // Get the audio element
        const audio = getTTSAudioElement(audioId);
        if (!audio) {
            console.log('⚠️ Audio element not found for upload');
            return;
        }

        // Check if audio has a valid src that can be converted to blob
        if (!audio.src || audio.src === '') {
            console.log('⚠️ Audio has no src - likely dialogue audio, skipping upload');
            return;
        }

        // Only upload if src is a blob or data URL (not empty)
        if (!audio.src.startsWith('blob:') && !audio.src.startsWith('data:')) {
            console.log('⚠️ Audio src is not uploadable:', audio.src.substring(0, 50));
            return;
        }

        console.log('📤 Uploading to Supabase Storage...');
        const storageUrl = await uploadAudioToStorage(questionId, audio);
        await updateQuestionAudioUrl(questionId, storageUrl);
        console.log('✅ Audio saved to Question Bank');
    } catch (error) {
        console.warn('⚠️ Failed to upload audio:', error);
        // Don't throw - this is a background operation
    }
};


/**
 * Add transcript to preload queue (background generation)
 */
export const preloadAudio = (transcript: string): void => {
    if (!transcript || isAudioCached(transcript)) return;

    // Also skip if already in-flight
    const key = getCacheKey(transcript);
    if (inFlightGenerations.has(key)) return;

    // Add to queue if not already there
    if (!preloadQueue.includes(transcript) && !audioCache.has(key)) {
        preloadQueue.push(transcript);
        console.log(`📥 Added to preload queue (${preloadQueue.length} items)`);
        processQueue();
    }
};

/**
 * Preload audio for multiple transcripts at once (batch processing)
 * Processes all items in parallel for faster loading
 */
export const preloadMultiple = async (transcripts: string[]): Promise<void> => {
    const uncached = transcripts.filter(t => t && !isAudioCached(t));

    if (uncached.length === 0) {
        console.log('✅ All audio already cached');
        return;
    }

    console.log(`📥 Batch pre-loading ${uncached.length} audio files...`);

    // Process sequentially — WASM worker is single-threaded, no benefit from concurrency
    const batchSize = 1;
    for (let i = 0; i < uncached.length; i += batchSize) {
        const batch = uncached.slice(i, i + batchSize);
        await Promise.all(
            batch.map(async (transcript) => {
                try {
                    await generateAndCacheAudio(transcript);
                    console.log(`✅ Pre-cached audio ${i + batch.indexOf(transcript) + 1}/${uncached.length}`);
                } catch (err) {
                    console.warn('⚠️ Failed to pre-cache:', err);
                }
            })
        );
    }

    console.log(`🎉 Batch pre-loading complete!`);
};

/**
 * Process the preload queue in background
 */
const processQueue = async (): Promise<void> => {
    if (isProcessing || preloadQueue.length === 0) return;

    isProcessing = true;

    while (preloadQueue.length > 0) {
        const transcript = preloadQueue.shift();
        if (!transcript) continue;

        // Skip if already cached
        if (isAudioCached(transcript)) continue;

        try {
            console.log(`🔄 Pre-generating audio in background...`);
            await generateAndCacheAudio(transcript);
            console.log(`✅ Audio pre-cached successfully`);
        } catch (err) {
            console.warn('⚠️ Background audio generation failed:', err);
        }

        // Small delay to avoid overwhelming the TTS service
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    isProcessing = false;
};

/**
 * Clear all cached audio
 */
export const clearAudioCache = (): void => {
    audioCache.forEach(entry => {
        URL.revokeObjectURL(entry.url);
    });
    audioCache.clear();
    console.log('🗑️ Audio cache cleared');
};

/**
 * Get cache stats for debugging
 */
export const getCacheStats = (): { size: number; queueLength: number } => {
    return {
        size: audioCache.size,
        queueLength: preloadQueue.length
    };
};

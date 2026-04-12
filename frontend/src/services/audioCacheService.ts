// Audio Cache Service - Pre-generates audio in background
// Caches audio URLs for transcripts to avoid wait times when navigating questions

import { getFromIDB, putInIDB, getIDBCacheSize } from './audioIndexedDBCache';
import { trackTTSMetric } from './ttsMetrics';
import { generateAudio, StreamingKittenPlayer } from './ttsService';
import { MobileMockPlayer } from './sherpaNativeService';

interface CacheEntry {
    url?: string;
    player?: StreamingKittenPlayer | MobileMockPlayer;
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
export const getCachedAudio = (transcript: string): string | StreamingKittenPlayer | MobileMockPlayer | null => {
    const key = getCacheKey(transcript);
    const entry = audioCache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
        audioCache.delete(key);
        return null;
    }

    return entry.player || entry.url || null;
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
const inFlightGenerations = new Map<string, Promise<string | StreamingKittenPlayer | MobileMockPlayer>>();

/**
 * Generate and cache audio for a transcript
 * If questionId is provided, also upload to Supabase Storage
 * Returns existing promise if generation already in-flight (deduplication)
 */
export const generateAndCacheAudio = async (
    transcript: string,
    questionId?: string,
    streamingPlayer?: StreamingKittenPlayer | MobileMockPlayer
): Promise<string | StreamingKittenPlayer | MobileMockPlayer> => {
    // Check cache first
    const cached = getCachedAudio(transcript);
    if (cached) {
        trackTTSMetric({ event: 'cache_hit', textLength: transcript.length });
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

    trackTTSMetric({ event: 'cache_miss', textLength: transcript.length });

    // L2: Check IndexedDB persistent cache
    const idbBlob = await getFromIDB(transcript).catch(() => null);
    if (idbBlob) {
        const url = URL.createObjectURL(idbBlob);
        audioCache.set(key, { url, timestamp: Date.now() });
        trackTTSMetric({ event: 'cache_hit', textLength: transcript.length, meta: { source: 'indexeddb' } });
        console.log('🎵 Restored from IndexedDB cache');
        return url;
    }

    // Create new generation promise and track it
    const generationPromise = (async () => {
        try {
            console.log('🎵 Generating new audio...');

            if (streamingPlayer) {
                // ** STREAMING / NATIVE MODE **
                audioCache.set(key, { player: streamingPlayer, timestamp: Date.now() });

                // Fire and forget play() - the player handles the promise internally
                // We don't await play() here because we want to return the player immediately
                // to the UI so it can start listening to events.

                // Hack: MobileMockPlayer accepts a string, StreamingKittenPlayer accepts an array or string (handled internally)
                streamingPlayer.play(transcript as any).then(async () => {
                    // Once finished, extract WAV for persistent caching (only happens for Kitten Web WebAudio)
                    if ('getCombinedWavUrl' in streamingPlayer) {
                        const wavUrl = await streamingPlayer.getCombinedWavUrl();
                        if (wavUrl) {
                            audioCache.set(key, { url: wavUrl, player: streamingPlayer, timestamp: Date.now() });
                            persistToIDBUrl(wavUrl, transcript);
                            if (questionId) uploadAudioInBackgroundUrl(wavUrl, questionId);
                        }
                    }
                }).catch(console.error);

                return streamingPlayer;
            } else {
                // ** LEGACY BATCH MODE ** (For background preloading)
                const audioId = await generateAudio(transcript);

                // Cache it in memory
                audioCache.set(key, {
                    url: audioId,
                    timestamp: Date.now()
                });

                // Persist to IndexedDB in background
                persistToIDB(audioId, transcript).catch(err => {
                    console.warn('⚠️ IDB persist failed:', err);
                });

                // Upload to Supabase Storage if questionId provided
                if (questionId) {
                    uploadAudioInBackground(audioId, questionId).catch(err => {
                        console.warn('⚠️ Background upload failed:', err);
                    });
                }

                return audioId;
            }
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
        const { getAudioUrl } = await import('./ttsService');

        const blobUrl = getAudioUrl(audioId);
        if (!blobUrl) {
            console.log('⚠️ Audio URL not found for upload');
            return;
        }

        // Only upload blob URLs
        if (!blobUrl.startsWith('blob:')) {
            console.log('⚠️ Audio URL is not uploadable:', blobUrl.substring(0, 50));
            return;
        }

        // Create a temporary Audio element for the upload function
        const audio = new Audio(blobUrl);
        audio.preload = 'auto';

        console.log('📤 Uploading to Supabase Storage...');
        const storageUrl = await uploadAudioToStorage(questionId, audio);
        await updateQuestionAudioUrl(questionId, storageUrl);
        console.log('✅ Audio saved to Question Bank');
    } catch (error) {
        console.warn('⚠️ Failed to upload audio:', error);
    }
};

const uploadAudioInBackgroundUrl = async (
    blobUrl: string,
    questionId: string
): Promise<void> => {
    try {
        const { uploadAudioToStorage, updateQuestionAudioUrl } = await import('./audioStorageService');

        if (!blobUrl || !blobUrl.startsWith('blob:')) return;

        const audio = new Audio(blobUrl);
        audio.preload = 'auto';

        console.log('📤 Uploading streamed audio to Supabase Storage...');
        const storageUrl = await uploadAudioToStorage(questionId, audio);
        await updateQuestionAudioUrl(questionId, storageUrl);
        console.log('✅ Streamed audio saved to Question Bank');
    } catch (error) {
        console.warn('⚠️ Failed to upload streamed audio:', error);
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

    // Process sequentially — Backend TTS handles tasks one by one typically
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
 * Process the preload queue using requestIdleCallback.
 * Pauses when tab is hidden, resumes when visible.
 * First 2 items are processed immediately (priority), rest deferred to idle.
 */
let isPaused = false;
let pendingIdleId: number | null = null;

// Polyfill requestIdleCallback for Safari/older browsers
const rIC = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb: (deadline: { timeRemaining: () => number }) => void) =>
        window.setTimeout(() => cb({ timeRemaining: () => 16 }), 50) as unknown as number;

const cancelRIC = typeof cancelIdleCallback === 'function'
    ? cancelIdleCallback
    : (id: number) => clearTimeout(id);

// Visibility listener: pause preloading when tab hidden
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isPaused = true;
            if (pendingIdleId !== null) {
                cancelRIC(pendingIdleId);
                pendingIdleId = null;
            }
            console.log('[AudioCache] ⏸ Preload paused (tab hidden)');
        } else {
            isPaused = false;
            console.log('[AudioCache] ▶️ Preload resumed (tab visible)');
            processQueue(); // resume
        }
    });
}

const processQueue = async (): Promise<void> => {
    if (isProcessing || preloadQueue.length === 0 || isPaused) return;

    isProcessing = true;

    // Priority: process first 2 items immediately (likely next question)
    const priorityCount = Math.min(2, preloadQueue.length);
    for (let i = 0; i < priorityCount; i++) {
        const transcript = preloadQueue.shift();
        if (!transcript || isAudioCached(transcript)) continue;

        try {
            await generateAndCacheAudio(transcript);
            console.log(`✅ Priority pre-cached (${i + 1}/${priorityCount})`);
        } catch (err) {
            console.warn('⚠️ Priority preload failed:', err);
        }
    }

    // Remaining items: defer to idle callback
    processIdleItem();
};

function processIdleItem(): void {
    if (preloadQueue.length === 0 || isPaused) {
        isProcessing = false;
        return;
    }

    pendingIdleId = rIC(async (deadline) => {
        pendingIdleId = null;

        // Process items while we have idle time (at least 5ms remaining)
        while (preloadQueue.length > 0 && deadline.timeRemaining() > 5 && !isPaused) {
            const transcript = preloadQueue.shift();
            if (!transcript || isAudioCached(transcript)) continue;

            try {
                await generateAndCacheAudio(transcript);
                console.log(`✅ Idle pre-cached (${preloadQueue.length} remaining)`);
            } catch (err) {
                console.warn('⚠️ Idle preload failed:', err);
            }

            // Only process one TTS generation per idle frame (they're long-running)
            break;
        }

        // Schedule next idle item if queue not empty
        if (preloadQueue.length > 0 && !isPaused) {
            processIdleItem();
        } else {
            isProcessing = false;
        }
    }) as number;
}

/**
 * Clear all cached audio
 */
export const clearAudioCache = (): void => {
    audioCache.forEach(entry => {
        if (entry.url) {
            URL.revokeObjectURL(entry.url);
        }
    });
    audioCache.clear();
    console.log('🗑️ Audio cache cleared');
};

/**
 * Get cache stats for debugging
 */
export const getCacheStats = async (): Promise<{ size: number; queueLength: number; idbSize: number }> => {
    const idbSize = await getIDBCacheSize().catch(() => 0);
    return {
        size: audioCache.size,
        queueLength: preloadQueue.length,
        idbSize,
    };
};

// ─── Internal: persist audio blob to IndexedDB ──────────────────────────────

/**
 * Fetch the blob from a generated audio URL and store in IndexedDB.
 */
async function persistToIDB(audioId: string, transcript: string): Promise<void> {
    try {
        const { getAudioUrl } = await import('./ttsService');
        const blobUrl = getAudioUrl(audioId);
        if (!blobUrl || !blobUrl.startsWith('blob:')) return;

        const resp = await fetch(blobUrl);
        const blob = await resp.blob();
        if (blob.size > 0) {
            await putInIDB(transcript, blob);
        }
    } catch {
        // Silent — IDB persistence is best-effort
    }
}

async function persistToIDBUrl(blobUrl: string, transcript: string): Promise<void> {
    try {
        if (!blobUrl || !blobUrl.startsWith('blob:')) return;

        const resp = await fetch(blobUrl);
        const blob = await resp.blob();
        if (blob.size > 0) {
            await putInIDB(transcript, blob);
        }
    } catch {
        // Silent — IDB persistence is best-effort
    }
}

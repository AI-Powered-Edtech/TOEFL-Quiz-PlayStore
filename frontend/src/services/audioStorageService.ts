// Audio Storage Service - Local storage fallback
// Supabase storage has been removed, using localStorage for audio caching

const AUDIO_CACHE_KEY = 'audio_cache_';
const AUDIO_INDEX_KEY = 'audio_index';

/**
 * Store audio in localStorage as base64
 */
export const uploadAudioToStorage = async (
    questionId: string,
    audio: HTMLAudioElement | Blob
): Promise<string> => {
    try {
        let blob: Blob;

        if (audio instanceof Blob) {
            blob = audio;
        } else {
            blob = await fetchAudioBlob(audio.src);
        }

        const base64 = await blobToBase64(blob);
        const cacheKey = `${AUDIO_CACHE_KEY}${questionId}`;

        localStorage.setItem(cacheKey, base64);
        updateAudioIndex(questionId);

        console.log(`[AudioStorage] Audio cached for question: ${questionId}`);
        return `local://${questionId}`;
    } catch (error) {
        console.error('[AudioStorage] Upload failed:', error);
        throw error;
    }
};

async function fetchAudioBlob(src: string): Promise<Blob> {
    if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
        const response = await fetch(src);
        return response.blob();
    }
    throw new Error('Unsupported audio source');
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function base64ToBlob(base64: string): Blob {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/mpeg';
    const data = atob(parts[1]);
    const array = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        array[i] = data.charCodeAt(i);
    }
    return new Blob([array], { type: mime });
}

/**
 * Get cached audio URL from localStorage
 */
export const getStoredAudioUrl = async (questionId: string): Promise<string | null> => {
    const cacheKey = `${AUDIO_CACHE_KEY}${questionId}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        const blob = base64ToBlob(cached);
        return URL.createObjectURL(blob);
    }

    return null;
};

/**
 * Check if audio exists in cache
 */
export const hasStoredAudio = async (questionId: string): Promise<boolean> => {
    const cacheKey = `${AUDIO_CACHE_KEY}${questionId}`;
    return localStorage.getItem(cacheKey) !== null;
};

/**
 * Update question audio URL (local metadata)
 */
export const updateQuestionAudioUrl = async (
    questionId: string,
    audioUrl: string
): Promise<void> => {
    console.log('[AudioStorage] Updating audio URL metadata:', { questionId, audioUrl });
};

/**
 * Clear all cached audio
 */
export const clearAudioCache = (): void => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(AUDIO_CACHE_KEY));
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem(AUDIO_INDEX_KEY);
};

function updateAudioIndex(questionId: string): void {
    const index = getAudioIndex();
    if (!index.includes(questionId)) {
        index.push(questionId);
        localStorage.setItem(AUDIO_INDEX_KEY, JSON.stringify(index));
    }
}

function getAudioIndex(): string[] {
    try {
        return JSON.parse(localStorage.getItem(AUDIO_INDEX_KEY) || '[]');
    } catch {
        return [];
    }
}

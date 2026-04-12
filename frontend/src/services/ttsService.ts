/**
 * TTS Service — Central Router
 *
 * On Web: Uses Kitten TTS (Python FastAPI backend) via HTTP.
 * On Native (Capacitor): Uses Sherpa-ONNX Piper (on-device, client-side).
 */

import { Capacitor } from '@capacitor/core';

import { trackTTSMetric } from './ttsMetrics';

// ─── Platform Detection ──────────────────────────────────────────────────────

const isNative = () => Capacitor.isNativePlatform();

// ─── Dialogue Parsing ────────────────────────────────────────────────────────

interface DialogueSegment {
    speaker: string;
    text: string;
}

// Multiple patterns to match different AI output formats
// Pattern 1: [M]text[/M] or [W]text[/W] (proper closing tags)
const PATTERN_CLOSED = /\[(M|W)\](.*?)\[\/\1\]/gs;
// Pattern 2: [M]text or [W]text (no closing tags, ends at next tag or end)
const PATTERN_UNCLOSED = /\[(M|W)\]([^\[]+)/g;
// Pattern 3: M: "text" or W: "text" (colon format with quotes)
const PATTERN_COLON = /(?:^|\n)\s*(M|W|Man|Woman)\s*:\s*["']?([^"'\n\[]+)["']?/gi;

const normalizeSpeaker = (speaker: string): string => {
    const s = speaker.toUpperCase().trim();
    if (s === 'M' || s === 'MAN' || s === 'MALE') return 'M';
    if (s === 'W' || s === 'WOMAN' || s === 'FEMALE') return 'W';
    return 'M';
};

export const parseDialogue = (transcript: string): DialogueSegment[] => {
    const segments: DialogueSegment[] = [];

    // Try Pattern 1: Proper closed tags [M]...[/M]
    PATTERN_CLOSED.lastIndex = 0;
    let match;
    while ((match = PATTERN_CLOSED.exec(transcript)) !== null) {
        const text = match[2].trim();
        if (text.length > 0) {
            segments.push({ speaker: match[1].toUpperCase(), text });
        }
    }

    if (segments.length > 0) return segments;

    // Try Pattern 2: Unclosed tags [M]text[W]text
    PATTERN_UNCLOSED.lastIndex = 0;
    while ((match = PATTERN_UNCLOSED.exec(transcript)) !== null) {
        const text = match[2].trim();
        if (text.length > 0) {
            segments.push({ speaker: match[1].toUpperCase(), text });
        }
    }

    if (segments.length > 0) return segments;

    // Try Pattern 3: Colon format M: "text"
    PATTERN_COLON.lastIndex = 0;
    while ((match = PATTERN_COLON.exec(transcript)) !== null) {
        const text = match[2].trim();
        if (text.length > 0) {
            segments.push({ speaker: normalizeSpeaker(match[1]), text });
        }
    }

    return segments;
};

export const isDialogue = (transcript: string): boolean => {
    PATTERN_CLOSED.lastIndex = 0;
    PATTERN_UNCLOSED.lastIndex = 0;
    PATTERN_COLON.lastIndex = 0;

    return PATTERN_CLOSED.test(transcript) ||
        PATTERN_UNCLOSED.test(transcript) ||
        PATTERN_COLON.test(transcript);
};

// ─── Kitten TTS Voice Mapping ──────────────────────────────────────────

interface VoiceInfo {
    name: string;
    speakerId: number;
    gender: 'male' | 'female';
}

const KITTEN_VOICES: VoiceInfo[] = [
    { name: 'Bella', speakerId: 0, gender: 'female' },
    { name: 'Jasper', speakerId: 1, gender: 'male' },
    { name: 'Luna', speakerId: 2, gender: 'female' },
    { name: 'Bruno', speakerId: 3, gender: 'male' },
    { name: 'Rosie', speakerId: 4, gender: 'female' },
    { name: 'Hugo', speakerId: 5, gender: 'male' },
    { name: 'Kiki', speakerId: 6, gender: 'female' },
    { name: 'Leo', speakerId: 7, gender: 'male' },
];

const MALE_VOICES = KITTEN_VOICES.filter(v => v.gender === 'male');
const FEMALE_VOICES = KITTEN_VOICES.filter(v => v.gender === 'female');

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getDialogueVoicePair(): { male: VoiceInfo; female: VoiceInfo } {
    return {
        male: pickRandom(MALE_VOICES),
        female: pickRandom(FEMALE_VOICES),
    };
}

function getRandomVoice(): VoiceInfo {
    return pickRandom(KITTEN_VOICES);
}

// ─── Audio URL Cache (module-scoped) ─────────────────────────────────────────
const MAX_CACHE_SIZE = 50;
const audioUrlCache = new Map<string, string>(); // audioId → blob URL string

function storeAudioUrl(blobUrl: string): string {
    const audioId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // LRU eviction: remove oldest if over limit
    if (audioUrlCache.size >= MAX_CACHE_SIZE) {
        const oldest = audioUrlCache.keys().next().value;
        if (oldest) {
            const oldUrl = audioUrlCache.get(oldest);
            if (oldUrl?.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
            audioUrlCache.delete(oldest);
        }
    }

    audioUrlCache.set(audioId, blobUrl);
    return audioId;
}

/**
 * Get the audio source URL for a given audioId.
 * Returns the blob URL string, or null if not found.
 */
export const getAudioUrl = (audioId: string): string | null => {
    return audioUrlCache.get(audioId) || null;
};

/** @deprecated Use getAudioUrl instead */
export const getAudioElement = (audioId: string): HTMLAudioElement | null => {
    const url = audioUrlCache.get(audioId);
    if (!url) return null;
    const audio = new Audio(url);
    audio.preload = 'auto';
    return audio;
};

// ─── Native TTS (Sherpa-ONNX Piper) ─────────────────────────────────────────

/**
 * Generate audio using native Sherpa-ONNX Piper engine.
 * On native, audio plays directly through device speakers.
 * Returns a dummy audioId for API compatibility.
 */
const generateWithNative = async (transcript: string): Promise<string> => {
    const { SherpaNativeTts } = await import('./sherpaNativeService');

    const t0 = performance.now();

    if (isDialogue(transcript)) {
        const segments = parseDialogue(transcript);
        for (const segment of segments) {
            const speakerId = segment.speaker === 'M' ? 1 : 0;
            await SherpaNativeTts.speak({ text: segment.text, speakerId, speed: 1.0 });
        }
    } else {
        // Use streaming mode — splits into sentences natively for faster first-audio
        await SherpaNativeTts.speakStreaming({ text: transcript, speakerId: 0, speed: 1.0 });
    }

    const durationMs = Math.round(performance.now() - t0);
    trackTTSMetric({ event: 'generate', provider: 'sherpa-native', durationMs, textLength: transcript.length });
    console.log(`[TTS] 🔊 Native Piper generated in ${durationMs}ms`);

    // Return a dummy audioId — audio already played natively
    return `native-${Date.now()}`;
};

// ─── Kitten TTS Core ─────────────────────────────────────────────────────────

const generateWithKitten = async (transcript: string): Promise<string> => {
    const { kittenSynthesize, kittenSynthesizeDialogue } = await import('./kittenTtsService');

    const t0 = performance.now();

    let audio: HTMLAudioElement;

    if (isDialogue(transcript)) {
        const pair = getDialogueVoicePair();
        console.log(`[TTS] 🎭 Dialogue voices: ${pair.male.name} (M) + ${pair.female.name} (W)`);

        const segments = parseDialogue(transcript).map(s => ({
            text: s.text,
            speakerId: s.speaker === 'M' ? pair.male.speakerId : pair.female.speakerId,
            speed: 1.0,
        }));
        audio = await kittenSynthesizeDialogue(segments);
    } else {
        const voice = getRandomVoice();
        console.log(`[TTS] 🎤 Voice: ${voice.name} (${voice.gender})`);
        audio = await kittenSynthesize(transcript, 1.0, voice.speakerId);
    }

    // Audio element from kittenTtsService always has a blob: src
    const blobUrl = audio.src;
    if (!blobUrl) {
        throw new Error('Kitten TTS produced audio with no src');
    }

    const audioId = storeAudioUrl(blobUrl);
    const durationMs = Math.round(performance.now() - t0);
    trackTTSMetric({ event: 'generate', provider: 'kitten', durationMs, textLength: transcript.length });
    console.log(`[TTS] 🐱 Generated in ${durationMs}ms`);

    return audioId;
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate audio for a transcript.
 * - Native (Capacitor): Uses Sherpa-ONNX Piper (on-device). Audio plays directly.
 * - Web: Uses Kitten TTS (HTTP). Returns audioId for getAudioUrl().
 */
export const generateAudio = async (transcript: string): Promise<string> => {
    if (isNative()) {
        return generateWithNative(transcript);
    }
    return generateWithKitten(transcript);
};

/**
 * Pre-initialize TTS engine.
 * No-op on native (Sherpa-ONNX initializes lazily on first speak).
 */
export const warmupKittenTts = async (): Promise<void> => {
    if (isNative()) {
        console.log('[TTS] Native Piper — no warmup needed');
        return;
    }
    console.log('[TTS] Backend Python TTS is ready');
    return;
};

export const checkEdgeTTSReady = async (): Promise<boolean> => {
    return true;
};

/**
 * Get the current active TTS provider name
 */
export const getActiveTTSProvider = async (): Promise<string> => {
    if (isNative()) return 'sherpa-native';
    return 'kitten';
};

// Keep for backward compat but not used anymore
export class SubscriptionRequiredError extends Error {
    constructor(feature: string = 'Audio features') {
        super(`${feature} require a Basic or C2 subscription`);
        this.name = 'SubscriptionRequiredError';
    }
}

// ─── Re-exports for Streaming Audio API ──────────────────────────────────────
// On native, MobileMockPlayer wraps Sherpa-ONNX; on web, StreamingKittenPlayer uses HTTP.
export { StreamingKittenPlayer, type StreamingPlayerCallbacks } from './kittenTtsService';
export { MobileMockPlayer } from './sherpaNativeService';

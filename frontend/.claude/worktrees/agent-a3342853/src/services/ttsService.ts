/**
 * TTS Service — Kitten TTS (Priority 1) → Google Translate TTS (Fallback)
 *
 * Priority 1: Kitten TTS — on-device neural voice via Sherpa-ONNX WASM (~35MB)
 * Priority 2: Google Translate TTS — free online fallback
 */

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

    console.log('📝 Parsing transcript:', transcript.substring(0, 100) + '...');

    // Try Pattern 1: Proper closed tags [M]...[/M]
    PATTERN_CLOSED.lastIndex = 0;
    let match;
    while ((match = PATTERN_CLOSED.exec(transcript)) !== null) {
        const text = match[2].trim();
        if (text.length > 0) {
            segments.push({ speaker: match[1].toUpperCase(), text });
        }
    }

    if (segments.length > 0) {
        console.log(`✅ Found ${segments.length} segments (closed tags)`);
        return segments;
    }

    // Try Pattern 2: Unclosed tags [M]text[W]text
    PATTERN_UNCLOSED.lastIndex = 0;
    while ((match = PATTERN_UNCLOSED.exec(transcript)) !== null) {
        const text = match[2].trim();
        if (text.length > 0) {
            segments.push({ speaker: match[1].toUpperCase(), text });
        }
    }

    if (segments.length > 0) {
        console.log(`✅ Found ${segments.length} segments (unclosed tags)`);
        return segments;
    }

    // Try Pattern 3: Colon format M: "text"
    PATTERN_COLON.lastIndex = 0;
    while ((match = PATTERN_COLON.exec(transcript)) !== null) {
        const text = match[2].trim();
        if (text.length > 0) {
            segments.push({ speaker: normalizeSpeaker(match[1]), text });
        }
    }

    if (segments.length > 0) {
        console.log(`✅ Found ${segments.length} segments (colon format)`);
        return segments;
    }

    console.log('⚠️ No dialogue patterns found');
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

// ─── Google Translate TTS Fallback ───────────────────────────────────────────

/**
 * Split text into chunks ≤ maxLen characters, breaking at word boundaries.
 */
export const splitTextForGoogleTTS = (text: string, maxLen = 200): string[] => {
    const chunks: string[] = [];
    let remaining = text.trim();

    while (remaining.length > 0) {
        if (remaining.length <= maxLen) {
            chunks.push(remaining);
            break;
        }

        // Find the last space within the limit
        let splitAt = remaining.lastIndexOf(' ', maxLen);
        if (splitAt <= 0) splitAt = maxLen; // No space found — hard split

        chunks.push(remaining.substring(0, splitAt).trim());
        remaining = remaining.substring(splitAt).trim();
    }

    return chunks.filter(c => c.length > 0);
};

/**
 * Generate audio using the unofficial Google Translate TTS endpoint.
 * FREE fallback. Limitations: max ~200 chars per request, lower quality voice.
 */
const generateGoogleTranslateTTS = async (text: string): Promise<HTMLAudioElement> => {
    const chunks = splitTextForGoogleTTS(text, 200);

    if (chunks.length === 1) {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(chunks[0])}`;
        const audio = new Audio(url);
        return audio;
    }

    // Multiple chunks — create wrapper for sequential playback
    const audioElements = chunks.map(chunk => {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(chunk)}`;
        return new Audio(url);
    });

    const wrapper = new Audio();
    let currentIndex = 0;
    let isPlaying = false;

    wrapper.play = function () {
        if (isPlaying) return Promise.resolve();
        isPlaying = true;
        currentIndex = 0;

        return new Promise((resolve, reject) => {
            const playNext = () => {
                if (currentIndex < audioElements.length) {
                    const audio = audioElements[currentIndex];
                    audio.onended = () => { currentIndex++; setTimeout(playNext, 100); };
                    audio.onerror = reject;
                    audio.play().catch(reject);
                } else {
                    isPlaying = false;
                    wrapper.dispatchEvent(new Event('ended'));
                    resolve();
                }
            };
            playNext();
        });
    };

    wrapper.pause = function () {
        if (currentIndex < audioElements.length) audioElements[currentIndex].pause();
        isPlaying = false;
    };

    return wrapper;
};

// ─── Main TTS API ────────────────────────────────────────────────────────

// Custom error for subscription-required features
export class SubscriptionRequiredError extends Error {
    constructor(feature: string = 'Audio features') {
        super(`${feature} require a Basic or C2 subscription`);
        this.name = 'SubscriptionRequiredError';
    }
}

// ─── Audio Element Cache (module-scoped, replaces window.__audioCache) ───
const MAX_CACHE_SIZE = 10;
const audioElementCache = new Map<string, HTMLAudioElement>();

function storeAudioElement(audio: HTMLAudioElement): string {
    const audioId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // LRU eviction: remove oldest if over limit
    if (audioElementCache.size >= MAX_CACHE_SIZE) {
        const oldest = audioElementCache.keys().next().value;
        if (oldest) {
            const el = audioElementCache.get(oldest);
            if (el?.src?.startsWith('blob:')) URL.revokeObjectURL(el.src);
            audioElementCache.delete(oldest);
        }
    }

    audioElementCache.set(audioId, audio);
    return audioId;
}

// ─── Groq TTS (Orpheus cloud voice via Edge Function) ────────────────────────

const GROQ_TTS_PROXY_URL = 'https://ektbokvayttfiqbdcoat.supabase.co/functions/v1/groq-tts-proxy';

const generateGroqTTS = async (transcript: string): Promise<HTMLAudioElement> => {
    const plainText = isDialogue(transcript)
        ? parseDialogue(transcript).map(s => s.text).join(' ')
        : transcript;

    // Get auth token if available
    let authToken = '';
    try {
        const { supabase } = await import('./supabase');
        const { data } = await supabase.auth.getSession();
        authToken = data?.session?.access_token || '';
    } catch { /* proceed without auth */ }

    const response = await fetch(GROQ_TTS_PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
            input: plainText.substring(0, 1200),
            voice: 'tara',
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Groq TTS failed: ${(errorData as any).error || response.statusText}`);
    }

    const audioBlob = await response.blob();
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio();
    audio.src = url;
    audio.preload = 'auto';
    audio.addEventListener('ended', () => {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, { once: true });
    return audio;
};

export const generateAudio = async (transcript: string): Promise<string> => {
    // ─── Priority 1: Google TTS (instant playback, ~0.5s) ────────────────
    try {
        const plainText = isDialogue(transcript)
            ? parseDialogue(transcript).map(s => s.text).join(' ')
            : transcript;

        const audio = await generateGoogleTranslateTTS(plainText);
        const audioId = storeAudioElement(audio);
        console.log('[TTS] ⚡ Using Google TTS (instant fallback)');

        // Fire-and-forget: upgrade to Kitten TTS in background for next playback
        upgradeToKittenInBackground(transcript).catch(() => { /* silent */ });

        return audioId;
    } catch (googleError) {
        console.warn('[TTS] Google TTS failed, trying Kitten:', (googleError as Error).message);
    }

    // ─── Priority 2: Kitten TTS (on-device, slower but offline) ──────────
    try {
        const { kittenSynthesize, kittenSynthesizeDialogue, isKittenReady, initKittenTts } = await import('./kittenTtsService');

        if (!isKittenReady()) {
            console.log('[TTS] Initializing Kitten TTS (first use)...');
            await initKittenTts();
        }

        let audio: HTMLAudioElement;
        if (isDialogue(transcript)) {
            const segments = parseDialogue(transcript).map((s, i) => ({
                text: s.text,
                speakerId: i % 2 === 0 ? 0 : 1,
                speed: 1.0,
            }));
            audio = await kittenSynthesizeDialogue(segments);
        } else {
            audio = await kittenSynthesize(transcript);
        }

        const audioId = storeAudioElement(audio);
        console.log('[TTS] 🐱 Using Kitten TTS (on-device neural voice)');
        return audioId;
    } catch (kittenError) {
        console.warn('[TTS] Kitten TTS failed, trying Groq TTS:', (kittenError as Error).message);
    }

    // ─── Priority 3: Groq TTS (cloud, high-quality Orpheus voice) ────────
    try {
        const audio = await generateGroqTTS(transcript);
        const audioId = storeAudioElement(audio);
        console.log('[TTS] 🎤 Using Groq TTS (Orpheus cloud voice)');
        return audioId;
    } catch (groqError) {
        console.error('[TTS] All providers failed (Google → Kitten → Groq):', (groqError as Error).message);
        throw new Error('All TTS providers failed');
    }
};

/**
 * Background upgrade: generate Kitten TTS audio and replace cache entry.
 * Runs silently — if it fails, user keeps the Google TTS version.
 */
const upgradeToKittenInBackground = async (transcript: string): Promise<void> => {
    try {
        const { kittenSynthesize, kittenSynthesizeDialogue, isKittenReady, initKittenTts } = await import('./kittenTtsService');

        if (!isKittenReady()) {
            await initKittenTts();
        }

        let audio: HTMLAudioElement;
        if (isDialogue(transcript)) {
            const segments = parseDialogue(transcript).map((s, i) => ({
                text: s.text,
                speakerId: i % 2 === 0 ? 0 : 1,
                speed: 1.0,
            }));
            audio = await kittenSynthesizeDialogue(segments);
        } else {
            audio = await kittenSynthesize(transcript);
        }

        // Store upgraded audio — will be used on next playback
        storeAudioElement(audio);
        console.log('[TTS] 🐱 Background Kitten TTS upgrade complete');
    } catch {
        // Silent failure — user keeps Google TTS version
    }
};

export const getAudioElement = (audioId: string): HTMLAudioElement | null => {
    return audioElementCache.get(audioId) || null;
};

export const checkEdgeTTSReady = async (): Promise<boolean> => {
    // Kitten TTS auto-initializes on first generateAudio() call.
    // Always return true so UI doesn't block — init happens lazily.
    return true;
};

/**
 * Get the current active TTS provider name
 */
export const getActiveTTSProvider = async (): Promise<'kitten' | 'google'> => {
    try {
        const { isKittenReady } = await import('./kittenTtsService');
        if (isKittenReady()) return 'kitten';
    } catch { /* fall through */ }
    return 'google';
};

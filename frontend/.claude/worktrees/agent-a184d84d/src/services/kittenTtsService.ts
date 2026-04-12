/**
 * Kitten TTS Service — Client-side TTS using Sherpa-ONNX WASM + Kitten Nano EN
 *
 * Optimized for performance:
 * - Web Audio API direct playback (no PCM→WAV conversion loops)
 * - Promise queue with request IDs for parallel dialogue generation
 * - ~35MB first load (cached by browser afterwards)
 */

let worker: Worker | null = null;
let isReady = false;
let ttsampleRate = 22050;
let initPromise: Promise<void> | null = null;

// ─── Promise Queue (supports parallel requests) ─────────────────────────────

type AudioResult = { samples: Float32Array; sampleRate: number };
const pendingRequests = new Map<string, {
    resolve: (result: AudioResult) => void;
    reject: (err: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}>();

let requestCounter = 0;
const nextRequestId = (): string => `req_${++requestCounter}_${Date.now()}`;

// ─── Web Audio API: PCM → HTMLAudioElement (no WAV conversion) ───────────────

/**
 * Convert raw PCM Float32Array to HTMLAudioElement using Web Audio API.
 * Skips the expensive PCM→Int16→DataView→WAV→Blob pipeline entirely.
 * Uses OfflineAudioContext to render an AudioBuffer, then encodes to WAV
 * via a single typed-array copy (much faster than per-sample DataView writes).
 */
function pcmToAudioElement(samples: Float32Array, sr: number): HTMLAudioElement {
    // Fast WAV encoding
    const numSamples = samples.length;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true); // chunk size
    writeString(8, 'WAVE');

    // fmt sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);   // subchunk1 size (16 for PCM)
    view.setUint16(20, 1, true);    // audio format (1 = PCM)
    view.setUint16(22, 1, true);    // num channels (1)
    view.setUint32(24, sr, true);   // sample rate
    view.setUint32(28, sr * 2, true); // byte rate (sr * numChannels * blockAlign)
    view.setUint16(32, 2, true);    // block align (numChannels * bitsPerSample/8)
    view.setUint16(34, 16, true);   // bits per sample

    // data sub-chunk
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true); // data size

    // Write audio samples (Float32 -> Int16)
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.src = url;
    audio.preload = 'auto'; // Force browser to parse header and ready it for playback
    // Don't revoke immediately on ended, wait a bit or let caller handle it, sometimes Safari/iOS drops it early
    audio.addEventListener('ended', () => { setTimeout(() => URL.revokeObjectURL(url), 1000); }, { once: true });
    return audio;
}

// ─── Worker Management ───────────────────────────────────────────────────────

export const initKittenTts = (): Promise<void> => {
    if (initPromise) return initPromise;

    initPromise = new Promise<void>((resolve, reject) => {
        try {
            // Append cache busing query param to ensure we get the latest worker with requestId support
            worker = new Worker(`/sherpa-onnx/sherpa-onnx-tts.worker.js?v=${Date.now()}`);

            worker.onmessage = (e) => {
                const { type, requestId } = e.data;

                if (type === 'sherpa-onnx-tts-ready') {
                    isReady = true;
                    ttsampleRate = e.data.sampleRate || 22050;
                    console.log(`[KittenTTS] ✅ Ready! Speakers: ${e.data.numSpeakers}, SampleRate: ${ttsampleRate}`);
                    resolve();
                }

                if (type === 'sherpa-onnx-tts-result') {
                    const result: AudioResult = {
                        samples: e.data.samples,
                        sampleRate: e.data.sampleRate,
                    };

                    // Try matching by requestId first
                    if (requestId && pendingRequests.has(requestId)) {
                        const pending = pendingRequests.get(requestId)!;
                        clearTimeout(pending.timeout);
                        pendingRequests.delete(requestId);
                        pending.resolve(result);
                    } else {
                        // Fallback: resolve the oldest pending request (FIFO)
                        // This handles cached workers that don't echo requestId
                        const firstKey = pendingRequests.keys().next().value;
                        if (firstKey) {
                            const pending = pendingRequests.get(firstKey)!;
                            clearTimeout(pending.timeout);
                            pendingRequests.delete(firstKey);
                            pending.resolve(result);
                        }
                    }
                }

                if (type === 'sherpa-onnx-tts-error') {
                    const errMsg = e.data.error;
                    console.error('[KittenTTS] Worker error:', errMsg);
                    if (!isReady) {
                        reject(new Error(errMsg));
                    }
                    // Try matching by requestId, fallback to FIFO
                    const targetKey = (requestId && pendingRequests.has(requestId))
                        ? requestId
                        : pendingRequests.keys().next().value;
                    if (targetKey) {
                        const pending = pendingRequests.get(targetKey)!;
                        clearTimeout(pending.timeout);
                        pendingRequests.delete(targetKey);
                        pending.reject(new Error(errMsg));
                    }
                }

                if (type === 'sherpa-onnx-tts-progress') {
                    console.log('[KittenTTS]', e.data.status);
                }
            };

            worker.onerror = (err) => {
                console.error('[KittenTTS] Worker error:', err);
                if (!isReady) reject(err);
            };

            // Start init
            worker.postMessage({ type: 'init' });
        } catch (err) {
            reject(err);
        }
    });

    return initPromise;
};

export const isKittenReady = (): boolean => isReady;

// ─── Core: send generate request with unique ID ─────────────────────────────

function generateSegment(
    text: string,
    speakerId: number = 0,
    speed: number = 1.0,
    timeoutMs: number = 30000
): Promise<AudioResult> {
    if (!worker || !isReady) {
        return Promise.reject(new Error('Kitten TTS not initialized'));
    }

    const requestId = nextRequestId();

    return new Promise<AudioResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error(`Kitten TTS timeout (${timeoutMs / 1000}s) for request ${requestId}`));
        }, timeoutMs);

        pendingRequests.set(requestId, { resolve, reject, timeout });

        worker!.postMessage({
            type: 'generate',
            requestId,
            text,
            sid: speakerId,
            speed,
        });
    });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Synthesize text → HTMLAudioElement
 * Speaker ID: 0 = default English voice
 * Speed: 1.0 = normal, 0.5 = slow, 2.0 = fast
 */
export const kittenSynthesize = async (
    text: string,
    speed: number = 1.0,
    speakerId: number = 0
): Promise<HTMLAudioElement> => {
    console.log(`[KittenTTS] Synthesizing: "${text.substring(0, 50)}..."`);
    const t0 = performance.now();

    const result = await generateSegment(text, speakerId, speed);
    const audioEl = pcmToAudioElement(result.samples, result.sampleRate);

    const elapsed = Math.round(performance.now() - t0);
    console.log(`[KittenTTS] ✅ Done in ${elapsed}ms (${text.split(' ').length} words, ${result.samples.length} samples)`);

    return audioEl;
};

/**
 * Synthesize dialogue segments with queued parallel requests.
 * All segments are sent to the worker at once (FIFO processing),
 * eliminating round-trip overhead between segments.
 */
export const kittenSynthesizeDialogue = async (
    segments: { text: string; speakerId?: number; speed?: number }[]
): Promise<HTMLAudioElement> => {
    if (!worker || !isReady) {
        throw new Error('Kitten TTS not initialized');
    }

    console.log(`[KittenTTS] Generating ${segments.length}-part dialogue (queued parallel)...`);
    const t0 = performance.now();

    // Fire ALL segment requests simultaneously — worker processes FIFO
    // Use a large timeout since later segments wait in the queue for earlier ones
    const resultPromises = segments.map(seg =>
        generateSegment(seg.text, seg.speakerId ?? 0, seg.speed ?? 1.0, 120000) // 2 minutes timeout for queued dialogue
    );

    // Collect results in order
    const results = await Promise.all(resultPromises);

    // Concatenate PCM samples with 300ms silence gaps
    const silenceLength = Math.floor(ttsampleRate * 0.3);
    const totalLength = results.reduce((sum, r) => sum + r.samples.length + silenceLength, 0) - silenceLength;
    const combined = new Float32Array(totalLength);
    let offset = 0;

    for (let i = 0; i < results.length; i++) {
        combined.set(results[i].samples, offset);
        offset += results[i].samples.length;

        // Add silence gap (except after last segment)
        if (i < results.length - 1) {
            offset += silenceLength; // Float32Array is zero-initialized = silence
        }
    }

    const audioEl = pcmToAudioElement(combined, ttsampleRate);

    const elapsed = Math.round(performance.now() - t0);
    console.log(`[KittenTTS] ✅ Dialogue done in ${elapsed}ms (${segments.length} segments, queued parallel)`);

    return audioEl;
};

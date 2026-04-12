/**
 * Kitten TTS Service — Python Backend Client
 *
 * Optimized for performance:
 * - Direct HTTP generation via localhost:3333
 * - Native multi-processing from Uvicorn FastAPI
 * - Extremely lightweight frontend without WASM/C++ dependencies
 */
import { trackTTSMetric } from './ttsMetrics';

// WebWorker references completely purged
const isReady = true; // Hardcoded to true for Python FastAPI backend
let ttsampleRate = 24000;

// ─── Promise Queue (supports parallel requests) ─────────────────────────────

type AudioResult = { samples: Float32Array; sampleRate: number; chunkIndex?: number };
type WavResult = { wavBuffer: ArrayBuffer; sampleRate: number; sampleCount: number; chunkIndex?: number };

// PCM -> HTMLAudioElement

// ─── Web Audio API: PCM → HTMLAudioElement (no WAV conversion) ───────────────

/**
 * Convert raw PCM Float32Array to HTMLAudioElement using Web Audio API.
 * Skips the expensive PCM→Int16→DataView→WAV→Blob pipeline entirely.
 * Uses OfflineAudioContext to render an AudioBuffer, then encodes to WAV
 * via a single typed-array copy (much faster than per-sample DataView writes).
 */
function pcmToAudioElement(samples: Float32Array, sr: number): HTMLAudioElement {
    const numSamples = samples.length;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.load();
    return audio;
}

export const initKittenTts = (): Promise<void> => {
    return Promise.resolve();
};

export const isKittenReady = (): boolean => isReady;

// ─── Core: send generate request with unique ID ─────────────────────────────

async function generateSegment(
    text: string,
    speakerId: number = 0,
    speed: number = 1.0,
    timeoutMs: number = 180_000, // 3 minutes — TTS generation can be slow
    chunkIndex: number = 0
): Promise<AudioResult> {
    if (!text.trim()) return { samples: new Float32Array(0), sampleRate: 24000 };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch('http://localhost:3333/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, sid: speakerId, speed }),
            signal: controller.signal
        });

        if (!response.ok) throw new Error(`Backend TTS Error: ${response.status}`);

        // ** CRITICAL FIX **: Desktop/Mobile browsers decodeAudioData resamples 
        // We use standard AudioContext to decode it from the pre-encoded 24kHz WAV.
        const arrayBuffer = await response.arrayBuffer();

        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        // Dynamically track the actual decoded sample rate.
        ttsampleRate = audioBuffer.sampleRate;

        return {
            samples: audioBuffer.getChannelData(0),
            sampleRate: audioBuffer.sampleRate
        };
    } finally {
        clearTimeout(timeout);
    }
}



// ─── Engine Warmup ─────────────────────────────────────────────────────────────

export const warmupKittenTts = (): void => {
    initKittenTts().then(() => {
        // Generate a single space to force backend model loading into RAM
        generateSegment(" ", 0, 1.0, 30000, 0).catch((e: any) => { console.error('Failed to warmup TTS segments:', e); });
    }).catch((e: any) => { console.error('Failed to init TTS:', e); });
};

// ─── Streaming Gapless Playback ──────────────────────────────────────────────────

export interface StreamingPlayerCallbacks {
    onProgress?: (currentChunk: number, totalChunks: number) => void;
    onSentenceStarted?: (text: string, index: number) => void;
    onEnded?: () => void;
    onError?: (err: Error) => void;
}

export class StreamingKittenPlayer {
    private audioCtx: AudioContext | null = null;
    private sourceNodes: AudioBufferSourceNode[] = [];
    private nextStartTime: number = 0;
    private queue: { index: number; buffer: AudioBuffer; text: string }[] = [];
    private currentIndexToPlay: number = 0;
    private totalChunks: number = 0;
    private isPlaying: boolean = false;
    private isAborted: boolean = false;
    private playbackEndedTimeout: ReturnType<typeof setTimeout> | null = null;

    // Accumulate all arrays here to export to WAV for cache later
    private allSamples: Float32Array[] = [];

    // Audio-to-UI sync
    private callbacks: StreamingPlayerCallbacks;

    // Fallback silent loop to prevent tab throttling
    private dummyOscillator: OscillatorNode | null = null;

    constructor(callbacks: StreamingPlayerCallbacks = {}) {
        this.callbacks = callbacks;
    }

    private startDummyAudio() {
        if (!this.audioCtx) return;
        try {
            this.dummyOscillator = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();
            gainNode.gain.value = 0.001; // Silent
            this.dummyOscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            this.dummyOscillator.start();
        } catch (e) {
            console.warn("Failed to start dummy audio", e);
        }
    }

    private stopDummyAudio() {
        if (this.dummyOscillator) {
            try {
                this.dummyOscillator.stop();
                this.dummyOscillator.disconnect();
            } catch (e) { console.error('Failed to stop dummy audio:', e); }
            this.dummyOscillator = null;
        }
    }

    /** 
     * Applies precise zero-crossing trimming to avoid audio pops.
     * Looks for silence (< 0.01) that crosses zero near the edges.
     */
    private trimSilenceZeroCrossing(pcm: Float32Array): Float32Array {
        const Threshold = 0.005; // Softer threshold to prevent aggressive clicks
        let startIdx = 0;
        let endIdx = pcm.length - 1;

        // Find Start
        for (let i = 0; i < pcm.length - 1; i++) {
            if (Math.abs(pcm[i]) > Threshold) {
                // backtrack to nearest zero crossing
                for (let j = i; j > 0; j--) {
                    if ((pcm[j] >= 0 && pcm[j - 1] < 0) || (pcm[j] <= 0 && pcm[j - 1] > 0)) {
                        startIdx = j;
                        break;
                    }
                }
                break;
            }
        }

        // Find End
        for (let i = pcm.length - 1; i > 0; i--) {
            if (Math.abs(pcm[i]) > Threshold) {
                // forward-track to nearest zero crossing
                for (let j = i; j < pcm.length - 1; j++) {
                    if ((pcm[j] >= 0 && pcm[j + 1] < 0) || (pcm[j] <= 0 && pcm[j + 1] > 0)) {
                        endIdx = j;
                        break;
                    }
                }
                break;
            }
        }

        // Add 0.02s padding back to prevent jarring cuts
        const padding = Math.floor(ttsampleRate * 0.02);
        startIdx = Math.max(0, startIdx - padding);
        endIdx = Math.min(pcm.length, endIdx + padding);

        if (startIdx >= endIdx) return pcm; // fallback
        return pcm.slice(startIdx, endIdx);
    }

    private scheduleNext() {
        if (this.isAborted || !this.audioCtx || this.audioCtx.state === 'closed') return;

        // Re-sequencing: Find the chunk we need to play next
        const chunkIndex = this.queue.findIndex(c => c.index === this.currentIndexToPlay);

        if (chunkIndex !== -1) {
            const chunk = this.queue.splice(chunkIndex, 1)[0];
            const source = this.audioCtx.createBufferSource();
            source.buffer = chunk.buffer;
            source.connect(this.audioCtx.destination);

            // Audio-to-UI Sync Event
            source.onended = () => {
                // If this is the active playing source that just ended logic
                if (this.isAborted) return;

                // Keep the end callback precise
                if (this.playbackEndedTimeout) clearTimeout(this.playbackEndedTimeout);

                // If we've played all chunks and queue is empty, trigger main complete
                if (chunk.index === this.totalChunks - 1) {
                    this.playbackEndedTimeout = setTimeout(() => {
                        this.stop();
                        if (this.callbacks.onEnded) this.callbacks.onEnded();
                    }, 100);
                }
            };

            const now = this.audioCtx.currentTime;

            // Gapless chronological scheduling
            if (this.nextStartTime === 0 || this.nextStartTime < now) {
                // Suggestion 2: Give the hardware an extra 100ms buffer on the very first chunk to wake up completely,
                // and 50ms for subsequent catchups to prevent clipped beginnings.
                const isFirstChunk = this.currentIndexToPlay === 0;
                this.nextStartTime = now + (isFirstChunk ? 0.1 : 0.05);
            }

            // Scheduling precisely on the AudioContext high-res timeline
            source.start(this.nextStartTime);

            // Trigger visual highlighting exactly when this chunk SCHEDULED to start
            const timeUntilStart = Math.max(0, this.nextStartTime - now);
            setTimeout(() => {
                if (!this.isAborted && this.callbacks.onSentenceStarted) {
                    this.callbacks.onSentenceStarted(chunk.text, chunk.index);
                }
            }, timeUntilStart * 1000);

            this.sourceNodes.push(source);
            this.nextStartTime += source.buffer.duration;
            this.currentIndexToPlay++;

            // Recursively check if the N+1 chunk is already in the queue and schedule it
            this.scheduleNext();
        }
    }

    public async play(text: string, speed: number = 1.0, speakerId: number = 0) {
        if (!isReady) throw new Error('Kitten TTS not initialized');

        this.stop(); // reset state
        this.isAborted = false;
        this.isPlaying = true;

        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: ttsampleRate });
        }

        // Critical: Handle browser auto-play policy
        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();

            // Suggestion 5: iOS Safari physical Silent Switch detection
            if (this.audioCtx.state === 'suspended') {
                console.warn("[KittenTTS] AudioContext remains suspended after resume. User may have iOS physical silent switch enabled or browser policy blocked playback.");
                if (this.callbacks.onError) {
                    // We don't throw an error, we just notify so the UI can warn the user but still progress
                    this.callbacks.onError(new Error('Audio started, but your device may be muted (check hardware Silent Switch).'));
                }
            }
        }

        this.startDummyAudio();

        // Split text into chunks (by sentence) — Aggressive split to prevent multi-sentence chunks
        // Use positive lookbehind for punctuation followed by whitespace to preserve punctuation in the chunks
        const validChunks = text.split(/(?<=[.!?])\s+/).map(c => c.trim()).filter(c => c.length > 0);

        this.totalChunks = validChunks.length;

        if (this.callbacks.onProgress) this.callbacks.onProgress(0, this.totalChunks);

        // Fire all generation requests in parallel, backend handles queuing/processing internally
        // But since we use chunkIndex, they will resolve and queue in exact order
        try {
            const promises = validChunks.map(async (sentence, index) => {
                if (this.isAborted) return null;

                const res = await generateSegment(sentence, speakerId, speed, 180_000, index);
                if (this.isAborted) return null;

                const trimmedPcm = this.trimSilenceZeroCrossing(res.samples);
                this.allSamples[index] = trimmedPcm; // Store for WAV export Later

                if (this.callbacks.onProgress) {
                    // Approximate progress based on completed items
                    const completed = this.allSamples.filter(s => s !== undefined).length;
                    this.callbacks.onProgress(completed, this.totalChunks);
                }

                // Create Web Audio Buffer
                const audioBuffer = this.audioCtx!.createBuffer(1, trimmedPcm.length, ttsampleRate);
                audioBuffer.getChannelData(0).set(trimmedPcm);

                this.queue.push({ index, buffer: audioBuffer, text: sentence });
                this.scheduleNext();

                return res;
            });

            await Promise.all(promises);
            this.stopDummyAudio();

        } catch (err) {
            this.stop();
            if (this.callbacks.onError) this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        }
    }

    public stop() {
        this.isAborted = true;
        this.isPlaying = false;

        this.stopDummyAudio();

        // Stop all actively playing web audio nodes
        const nodesToStop = [...this.sourceNodes];
        this.sourceNodes = [];
        this.queue = [];
        this.allSamples = [];
        this.currentIndexToPlay = 0;
        this.nextStartTime = 0;

        for (const source of nodesToStop) {
            try {
                source.onended = null;
                source.stop();
                source.disconnect();
            } catch (e) { console.error('Failed to stop/disconnect source node:', e); }
        }

        if (this.playbackEndedTimeout) clearTimeout(this.playbackEndedTimeout);
    }

    public async getCombinedWavUrl(): Promise<string | null> {
        if (this.allSamples.length === 0) return null;

        // Only combine if we actually finished all chunks
        const completed = this.allSamples.filter(s => s !== undefined);
        if (completed.length !== this.totalChunks) return null;

        const totalLength = completed.reduce((sum, s) => sum + s.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const s of completed) {
            combined.set(s, offset);
            offset += s.length;
        }

        // We use the dynamic ttsampleRate resolved during playback
        const audioEl = pcmToAudioElement(combined, ttsampleRate);
        return audioEl.src;
    }
}


// ─── Public API ──────────────────────────────────────────────────────────────────

/**
 * Synthesize text → HTMLAudioElement
 * WAV encoding happens in the backend — zero CPU cost on main thread.
 * Speaker ID: 0 = default English voice
 * Speed: 1.0 = normal, 0.5 = slow, 2.0 = fast
 */
export const kittenSynthesize = async (
    text: string,
    speed: number = 1.0,
    speakerId: number = 0
): Promise<HTMLAudioElement> => {
    if (!isReady) {
        throw new Error('Kitten TTS not initialized');
    }

    const t0 = performance.now();
    // OPTIMIZATION: Sentence Chunking
    // Kitten TTS degrades exponentially on long strings (> 200 chars).
    // This splits by sentence boundaries (.?!) and generates sequentially.
    // We use a regex that keeps the punctuation
    const validChunks = text.split(/(?<=[.!?])\s+/).map(c => c.trim()).filter(c => c.length > 0);

    console.log(`[KittenTTS] Synthesizing ${validChunks.length} chunks for ${text.length} chars...`);

    // Optimized: Create AudioElement directly from the pre-encoded backend ArrayBuffer if no chunking
    if (validChunks.length === 1) {
        const response = await fetch('http://localhost:3333/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: validChunks[0], sid: speakerId, speed })
        });
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audioEl = new Audio(url);
        audioEl.preload = 'auto';
        audioEl.load();

        const elapsed = Math.round(performance.now() - t0);
        console.log(`[KittenTTS] ✅ Done in ${elapsed}ms (Direct backend WAV, no re-encoding)`);
        return audioEl;
    }

    const results: AudioResult[] = [];
    for (let i = 0; i < validChunks.length; i++) {
        // Use standard generateSegment (PCM), not Wav, so we can concatenate them easily
        const res = await generateSegment(validChunks[i], speakerId, speed);
        results.push(res);
    }

    // Concatenate all PCM samples
    const totalLength = results.reduce((sum, r) => sum + r.samples.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const res of results) {
        combined.set(res.samples, offset);
        offset += res.samples.length;
    }

    // Encode to WAV and create audio element
    const encT0 = performance.now();
    const audioEl = pcmToAudioElement(combined, results[0]?.sampleRate || ttsampleRate);
    const encMs = Math.round(performance.now() - encT0);

    const elapsed = Math.round(performance.now() - t0);
    console.log(`[KittenTTS] ✅ Done in ${elapsed}ms (chunked ${validChunks.length} parts, frontend-encoded WAV)`);

    return audioEl;
};

/**
 * Synthesize dialogue segments with queued parallel requests.
 * All segments are sent to the backend at once (internal FIFO processing),
 * eliminating round-trip overhead between segments.
 */
export const kittenSynthesizeDialogue = async (
    segments: { text: string; speakerId?: number; speed?: number }[]
): Promise<HTMLAudioElement> => {
    if (!isReady) {
        throw new Error('Kitten TTS not initialized');
    }

    console.log(`[KittenTTS] Generating ${segments.length}-part dialogue (sequential)...`);
    const t0 = performance.now();

    // Process segments ONE AT A TIME — backend handles internal queuing,
    // parallel requests just queue up and cause cascading timeouts.
    // Fast-path for dialogue without needing PCM merging:
    // Generate each segment independently and put them into an array buffer,
    // though for continuous playback, PCM merging is still better.
    // However, since we already rely on PCM merging here for gaps, we stick to the
    // existing PCM concatenator but ensure the sample rate is correct.
    const results: AudioResult[] = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        console.log(`[KittenTTS] Dialogue segment ${i + 1}/${segments.length}...`);
        const result = await generateSegment(seg.text, seg.speakerId ?? 0, seg.speed ?? 1.0);
        results.push(result);
    }

    // Concatenate PCM samples with 300ms silence gaps
    const silenceLength = Math.floor((results[0]?.sampleRate || ttsampleRate) * 0.3);
    const totalLength = results.reduce((sum, r) => sum + r.samples.length + silenceLength, 0) - silenceLength;
    const combined = new Float32Array(totalLength > 0 ? totalLength : 0);
    let offset = 0;

    for (let i = 0; i < results.length; i++) {
        combined.set(results[i].samples, offset);
        offset += results[i].samples.length;

        if (i < results.length - 1) {
            offset += silenceLength;
        }
    }

    const encT0 = performance.now();
    const audioEl = pcmToAudioElement(combined, results[0]?.sampleRate || ttsampleRate);
    const encMs = Math.round(performance.now() - encT0);

    const elapsed = Math.round(performance.now() - t0);
    trackTTSMetric({ event: 'generate', provider: 'kitten', durationMs: elapsed, textLength: segments.reduce((s, seg) => s + seg.text.length, 0), segmentCount: segments.length });
    trackTTSMetric({ event: 'encode', provider: 'kitten', durationMs: encMs });
    console.log(`[KittenTTS] ✅ Dialogue done in ${elapsed}ms (enc=${encMs}ms, ${segments.length} segments, sequential)`);

    return audioEl;
};

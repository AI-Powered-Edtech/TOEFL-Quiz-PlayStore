import { registerPlugin, PluginListenerHandle } from '@capacitor/core';
import { isDialogue, parseDialogue } from './ttsService';

export interface SherpaTtsPlugin {
    speak(options: { text: string; speakerId?: number; speed?: number }): Promise<void>;
    speakStreaming(options: { text: string; speakerId?: number; speed?: number }): Promise<void>;
    stop(): Promise<void>;
    addListener(eventName: 'onStarted', listenerFunc: () => void): Promise<PluginListenerHandle>;
    addListener(eventName: 'onFinished', listenerFunc: () => void): Promise<PluginListenerHandle>;
    addListener(eventName: 'onSentenceStarted', listenerFunc: (data: { text: string; index: number; total: number }) => void): Promise<PluginListenerHandle>;
}

export const SherpaNativeTts = registerPlugin<SherpaTtsPlugin>('SherpaTts');

/**
 * Mobile Mock Player that mimics StreamingKittenPlayer for UI compatibility.
 * Uses speakStreaming for sentence-by-sentence generation and playback.
 * Listens to native events and translates them into React UI callbacks.
 */
export class MobileMockPlayer {
    private onProgress?: (current: number, total: number) => void;
    private onSentenceStarted?: (text: string, index: number) => void;
    private onEnded?: () => void;
    private onError?: (error: any) => void;
    private listeners: PluginListenerHandle[] = [];
    private isPlayingFlag = false;

    constructor(callbacks: {
        onProgress?: (current: number, total: number) => void;
        onSentenceStarted?: (text: string, index: number) => void;
        onEnded?: () => void;
        onError?: (error: any) => void;
    }) {
        this.onProgress = callbacks.onProgress;
        this.onSentenceStarted = callbacks.onSentenceStarted;
        this.onEnded = callbacks.onEnded;
        this.onError = callbacks.onError;
    }

    async play(transcript: string) {
        this.isPlayingFlag = true;
        try {
            // Setup native listeners
            const sentenceListener = await SherpaNativeTts.addListener('onSentenceStarted', (data) => {
                if (this.isPlayingFlag) {
                    if (this.onSentenceStarted) this.onSentenceStarted(data.text, data.index);
                    if (this.onProgress) this.onProgress(data.index, data.total);
                }
            });

            const finishedListener = await SherpaNativeTts.addListener('onFinished', () => {
                if (this.isPlayingFlag && this.onEnded) {
                    this.onEnded();
                }
                this.cleanup();
            });

            this.listeners.push(sentenceListener, finishedListener);

            // Handle Dialogue mapping for Piper (amy-low)
            if (isDialogue(transcript)) {
                const segments = parseDialogue(transcript);

                if (this.onProgress) this.onProgress(0, segments.length);

                for (let i = 0; i < segments.length; i++) {
                    if (!this.isPlayingFlag) break;

                    const segment = segments[i];
                    const speakerId = segment.speaker === 'M' ? 1 : 0;

                    if (this.onProgress) this.onProgress(i, segments.length);
                    if (this.onSentenceStarted) this.onSentenceStarted(segment.text, i);

                    // Use regular speak for each dialogue segment (already short)
                    await SherpaNativeTts.speak({ text: segment.text, speakerId, speed: 1.0 });
                }

                if (this.isPlayingFlag && this.onEnded) {
                    this.onEnded();
                }
                this.cleanup();
            } else {
                // Use streaming mode — sentences are split natively for faster first-audio
                if (this.onProgress) this.onProgress(0, 1);
                await SherpaNativeTts.speakStreaming({ text: transcript, speakerId: 0, speed: 1.0 });
            }

        } catch (e) {
            if (this.onError) this.onError(e);
            this.cleanup();
        }
    }

    async stop() {
        this.isPlayingFlag = false;
        await SherpaNativeTts.stop();
        this.cleanup();
    }

    private cleanup() {
        this.isPlayingFlag = false;
        this.listeners.forEach(l => l.remove());
        this.listeners = [];
    }

    // Mock method to satisfy audioCacheService interface
    async getCombinedWavUrl(): Promise<string | null> {
        return null; // Native does not return WAV Blobs
    }
}

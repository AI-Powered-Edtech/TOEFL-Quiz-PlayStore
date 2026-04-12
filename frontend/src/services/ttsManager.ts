import { Capacitor } from '@capacitor/core';
import { generateAndCacheAudio as generateKittenAudio } from './audioCacheService';
import { StreamingKittenPlayer } from './ttsService';
import { MobileMockPlayer } from './sherpaNativeService';

/**
 * Hybrid TTS Manager.
 * Routes audio generation requests cleanly between Web TTS (Kitten) and Mobile TTS (Sherpa-ONNX).
 */

export const generateHybridAudio = async (
    transcript: string,
    questionId?: string,
    streamingPlayer?: StreamingKittenPlayer | MobileMockPlayer
): Promise<string | StreamingKittenPlayer | MobileMockPlayer> => {

    // Check if on Native Platform (Android/iOS)
    if (Capacitor.isNativePlatform()) {
        const player = streamingPlayer as MobileMockPlayer;
        if (player) {
            // Fire and forget, the mock player handles Native TTS event resolution
            player.play(transcript).catch(console.error);
            return player;
        } else {
            // If called without a player instance, just instantiate one briefly or return dummy string
            const tempPlayer = new MobileMockPlayer({});
            tempPlayer.play(transcript).catch(console.error);
            return 'native_playback_started';
        }
    } else {
        // Fallback to Web / Kitten TTS workflow with caching
        return await generateKittenAudio(transcript, questionId, streamingPlayer as StreamingKittenPlayer);
    }
};

export const preCacheHybridAudio = (transcript: string) => {
    if (Capacitor.isNativePlatform()) {
        // Sherpa-ONNX runs instantly locally, pre-caching isn't strictly necessary.
        // We can skip heavy background WAV generation here on native.
        return;
    } else {
        import('./audioCacheService').then(m => m.preloadAudio(transcript));
    }
};

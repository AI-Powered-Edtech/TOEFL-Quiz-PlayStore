import { Capacitor } from '@capacitor/core';
import { Loader2, Play, Square, Volume2 } from 'lucide-react';
import React, { useState, useRef, useCallback } from 'react';

import { SherpaNativeTts } from '../../services/sherpaNativeService';
import { isDialogue, parseDialogue } from '../../services/ttsService';

interface NativeAudioPlayerProps {
    /** The text to speak via native TTS */
    audioScript: string;
    /** Max number of plays allowed (default: unlimited) */
    maxPlays?: number;
    /** Default speaker ID for non-dialogue (0=female, 1=male) */
    speakerId?: number;
    /** Callback when playback finishes */
    onEnded?: () => void;
}

/**
 * Native TTS Audio Player for Capacitor (Sherpa-ONNX Piper).
 * Handles both plain text (speakStreaming) and dialogues (multi-speaker with [M]/[W] tags).
 */
export const NativeAudioPlayer: React.FC<NativeAudioPlayerProps> = ({
    audioScript,
    maxPlays,
    speakerId = 0,
    onEnded,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playCount, setPlayCount] = useState(0);
    const [currentSentence, setCurrentSentence] = useState('');
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const isPlayingRef = useRef(false);

    const isNative = Capacitor.isNativePlatform();
    const maxReached = maxPlays != null && playCount >= maxPlays;

    const playDialogue = useCallback(async () => {
        const segments = parseDialogue(audioScript);
        setProgress({ current: 0, total: segments.length });

        for (let i = 0; i < segments.length; i++) {
            if (!isPlayingRef.current) break;

            const segment = segments[i];
            // Kokoro v0.19 speaker IDs:
            //   0 = af_heart (female, warm) → [W]
            //   2 = am_adam  (male, confident) → [M]
            const sid = segment.speaker === 'M' ? 2 : 0;

            setCurrentSentence(segment.text);
            setProgress({ current: i, total: segments.length });

            await SherpaNativeTts.speak({
                text: segment.text,
                speakerId: sid,
                speed: 1.0,
            });
        }
    }, [audioScript]);

    const playStreaming = useCallback(async () => {
        return new Promise<void>((resolve, reject) => {
            let resolved = false;

            const setup = async () => {
                const sentenceListener = await SherpaNativeTts.addListener('onSentenceStarted', (data) => {
                    if (isPlayingRef.current) {
                        setCurrentSentence(data.text);
                        setProgress({ current: data.index, total: data.total });
                    }
                });

                const finishedListener = await SherpaNativeTts.addListener('onFinished', () => {
                    sentenceListener.remove();
                    finishedListener.remove();
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                });

                await SherpaNativeTts.speakStreaming({
                    text: audioScript,
                    speakerId,
                    speed: 1.0,
                });
            };

            setup().catch(reject);
        });
    }, [audioScript, speakerId]);

    const handlePlay = useCallback(async () => {
        if (isPlayingRef.current || maxReached || !isNative) return;

        isPlayingRef.current = true;
        setIsPlaying(true);
        setCurrentSentence('');

        try {
            if (isDialogue(audioScript)) {
                await playDialogue();
            } else {
                await playStreaming();
            }
        } catch (e) {
            console.error('[NativeAudioPlayer] Error:', e);
        } finally {
            setIsPlaying(false);
            isPlayingRef.current = false;
            setPlayCount(c => c + 1);
            setCurrentSentence('');
            onEnded?.();
        }
    }, [audioScript, maxReached, isNative, onEnded, playDialogue, playStreaming]);

    const handleStop = useCallback(async () => {
        isPlayingRef.current = false;
        try {
            await SherpaNativeTts.stop();
        } catch (e) {
            // ignore
        }
        setIsPlaying(false);
        setCurrentSentence('');
    }, []);

    if (!isNative) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-xs">
                Audio not available — native TTS only.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-center gap-4">
                {/* Play/Stop button */}
                <button
                    onClick={isPlaying ? handleStop : handlePlay}
                    disabled={maxReached && !isPlaying}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shrink-0 touch-manipulation ${isPlaying
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                        : maxReached
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 active:scale-95'
                        }`}
                >
                    {isPlaying ? (
                        <Square className="w-5 h-5" />
                    ) : (
                        <Play className="w-6 h-6 ml-0.5" />
                    )}
                </button>

                {/* Status */}
                <div className="flex-1 min-w-0">
                    {isPlaying ? (
                        <div>
                            <div className="flex items-center gap-2">
                                <Volume2 className="w-4 h-4 text-blue-500 animate-pulse shrink-0" />
                                <p className="text-sm text-slate-700 line-clamp-2 italic">
                                    {currentSentence || 'Generating...'}
                                </p>
                            </div>
                            {progress.total > 1 && (
                                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                                    <div
                                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${((progress.current + 1) / progress.total) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ) : maxReached ? (
                        <p className="text-sm text-slate-400">Max plays reached ({maxPlays})</p>
                    ) : (
                        <div>
                            <p className="text-sm font-medium text-slate-700">Tap to listen</p>
                            {maxPlays && (
                                <p className="text-xs text-slate-400">{playCount}/{maxPlays} plays used</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Loading indicator */}
                {isPlaying && !currentSentence && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                )}
            </div>
        </div>
    );
};

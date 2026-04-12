import { Play, Pause, RefreshCw, Volume2, Loader2, Users, User, Zap, Cloud, Crown, ArrowRight } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { isAudioCached, setCachedAudio, getCachedAudio } from '../services/audioCacheService';
import { checkEdgeTTSReady, isDialogue, SubscriptionRequiredError, warmupKittenTts, StreamingKittenPlayer } from '../services/ttsService';
import { generateHybridAudio, preCacheHybridAudio } from '../services/ttsManager';
import { MobileMockPlayer } from '../services/sherpaNativeService';

interface ListeningPlayerProps {
    transcript: string;
    questionId?: string; // For Supabase audio storage
    audioUrl?: string; // Pre-saved audio URL from database (stimulus.audio_url)
    nextTranscript?: string; // Next question's transcript for pre-caching
    onComplete?: () => void;
    autoPlay?: boolean;
}

export const ListeningPlayer: React.FC<ListeningPlayerProps> = ({
    transcript,
    questionId,
    audioUrl, // Audio URL from database (if exists)
    nextTranscript,
    onComplete,
    autoPlay = false
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isServiceReady, setIsServiceReady] = useState<boolean | null>(null);
    const [isDialogueMode, setIsDialogueMode] = useState(false);
    const [isCached, setIsCached] = useState(false);
    const [hasDbAudio, setHasDbAudio] = useState(false); // New: track if using DB audio
    const [showUpgradeGate, setShowUpgradeGate] = useState(false); // Show upgrade prompt for free users

    // Gapless Streaming states
    const [activeText, setActiveText] = useState<string>('');
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const streamPlayerRef = useRef<StreamingKittenPlayer | MobileMockPlayer | null>(null);
    const hasAutoPlayed = useRef(false);
    const isPlayingRef = useRef(false);

    // Check if audio URL exists in database and pre-cache it
    useEffect(() => {
        if (audioUrl && audioUrl.length > 0 && transcript) {
            console.log('🎵 Found audio URL in database:', audioUrl);
            // Pre-populate the memory cache with the database URL
            setCachedAudio(transcript, audioUrl);
            setHasDbAudio(true);
            setIsCached(true);
        }
    }, [audioUrl, transcript]);

    // Check if TTS service is available and detect dialogue mode
    useEffect(() => {
        const checkService = async () => {
            // If we have DB audio, we don't need TTS service
            if (hasDbAudio) {
                setIsServiceReady(true);
                return;
            }

            const healthy = await checkEdgeTTSReady();
            setIsServiceReady(healthy);
            if (!healthy) {
                setError('TTS service not available. Run: npm run tts:start');
            }
        };
        checkService();

        // Detect if transcript has dialogue tags
        if (transcript) {
            setIsDialogueMode(isDialogue(transcript));
            // Check both DB audio and memory cache
            setIsCached(hasDbAudio || isAudioCached(transcript));
        }
    }, [transcript, hasDbAudio]);

    // Warmup Kitten TTS on mount so model downloads before first play
    useEffect(() => {
        warmupKittenTts();
    }, []);

    // Preload ONLY the next question in the background to save CPU. 
    // Streaming is ~500ms instant, so generating the CURRENT transcript before "Play" is clicked is a waste of CPU.
    useEffect(() => {
        if (nextTranscript && isServiceReady) {
            preCacheHybridAudio(nextTranscript);
        }
    }, [nextTranscript, isServiceReady]);

    // Cleanup audio elements on unmount or transcript change
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }
            if (streamPlayerRef.current) {
                streamPlayerRef.current.stop();
                streamPlayerRef.current = null;
            }
            // Reset playback states on unmount
            isPlayingRef.current = false;
            setActiveText('');
        };
    }, [transcript]);

    const handlePlay = useCallback(async () => {
        if (!transcript || isLoading || !isServiceReady || isPlayingRef.current) return;

        setIsLoading(true);
        setError(null);
        isPlayingRef.current = true;
        setActiveText('');
        setProgress({ current: 0, total: 0 });

        // Stop any existing audio
        if (audioRef.current) {
            audioRef.current.pause();
        }
        if (streamPlayerRef.current) {
            streamPlayerRef.current.stop();
        }

        try {
            const cached = getCachedAudio(transcript);
            console.log('🔄 Fetching audio...', cached ? (typeof cached === 'string' ? '(cached URL)' : '(active stream)') : '(new stream)');

            if (cached && typeof cached === 'string') {
                // Play URL (from DB or fully cached WAV)
                let audio: HTMLAudioElement;
                if (cached.startsWith('http') || cached.startsWith('blob:')) {
                    audio = new Audio(cached);
                } else {
                    const { getAudioUrl } = await import('../services/ttsService');
                    audio = new Audio(getAudioUrl(cached) || cached);
                }

                audioRef.current = audio;

                const handleEnded = () => {
                    console.log('⏹️ Audio ended');
                    setIsPlaying(false);
                    isPlayingRef.current = false;
                    setActiveText('');
                    if (onComplete) onComplete();
                };

                audio.addEventListener('ended', handleEnded);

                setIsLoading(false);
                setIsPlaying(true);
                await audio.play();

            } else {
                // Streaming mode (gapless Web Audio playback)
                const useNative = (await import('@capacitor/core')).Capacitor.isNativePlatform();

                if (!useNative) {
                    const { isKittenReady } = await import('../services/kittenTtsService');
                    if (!isKittenReady()) {
                        setActiveText('⚙️ Connecting to TTS Backend...');
                    }
                } else {
                    setActiveText('🔊 Speaking with Piper...');
                }

                const callbacks = {
                    onProgress: (current: number, total: number) => {
                        setProgress({ current, total });
                    },
                    onSentenceStarted: (text: string, index: number) => {
                        setActiveText(text);
                        if (index === 0) {
                            setIsLoading(false);
                            setIsPlaying(true);
                        }
                    },
                    onEnded: () => {
                        console.log('⏹️ Stream ended');
                        setIsPlaying(false);
                        isPlayingRef.current = false;
                        setActiveText('');
                        if (onComplete) onComplete();
                    },
                    onError: (err: any) => {
                        setError(err instanceof Error ? err.message : 'Streaming Error');
                        setIsPlaying(false);
                        setIsLoading(false);
                        isPlayingRef.current = false;
                    }
                };

                const player = useNative
                    ? new MobileMockPlayer(callbacks)
                    : new StreamingKittenPlayer(callbacks);

                streamPlayerRef.current = player as any;

                // This lets us reuse cache logic but inject our player for streaming events
                await generateHybridAudio(transcript, questionId, player as any);

                // Fallback UI status upgrade in case onSentenceStarted doesn't fire immediately
                setTimeout(() => {
                    if (isPlayingRef.current && isLoading) {
                        setIsLoading(false);
                        setIsPlaying(true);
                    }
                }, 1000);
            }
        } catch (err) {
            console.error('❌ Playback error:', err);

            // Check if subscription required
            if (err instanceof SubscriptionRequiredError) {
                setShowUpgradeGate(true);
                setIsLoading(false);
                setIsPlaying(false);
                isPlayingRef.current = false;
                return;
            }

            if (!(err instanceof Error && err.name === 'AbortError')) {
                setError(err instanceof Error ? err.message : 'Audio Failed');
            }

            setIsLoading(false);
            setIsPlaying(false);
            isPlayingRef.current = false;
        }
    }, [transcript, isLoading, isServiceReady, isDialogueMode, onComplete]);

    // Auto-play effect
    useEffect(() => {
        if (autoPlay && transcript && !hasAutoPlayed.current && !isLoading && isServiceReady) {
            hasAutoPlayed.current = true;
            setTimeout(() => handlePlay(), 100);
        }
    }, [autoPlay, transcript, isServiceReady, isLoading, handlePlay]);

    const handleStop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        if (streamPlayerRef.current) {
            streamPlayerRef.current.stop();
        }
        setIsPlaying(false);
        setIsLoading(false);
        isPlayingRef.current = false;
        setActiveText('');
        setProgress({ current: 0, total: 0 });
    }, []);

    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            handleStop();
        } else if (!isLoading) {
            handlePlay();
        }
    }, [isPlaying, isLoading, handlePlay, handleStop]);

    const handleRetry = useCallback(() => {
        setError(null);
        handlePlay();
    }, [handlePlay]);

    // Upgrade gate for free users
    if (showUpgradeGate) {
        return (
            <div className="w-full bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6 shadow-sm">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                        <Crown className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">
                        Unlock Audio Features
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Audio playback requires a Basic or C2 subscription. Upgrade to access premium text-to-speech with natural voices.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <a
                            href="/settings?tab=subscription"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
                        >
                            <Crown className="w-4 h-4" />
                            Upgrade Now
                            <ArrowRight className="w-4 h-4" />
                        </a>
                        <button
                            onClick={() => setShowUpgradeGate(false)}
                            className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm"
                        >
                            Maybe Later
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                        Basic: $4.99/mo • C2: $9.99/mo
                    </p>
                </div>
            </div>
        );
    }

    // Service not ready
    if (isServiceReady === false) {
        return (
            <div className="w-full bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
                <div className="flex items-center gap-3 text-amber-700">
                    <Volume2 className="w-5 h-5" />
                    <div>
                        <p className="font-semibold">TTS Service Not Running</p>
                        <p className="text-sm text-amber-600">
                            Run <code className="bg-amber-100 px-1 rounded">npm run tts:start</code>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state (service is ready or loading, not the "service not running" case)
    if (error) {
        return (
            <div className="w-full bg-red-50 rounded-xl border border-red-200 p-4 shadow-sm">
                <div className="flex items-center gap-3 text-red-700">
                    <Volume2 className="w-5 h-5" />
                    <div className="flex-1">
                        <p className="font-semibold">Audio Error</p>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                    <button
                        onClick={handleRetry}
                        className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 rounded-md transition-colors font-medium"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={handlePlayPause}
                    disabled={!transcript || !isServiceReady}
                    className={`w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-md ${!transcript || !isServiceReady
                        ? 'bg-slate-100 cursor-not-allowed'
                        : isPlaying
                            ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isPlaying ? (
                        <Pause className="w-5 h-5" />
                    ) : (
                        <Play className="w-5 h-5 ml-1" />
                    )}
                </button>

                <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                            {isDialogueMode ? (
                                <>
                                    <Users className="w-3.5 h-3.5" />
                                    Conversation
                                </>
                            ) : (
                                <>
                                    <User className="w-3.5 h-3.5" />
                                    Audio Track
                                </>
                            )}
                            {hasDbAudio ? (
                                <span className="ml-1 text-blue-500 flex items-center gap-0.5" title="Audio from cloud storage">
                                    <Cloud className="w-3 h-3" />
                                </span>
                            ) : isCached && (
                                <span className="ml-1 text-green-500 flex items-center gap-0.5" title="Audio cached locally">
                                    <Zap className="w-3 h-3" />
                                </span>
                            )}
                        </span>
                        <span className="flex items-center gap-2">
                            {isLoading && (
                                <span className="flex items-center gap-1 text-amber-600">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Generating...
                                </span>
                            )}
                            {isPlaying && !isLoading && (
                                <span className="flex items-center gap-1 text-green-600">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    Playing
                                </span>
                            )}
                            {!isPlaying && !isLoading && isServiceReady && (
                                <span className="text-slate-400">
                                    {hasDbAudio ? 'Ready (Saved)' : isCached ? 'Ready (Cached)' : 'Ready'}
                                </span>
                            )}

                        </span>
                    </div>

                    {activeText && (
                        <div className="text-sm font-medium text-slate-700 italic border-l-2 border-blue-400 pl-2 my-1.5 animate-in fade-in slide-in-from-left-2 duration-300 line-clamp-2">
                            "{activeText}"
                        </div>
                    )}

                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                        {(isPlaying || isLoading) && (
                            <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1 ${isLoading ? 'bg-amber-400' : 'bg-blue-400'} animate-pulse`}
                                        style={{
                                            height: `${20 + Math.random() * 80}%`,
                                            animationDuration: `${0.3 + Math.random() * 0.5}s`
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                        {!isPlaying && !isLoading && <div className="h-full bg-blue-200 w-full" />}
                        {/* Progressive generation feedback string indicator */}
                        {progress.total > 0 && progress.current < progress.total && isLoading && (
                            <div
                                className="absolute inset-y-0 left-0 bg-amber-400/30 transition-all duration-500 ease-out"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                        )}
                    </div>
                </div>

                <button
                    onClick={handlePlay}
                    disabled={!transcript || isLoading || !isServiceReady}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Replay"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 justify-center">
                <Volume2 className="w-3 h-3" />
                <span>🐱 Kitten TTS • {isDialogueMode ? 'Multi-Voice Dialogue' : 'Neural Voice'}</span>
            </div>
        </div>
    );
};

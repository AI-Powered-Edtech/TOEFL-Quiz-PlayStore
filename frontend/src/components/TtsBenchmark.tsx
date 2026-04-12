import { Play, Loader2, Zap, Server, Clock } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { StreamingKittenPlayer, warmupKittenTts } from '../services/ttsService';

import { Button } from './Button';

export const TtsBenchmark = () => {
    const [status, setStatus] = useState('Idle');
    const [metrics, setMetrics] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);

    // Test text - standard typical sentence length to test streaming chunking
    const testTranscript = "Welcome to the TOEFULL Integrated Writing Task. In this lecture, we will discuss the surprising aerodynamic properties of the bumblebee, which according to early 20th century mathematical models, should be entirely incapable of flight. However, as we now understand, the bumblebee does not fly like an airplane, but rather like a helicopter.";

    const playerRef = useRef<StreamingKittenPlayer | null>(null);

    useEffect(() => {
        warmupKittenTts().catch(e => console.warn('Warmup failed', e));
        return () => playerRef.current?.stop();
    }, []);

    const runBenchmark = async () => {
        setIsRunning(true);
        setStatus('Warming up TTS engine...');
        setMetrics(null);

        try {
            const startSynthTime = performance.now();
            let firstChunkMs = 0;
            let chunks = 0;

            const player = new StreamingKittenPlayer({
                onProgress: (current, total) => {
                    chunks++;
                    if (firstChunkMs === 0 && current > 0) {
                        firstChunkMs = performance.now() - startSynthTime;
                        setStatus(`Streaming chunk ${current}/${total}...`);
                    }
                },
                onEnded: () => {
                    const totalMs = performance.now() - startSynthTime;
                    setStatus('Finished');
                    setIsRunning(false);
                    setMetrics({
                        transcriptLength: testTranscript.length,
                        ttfb: firstChunkMs.toFixed(2),
                        totalTime: totalMs.toFixed(2),
                        chunks: chunks
                    });
                },
                onError: (e) => {
                    setStatus(`Error: ${e}`);
                    setIsRunning(false);
                }
            });

            playerRef.current = player;
            setStatus('Parsing text to Backend...');

            await player.play(testTranscript, 1.0, 0);

        } catch (e: any) {
            setStatus('Failed: ' + e.message);
            setIsRunning(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8 mt-10 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-6">
                <Zap className="w-8 h-8 text-amber-500" />
                <h1 className="text-2xl font-bold dark:text-white">Kitten TTS Backend Benchmark</h1>
            </div>

            <p className="text-slate-500 mb-6 border-l-4 border-indigo-500 pl-4 py-2 bg-slate-50 dark:bg-slate-800/50 italic text-sm">
                "{testTranscript}"
            </p>

            <Button
                onClick={runBenchmark}
                disabled={isRunning}
                className="w-full py-6 text-lg bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 dark:shadow-none mb-6"
            >
                {isRunning ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> {status}</>
                ) : (
                    <><Play className="w-5 h-5 mr-2" /> Run Local Benchmark</>
                )}
            </Button>

            {metrics && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase mb-1">
                            <Clock className="w-4 h-4 text-green-500" /> Time-to-First-Byte
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                            {metrics.ttfb} <span className="text-sm font-medium text-slate-400">ms</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Delay before audio starts playing</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase mb-1">
                            <Server className="w-4 h-4 text-purple-500" /> Total Playback Time
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white">
                            {metrics.totalTime} <span className="text-sm font-medium text-slate-400">ms</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Total stream duration ({metrics.chunks} chunks)</p>
                    </div>
                </div>
            )}
        </div>
    );
};

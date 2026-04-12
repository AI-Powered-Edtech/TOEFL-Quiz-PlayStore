import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Star, Trophy, Target, Clock, Activity, ChevronRight, Crosshair, RefreshCw } from 'lucide-react';
import React, { useEffect } from 'react';

import { Button } from '../Button';


interface MissionReportScreenProps {
    starsEarned: 0 | 1 | 2 | 3;
    score: number;
    accuracy?: number; // New stat
    timeRemaining?: number;
    skillName: string;
    tier: 1 | 2 | 3;
    onContinue: () => void;
    onRetry: () => void;
}

export const MissionReportScreen: React.FC<MissionReportScreenProps> = ({
    starsEarned,
    score,
    accuracy = 100,
    timeRemaining = 0,
    skillName,
    tier,
    onContinue,
    onRetry
}) => {
    // Trigger tactical confetti
    useEffect(() => {
        if (starsEarned >= 2) {
            const duration = 2500;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 70,
                    origin: { x: 0 },
                    colors: ['#ef4444', '#10b981', '#3b82f6'], // Red, Green, Blue tactical colors
                    shapes: ['square']
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 70,
                    origin: { x: 1 },
                    colors: ['#ef4444', '#10b981', '#3b82f6'],
                    shapes: ['square']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }
    }, [starsEarned]);

    const tierName = tier === 1 ? 'SCOUT' : tier === 2 ? 'DEADEYE' : 'GHOST';
    const tierColor = tier === 1 ? 'text-blue-400' : tier === 2 ? 'text-amber-400' : 'text-purple-400';

    return (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50 p-4">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border-2 border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-sm relative flex flex-col items-center overflow-hidden"
            >
                {/* Top Badge */}
                <div className="w-full bg-slate-800 p-4 border-b border-slate-700 flex flex-col items-center justify-center relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="bg-slate-950 p-3 rounded-full border-2 border-slate-700 mb-2"
                    >
                        <Trophy className="w-8 h-8 text-yellow-500" />
                    </motion.div>

                    <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">
                        MISSION ACCOMPLISHED
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span>OPERATION:</span>
                        <span className={`font-bold ${tierColor}`}>{tierName}</span>
                    </div>
                </div>

                <div className="p-6 w-full">
                    {/* Stars */}
                    <div className="flex justify-center gap-3 mb-8">
                        {[1, 2, 3].map((star) => (
                            <motion.div
                                key={star}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + (star * 0.1) }}
                            >
                                <Star
                                    className={`w-8 h-8 ${star <= starsEarned ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700 fill-slate-800'}`}
                                />
                            </motion.div>
                        ))}
                    </div>

                    {/* Report Card */}
                    <div className="bg-slate-950/50 rounded-lg border border-slate-800 p-4 mb-6 space-y-4">
                        <div className="flex justify-between items-center text-sm font-mono text-slate-400">
                            <span>TARGET NEUTRALIZED:</span>
                            <span className="text-white">{skillName}</span>
                        </div>

                        <div className="h-px bg-slate-800 w-full"></div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 uppercase">Score</span>
                                <span className="text-xl font-bold text-white">{score}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 uppercase">Accuracy</span>
                                <span className="text-xl font-bold text-green-400">{accuracy}%</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 uppercase">Time Left</span>
                                <span className="text-xl font-bold text-blue-400">{timeRemaining}s</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-500 uppercase">Rating</span>
                                <span className="text-xl font-bold text-yellow-400">{starsEarned === 3 ? 'S' : starsEarned === 2 ? 'A' : 'B'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={onRetry}
                            className="flex-1 border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Replay
                        </Button>
                        <Button
                            onClick={onContinue}
                            className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-bold tracking-wider shadow-lg shadow-green-900/20"
                        >
                            NEXT MISSION <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

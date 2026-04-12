import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Star, Trophy, TrendingUp, Award, ChevronRight, RotateCcw } from 'lucide-react';
import React, { useEffect } from 'react';

import { Button } from '../Button';


interface MasonSuccessScreenProps {
    starsEarned: 0 | 1 | 2 | 3;
    score: number;
    timeBonus: number;
    comboBonus: number;
    skillName: string;
    currentLevel: number;
    xpEarned: number;
    skillProgress: {
        current: number;
        total: number;
    };
    onTryHarder: () => void;
    onNextLevel: () => void;
    onShowSkillMap: () => void;
    hasNextLevel: boolean;
}

export const MasonSuccessScreen: React.FC<MasonSuccessScreenProps> = ({
    starsEarned,
    score,
    timeBonus,
    comboBonus,
    skillName,
    currentLevel,
    xpEarned,
    skillProgress,
    onTryHarder,
    onNextLevel,
    onShowSkillMap,
    hasNextLevel
}) => {
    // Trigger confetti on 3 stars
    useEffect(() => {
        if (starsEarned === 3) {
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 2,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#FFD700', '#FFA500', '#FF6347']
                });
                confetti({
                    particleCount: 2,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#FFD700', '#FFA500', '#FF6347']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }
    }, [starsEarned]);

    const totalScore = score + timeBonus + comboBonus;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.4, type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm p-8 relative flex flex-col items-center overflow-hidden"
            >
                {/* Green Top Border/Accent */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-400 to-emerald-500" />

                {/* Stars Row - Prominent */}
                <div className="flex justify-center items-end gap-2 mb-6 mt-4">
                    <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: -30 }}
                        animate={{ scale: 1, opacity: 1, rotate: -15 }}
                        transition={{ delay: 0.4, type: 'spring' }}
                    >
                        <Star className={`w-10 h-10 ${starsEarned >= 2 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'} drop-shadow-sm`} />
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0, opacity: 0, y: 20 }}
                        animate={{ scale: 1.2, opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="mb-2"
                    >
                        <Star className={`w-14 h-14 ${starsEarned >= 1 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'} drop-shadow-md`} />
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: 30 }}
                        animate={{ scale: 1, opacity: 1, rotate: 15 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                    >
                        <Star className={`w-10 h-10 ${starsEarned >= 3 ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 fill-slate-200'} drop-shadow-sm`} />
                    </motion.div>
                </div>

                {/* Header Content */}
                <div className="text-center w-full mb-8">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
                        Level Conquered!
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">
                        You mastered the {skillName.toLowerCase()}.
                    </p>
                </div>

                {/* Stats Grid - Side by Side */}
                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                    {/* Score Box */}
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <Trophy className="w-3.5 h-3.5" /> Score
                        </span>
                        <span className="text-2xl font-black text-slate-800 dark:text-white">
                            {score}
                        </span>
                    </div>

                    {/* XP Box */}
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                            <TrendingUp className="w-3.5 h-3.5" /> XP Earned
                        </span>
                        <span className="text-2xl font-black text-green-500 dark:text-green-400">
                            +{xpEarned}
                        </span>
                    </div>
                </div>

                {/* Primary Action - Green Button */}
                {hasNextLevel && (
                    <Button
                        onClick={onNextLevel}
                        className="w-full py-4 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold rounded-xl shadow-[0_4px_0_0_#00C853] hover:shadow-[0_2px_0_0_#00C853] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all flex items-center justify-center gap-2 mb-4 text-base"
                    >
                        Next Level <ChevronRight className="w-5 h-5 stroke-[3]" />
                    </Button>
                )}

                {/* Secondary Action - Replay */}
                <button
                    onClick={onTryHarder}
                    className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 font-bold transition-colors py-2"
                >
                    <RotateCcw className="w-4 h-4" /> Replay Level
                </button>

            </motion.div>
        </div>
    );
};

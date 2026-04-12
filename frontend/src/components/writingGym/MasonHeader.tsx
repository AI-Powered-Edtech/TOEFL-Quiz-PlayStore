import { motion } from 'framer-motion';
import { ArrowLeft, Puzzle, ChevronRight, Grid3X3, Heart } from 'lucide-react';
import React from 'react';

import { AppView } from '../../types';
import { MasonGameState } from '../../types/mason';

interface MasonHeaderProps {
    onNavigate: (view: AppView) => void;
    currentLevel: number;
    skillName: string;
    gameState: MasonGameState;
    onSetLevel: (level: number) => void;
    onShowSkillMap: () => void;
}

export const MasonHeader: React.FC<MasonHeaderProps> = ({
    onNavigate,
    currentLevel,
    skillName,
    gameState,
    onSetLevel,
    onShowSkillMap
}) => {
    return (
        <>
            <div
                className="flex-shrink-0 bg-white px-3 flex items-center justify-between shadow-sm z-20 relative"
                style={{
                    paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
                    paddingBottom: '0.5rem'
                }}
            >
                <div className="flex items-center justify-between gap-2 w-full">
                    {/* Left: Back + Title */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onNavigate(AppView.WRITING_GYM_HUB)}
                            className="p-2.5 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Back to Writing Gym"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <h1 className="text-base font-black text-slate-700 flex items-center gap-1.5 truncate max-w-[120px] sm:max-w-xs">
                            <Puzzle className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="truncate">{skillName}</span>
                        </h1>
                    </div>

                    {/* Center: Level Navigation with Skill Map */}
                    <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => {
                                    if (currentLevel > 1) {
                                        onSetLevel(currentLevel - 1);
                                    }
                                }}
                                disabled={currentLevel === 1}
                                className="p-2.5 hover:bg-white rounded disabled:opacity-30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                aria-label="Previous level"
                            >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                            </button>
                            <button
                                onClick={onShowSkillMap}
                                className="px-2 py-0.5 hover:bg-white rounded transition-colors flex items-center gap-1"
                            >
                                <span className="text-xs font-bold text-slate-600">
                                    L{currentLevel}
                                </span>
                                <Grid3X3 className="w-3 h-3 text-blue-500" />
                            </button>
                            <button
                                onClick={() => {
                                    if (currentLevel < 50) {
                                        onSetLevel(currentLevel + 1);
                                    }
                                }}
                                disabled={currentLevel === 50 || gameState.status !== 'success'}
                                className="p-2.5 hover:bg-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                aria-label="Next level"
                            >
                                <ChevronRight className={`w-4 h-4 ${gameState.status === 'success' ? 'text-green-600' : 'text-slate-400'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Right: Lives */}
                    <div className="flex items-center gap-1 bg-red-50 px-2 py-1.5 rounded-lg border border-red-100 shrink-0">
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        <span className="text-sm font-bold text-red-700">{gameState.lives}</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar (Thin line below header) */}
            <div className="h-1 bg-slate-200 w-full relative overflow-hidden">
                <motion.div
                    className="h-full bg-blue-500 absolute top-0 left-0"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(gameState.timeRemaining / gameState.maxTime) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                />
            </div>
        </>
    );
};

import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Star, Trophy, ChevronRight, Map, Zap, Play, CheckCircle2 } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { MASON_LEVELS, MasonLevel, getSkillFromLevel } from '../../data/masonLevels';
import { MASON_SKILLS } from '../../data/masonSkills';
import { writingGymProgressService } from '../../services/writingGymProgressService';
import { Button } from '../Button';

interface MasonSkillMapProps {
    userId: string;
    currentLevel: number;
    onSelectLevel: (levelNum: number) => void;
    onClose: () => void;
}

interface LevelProgress {
    levelNum: number;
    starsEarned: number;
    completed: boolean;
}

export const MasonSkillMap: React.FC<MasonSkillMapProps> = ({
    userId,
    currentLevel,
    onSelectLevel,
    onClose
}) => {
    const [levelProgress, setLevelProgress] = useState<LevelProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadProgress();
    }, [userId]);

    // Auto-scroll to current level
    useEffect(() => {
        if (!loading && scrollRef.current) {
            const currentEl = document.getElementById(`level-node-${currentLevel}`);
            if (currentEl) {
                setTimeout(() => {
                    currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [loading, currentLevel]);

    const loadProgress = async () => {
        try {
            const progress = await writingGymProgressService.getAllLevelProgress(userId, 'mason');
            const mappedProgress: LevelProgress[] = progress.map(p => ({
                levelNum: parseInt(p.skill_id.replace('L', ''), 10) || parseInt(p.skill_id.replace('S', ''), 10) || 1,
                starsEarned: p.stars_earned || 0,
                completed: (p.stars_earned || 0) > 0
            }));
            setLevelProgress(mappedProgress);
        } catch (error) {
            console.error('Failed to load skill map progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const getLevelStatus = (levelNum: number) => {
        const progress = levelProgress.find(p => p.levelNum === levelNum);
        if (progress?.starsEarned === 3) return 'mastered';
        if (progress?.completed) return 'completed';
        if (levelNum === currentLevel) return 'current';

        // 1. Check if Skill is Unlocked
        const skill = getSkillFromLevel(levelNum);
        if (!skill) return 'locked';

        // Count unique completed skills
        // We define "Completed Skill" as: The user has completed the *Mastery* level (even number) of that skill.
        const completedSkillIds = new Set<string>();
        levelProgress.forEach(p => {
            if (p.completed) {
                const s = getSkillFromLevel(p.levelNum);
                // Only count as completed if it's the Mastery level (even)
                if (s && p.levelNum % 2 === 0) {
                    completedSkillIds.add(s.id);
                }
            }
        });

        if (completedSkillIds.size < skill.unlockAt) return 'locked';

        // 2. Intra-skill progression (Intro -> Mastery)
        // If it's the Intro level (odd), and skill is unlocked, it's available.
        if (levelNum % 2 === 1) return 'available';

        // If it's the Mastery level (even), require Intro (prev level) completion
        const prevProgress = levelProgress.find(p => p.levelNum === levelNum - 1);
        if (prevProgress?.completed) return 'available';

        return 'locked';
    };

    const getStars = (levelNum: number) => levelProgress.find(p => p.levelNum === levelNum)?.starsEarned || 0;

    return (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm flex flex-col z-50 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b bg-white flex items-center justify-between shadow-sm z-10"
                style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                    <h2 className="text-lg font-black text-slate-800">Grammar Gym</h2>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-100">
                    <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-sm text-yellow-700">1,240</span> {/* Mock Energy */}
                </div>
            </div>

            {/* Map Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#F5F7FA] relative pb-20 pt-10">
                {/* Central Dashed Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-slate-300 -translate-x-1/2" />

                <div className="flex flex-col items-center gap-12 relative z-0 max-w-md mx-auto px-4">
                    {MASON_LEVELS.map((level, index) => {
                        const status = getLevelStatus(level.levelNum);
                        const stars = getStars(level.levelNum);
                        const isLeft = index % 2 === 0;

                        return (
                            <div
                                key={level.levelNum}
                                id={`level-node-${level.levelNum}`}
                                className={`flex w-full items-center justify-center relative ${isLeft ? '' : ''}`}
                            >
                                {/* Level Card */}
                                <div className={`
                                    relative w-full max-w-[280px] transition-transform duration-300
                                    ${status === 'current' ? 'scale-110 z-10' : 'scale-100 opacity-90'}
                                `}>
                                    {/* Connector to center line concept - simulated by positioning */}

                                    <button
                                        onClick={() => status !== 'locked' && onSelectLevel(level.levelNum)} // Directly select level
                                        disabled={status === 'locked'}
                                        className={`
                                            w-full rounded-2xl p-5 shadow-lg border-b-4 transition-all text-left group
                                            ${status === 'current'
                                                ? 'bg-white border-green-500 ring-4 ring-green-100'
                                                : status === 'locked'
                                                    ? 'bg-slate-100 border-slate-200 text-slate-400'
                                                    : 'bg-white border-slate-200 hover:border-blue-300'
                                            }
                                        `}
                                    >
                                        {/* Badge / Status Tag */}
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md
                                                ${status === 'current'
                                                    ? 'bg-green-500 text-white'
                                                    : status === 'locked'
                                                        ? 'bg-slate-200 text-slate-500' // Locked Tag
                                                        : 'bg-slate-900 text-white' // "Lvl X" tag
                                                }
                                            `}>
                                                {status === 'current' ? 'Current' : `Lvl ${level.levelNum}`}
                                            </span>

                                            {/* Stars or Lock */}
                                            {status === 'locked' ? (
                                                <Lock className="w-4 h-4 text-slate-400" />
                                            ) : (
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3].map(s => (
                                                        <Star
                                                            key={s}
                                                            className={`w-3.5 h-3.5 ${s <= stars ? 'fill-yellow-400 text-yellow-400' : 'fill-slate-100 text-slate-200'}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className={`text-base font-black mb-1 line-clamp-1 ${status === 'locked' ? 'text-slate-400' : 'text-slate-800'}`}>
                                            {level.skillName}
                                        </h3>

                                        {/* Subtitle / Description */}
                                        <p className="text-xs text-slate-400 font-medium mb-4">
                                            {level.difficulty} • {level.xpReward} XP
                                        </p>

                                        {/* Action Button (Visual only, whole card is clickable) */}
                                        {status === 'current' && (
                                            <div className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors">
                                                <span>Resume</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        )}

                                        {status === 'locked' && (
                                            <div className="mt-2 w-full bg-slate-200 text-slate-400 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2">
                                                <span>Locked</span>
                                                <Lock className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

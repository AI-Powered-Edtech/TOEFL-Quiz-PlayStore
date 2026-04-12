import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Star, Trophy, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { MASON_SKILLS, getMasonSkill } from '../../data/masonSkills';
import { masonProgressService, getUnlockedSkillIds, getTotalStars } from '../../services/masonProgressService';
import { WritingGymProgress } from '../../types';
import { Button } from '../Button';

interface MasonSkillPickerProps {
    userId: string;
    currentSkillId?: string;
    onSelectSkill: (skillId: string) => void;
    onClose: () => void;
}

export const MasonSkillPicker: React.FC<MasonSkillPickerProps> = ({
    userId,
    currentSkillId,
    onSelectSkill,
    onClose
}) => {
    const [allProgress, setAllProgress] = useState<WritingGymProgress[]>([]);
    const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
    const [totalStars, setTotalStars] = useState(0);
    const [selectedSkill, setSelectedSkill] = useState<string | null>(currentSkillId || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProgress();
    }, [userId]);

    const loadProgress = async () => {
        try {
            const [progress, unlocked, stars] = await Promise.all([
                masonProgressService.getAllProgress(userId),
                getUnlockedSkillIds(userId),
                getTotalStars(userId)
            ]);

            setAllProgress(progress);
            setUnlockedIds(unlocked);
            setTotalStars(stars);
        } catch (error) {
            console.error('Failed to load skill progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSkillStars = (skillId: string): number => {
        return allProgress.find(p => p.skill_id === skillId)?.stars_earned || 0;
    };

    const isUnlocked = (skillId: string): boolean => {
        return unlockedIds.includes(skillId);
    };

    const handleSkillClick = (skillId: string) => {
        if (!isUnlocked(skillId)) return;
        setSelectedSkill(skillId);
    };

    const handleContinue = () => {
        if (selectedSkill) {
            onSelectSkill(selectedSkill);
            onClose();
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8">
                    <div className="text-center">Loading skills...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-black text-slate-800">Select Skill</h2>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <span className="font-bold text-slate-700">{totalStars}/75</span>
                    </div>
                </div>

                {/* Skills Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {MASON_SKILLS.map((skill) => {
                            const stars = getSkillStars(skill.id);
                            const unlocked = isUnlocked(skill.id);
                            const isSelected = selectedSkill === skill.id;
                            const isCurrent = currentSkillId === skill.id;

                            return (
                                <motion.button
                                    key={skill.id}
                                    whileHover={unlocked ? { scale: 1.05 } : {}}
                                    whileTap={unlocked ? { scale: 0.95 } : {}}
                                    onClick={() => handleSkillClick(skill.id)}
                                    disabled={!unlocked}
                                    className={`
                                        relative p-4 rounded-xl border-2 transition-all
                                        ${!unlocked ? 'bg-slate-100 border-slate-200 cursor-not-allowed grayscale' : ''}
                                        ${unlocked && stars === 0 ? 'bg-white border-dashed border-slate-300 hover:border-blue-400' : ''}
                                        ${stars === 1 ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' : ''}
                                        ${stars === 2 ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-400' : ''}
                                        ${stars === 3 ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-500' : ''}
                                        ${isSelected ? 'ring-4 ring-blue-400 ring-offset-2' : ''}
                                        ${isCurrent ? 'ring-2 ring-indigo-400' : ''}
                                    `}
                                >
                                    {/* Lock Icon for Locked Skills */}
                                    {!unlocked && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Lock className="w-8 h-8 text-slate-400" />
                                        </div>
                                    )}

                                    {/* Skill Content */}
                                    <div className={`${!unlocked ? 'opacity-30' : ''}`}>
                                        <div className="font-bold text-lg text-slate-700 mb-1">{skill.id}</div>
                                        <div className="text-xs text-slate-600 mb-2 line-clamp-2 h-8">{skill.name}</div>

                                        {/* Stars */}
                                        {unlocked && (
                                            <div className="flex gap-0.5 justify-center">
                                                {[1, 2, 3].map((s) => (
                                                    <Star
                                                        key={s}
                                                        className={`w-4 h-4 ${s <= stars
                                                            ? 'fill-amber-400 text-amber-400'
                                                            : 'fill-slate-200 text-slate-200'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Current Badge */}
                                        {isCurrent && (
                                            <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                                Current
                                            </div>
                                        )}

                                        {/* Checkmark for 3 Stars */}
                                        {stars === 3 && (
                                            <div className="absolute -top-2 -left-2 bg-amber-500 text-white rounded-full p-1">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                        {selectedSkill && (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{getMasonSkill(selectedSkill)?.name}</span>
                                <span className="text-slate-400">•</span>
                                <span>{getMasonSkill(selectedSkill)?.difficulty}</span>
                            </div>
                        )}
                    </div>
                    <Button
                        onClick={handleContinue}
                        disabled={!selectedSkill}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
                    >
                        Start Skill
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, Play, RotateCcw, Split, Plus, ArrowRight, List, HelpCircle, AlertCircle, Quote, BarChart, Scale, Target, Flag, FileText, Shuffle } from 'lucide-react';
import React from 'react';

import { LOGIC_WEAVER_SKILLS, LogicWeaverSkill } from '../../data/logicWeaverSkills';
import { Button } from '../Button';

interface LogicWeaverSkillPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSkill: (skillId: string) => void;
    completedLevels: number;
}

export const LogicWeaverSkillPicker: React.FC<LogicWeaverSkillPickerProps> = ({
    isOpen,
    onClose,
    onSelectSkill,
    completedLevels
}) => {
    // Group skills by difficulty
    const skillsByDifficulty = {
        beginner: LOGIC_WEAVER_SKILLS.filter(s => s.difficulty === 'beginner'),
        intermediate: LOGIC_WEAVER_SKILLS.filter(s => s.difficulty === 'intermediate'),
        advanced: LOGIC_WEAVER_SKILLS.filter(s => s.difficulty === 'advanced')
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';
            case 'intermediate': return 'text-indigo-500 bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800';
            case 'advanced': return 'text-violet-500 bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800';
            default: return 'text-slate-500 bg-slate-100 border-slate-200';
        }
    };

    const getDifficultyIconBg = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'bg-emerald-500';
            case 'intermediate': return 'bg-indigo-500';
            case 'advanced': return 'bg-violet-500';
            default: return 'bg-slate-500';
        }
    };

    const getDifficultyTitle = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'Beginner';
            case 'intermediate': return 'Intermediate';
            case 'advanced': return 'Advanced';
            default: return difficulty;
        }
    };

    const getDifficultySubtitle = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'Basic Relationships';
            case 'intermediate': return 'Academic Connectors';
            case 'advanced': return 'Sophisticated Flow';
            default: return '';
        }
    };

    const getSkillIcon = (skillId: string) => {
        // Map skill IDs to icons
        if (skillId.includes('LW01') || skillId.includes('LW07')) return <Split className="w-5 h-5" />; // Cause & Effect
        if (skillId.includes('LW02') || skillId.includes('LW08')) return <Shuffle className="w-5 h-5" />; // Contrast
        if (skillId.includes('LW03')) return <Plus className="w-5 h-5" />; // Addition
        if (skillId.includes('LW04')) return <ArrowRight className="w-5 h-5" />; // Sequence
        if (skillId.includes('LW05')) return <Quote className="w-5 h-5" />; // Example
        if (skillId.includes('LW06')) return <HelpCircle className="w-5 h-5" />; // Condition
        if (skillId.includes('LW09')) return <AlertCircle className="w-5 h-5" />; // Clarification
        if (skillId.includes('LW10')) return <Flag className="w-5 h-5" />; // Emphasis
        if (skillId.includes('LW11')) return <Scale className="w-5 h-5" />; // Comparison
        if (skillId.includes('LW12')) return <Target className="w-5 h-5" />; // Purpose
        if (skillId.includes('LW13')) return <HelpCircle className="w-5 h-5" />; // Complex Condition
        if (skillId.includes('LW14')) return <Shuffle className="w-5 h-5" />; // Concession
        if (skillId.includes('LW15')) return <FileText className="w-5 h-5" />; // Summary
        if (skillId.includes('LW16')) return <List className="w-5 h-5" />; // Alternative
        return <List className="w-5 h-5" />;
    };

    // Calculate total progress percentage
    const totalProgress = Math.round((completedLevels / LOGIC_WEAVER_SKILLS.length) * 100);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="relative w-full max-w-md h-full sm:h-[90vh] bg-[#F8FAFC] dark:bg-slate-950 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex-shrink-0 px-6 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10 relative">
                            {/* Close Button Absolute */}
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Logic Weaver</h2>
                                <div className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    LW
                                </div>
                            </div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Writing Gym</p>

                            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                <span className="text-slate-700 dark:text-slate-300">Total Mastery</span>
                                <span className="text-emerald-500">{completedLevels}/{LOGIC_WEAVER_SKILLS.length} Skills</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${totalProgress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-emerald-500 rounded-full"
                                />
                            </div>
                        </div>

                        {/* Content area */}
                        <div className="flex-1 overflow-y-auto px-6 py-2 relative scrollbar-hide">
                            {/* Timeline Line */}
                            <div className="absolute top-4 bottom-4 left-[1.65rem] w-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />

                            <div className="space-y-8 py-6">
                                {Object.entries(skillsByDifficulty).map(([difficulty, skills]) => (
                                    <div key={difficulty} className="relative">

                                        {/* Section Header */}
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm z-10 text-white shadow-lg shadow-${getDifficultyIconBg(difficulty).replace('bg-', '')}/20 ${getDifficultyIconBg(difficulty)}`}>
                                                {difficulty === 'beginner' && <Target className="w-5 h-5" />}
                                                {difficulty === 'intermediate' && <BarChart className="w-5 h-5" />}
                                                {difficulty === 'advanced' && <Flag className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white capitalize leading-none mb-1">
                                                    {getDifficultyTitle(difficulty)}
                                                </h3>
                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    {getDifficultySubtitle(difficulty)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Skills Grid - 2 Column */}
                                        <div className="grid grid-cols-2 gap-3 pl-4">
                                            {skills.map((skill, index) => {
                                                const globalIndex = LOGIC_WEAVER_SKILLS.findIndex(s => s.id === skill.id);
                                                const isLocked = globalIndex > completedLevels;
                                                const isCompleted = globalIndex < completedLevels;
                                                const isCurrent = globalIndex === completedLevels;

                                                // Icon background colors based on state
                                                let iconBg = 'bg-slate-100 dark:bg-slate-800 text-slate-400';
                                                let cardBorder = 'border-transparent';
                                                let cardShadow = '';

                                                if (isCompleted) {
                                                    iconBg = 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500';
                                                } else if (isCurrent) {
                                                    iconBg = 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500';
                                                    cardBorder = 'border-indigo-500';
                                                    cardShadow = 'shadow-lg shadow-indigo-500/10';
                                                } else { // Locked
                                                    iconBg = 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600';
                                                }

                                                // Special styling for current card
                                                const cardBaseClasses = "relative rounded-2xl p-4 flex flex-col justify-between h-[180px] transition-all duration-200 border-2";
                                                const cardStateClasses = isLocked
                                                    ? "bg-slate-50/50 dark:bg-slate-900/50 border-transparent opacity-80"
                                                    : "bg-white dark:bg-slate-900 shadow-sm hover:shadow-md border-transparent";

                                                const activeCardClasses = isCurrent
                                                    ? "bg-white dark:bg-slate-900 ring-2 ring-emerald-500 border-transparent shadow-xl shadow-emerald-500/10 scale-[1.02] z-10"
                                                    : "";

                                                // Icon container classes
                                                const iconContainerBase = "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors";
                                                const iconContainerState = isLocked
                                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-300"
                                                    : isCompleted
                                                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                                                        : isCurrent
                                                            ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600"
                                                            : "bg-slate-100 text-slate-400"; // Should not happen

                                                return (
                                                    <div
                                                        key={skill.id}
                                                        className={`${cardBaseClasses} ${activeCardClasses} ${!isCurrent && cardStateClasses}`}
                                                    >
                                                        {/* Top Row: Icon + Status Indicator */}
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className={iconContainerState}>
                                                                {getSkillIcon(skill.id)}
                                                            </div>

                                                            {/* Status Badge */}
                                                            {isCompleted ? (
                                                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/30">
                                                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                                </div>
                                                            ) : isCurrent ? (
                                                                <div className="w-8 h-8 rounded-full border-4 border-emerald-100 text-[10px] font-black text-emerald-600 flex items-center justify-center bg-transparent">
                                                                    {Math.round(Math.random() * 80)}%
                                                                </div>
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                                    <Lock className="w-3 h-3" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Text Content */}
                                                        <div className="flex-1">
                                                            <h4 className={`text-sm font-bold mb-1 leading-tight ${isLocked ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                                {skill.name}
                                                            </h4>
                                                            <p className="text-[10px] font-medium text-slate-400 line-clamp-2 leading-relaxed">
                                                                {skill.connectors.join(', ')}
                                                            </p>
                                                        </div>

                                                        {/* Button */}
                                                        <div className="mt-4">
                                                            {isLocked ? (
                                                                <div className="w-full py-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-wider">
                                                                    <Lock className="w-3 h-3" /> Locked
                                                                </div>
                                                            ) : isCompleted ? (
                                                                <button
                                                                    onClick={() => onSelectSkill(skill.id)}
                                                                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-[11px] font-bold transition-colors"
                                                                >
                                                                    Review
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => onSelectSkill(skill.id)}
                                                                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                                                >
                                                                    {isCurrent ? 'Resume' : 'Start'}
                                                                </button>
                                                            )}
                                                        </div>

                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

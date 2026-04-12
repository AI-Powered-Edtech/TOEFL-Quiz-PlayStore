import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, Type, ArrowUpRight, GitMerge, Clock, List, AlertCircle, Quote, Scale, Target, Flag, FileText, Shuffle, Sparkles, MoveRight, HelpCircle } from 'lucide-react';
import React from 'react';

import { COMPLEXITY_LADDER_SKILLS, ComplexityLadderSkill } from '../../data/complexityLadderSkills';

interface ComplexityLadderSkillPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSkill: (skillId: string) => void;
    completedLevels: number;
}

export const ComplexityLadderSkillPicker: React.FC<ComplexityLadderSkillPickerProps> = ({
    isOpen,
    onClose,
    onSelectSkill,
    completedLevels
}) => {
    // Group skills by difficulty
    const skillsByDifficulty = {
        beginner: COMPLEXITY_LADDER_SKILLS.filter(s => s.difficulty === 'beginner'),
        intermediate: COMPLEXITY_LADDER_SKILLS.filter(s => s.difficulty === 'intermediate'),
        advanced: COMPLEXITY_LADDER_SKILLS.filter(s => s.difficulty === 'advanced')
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800';
            case 'intermediate': return 'text-amber-500 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
            case 'advanced': return 'text-rose-500 bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800';
            default: return 'text-slate-500 bg-slate-100 border-slate-200';
        }
    };

    const getDifficultyIconBg = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'bg-emerald-500';
            case 'intermediate': return 'bg-amber-500';
            case 'advanced': return 'bg-rose-500';
            default: return 'bg-slate-500';
        }
    };

    const getDifficultyTitle = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'Foundation';
            case 'intermediate': return 'Expansion';
            case 'advanced': return 'Mastery';
            default: return difficulty;
        }
    };

    const getDifficultySubtitle = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'Sentences 101';
            case 'intermediate': return 'Adding Depth';
            case 'advanced': return 'Academic Style';
            default: return '';
        }
    };

    const getSkillIcon = (skillId: string) => {
        if (skillId === 'CL01') return <Type className="w-5 h-5" />; // Simple Sentences
        if (skillId === 'CL02') return <GitMerge className="w-5 h-5" />; // Compound Subjects
        if (skillId === 'CL03') return <MoveRight className="w-5 h-5" />; // Coordinating Conjunctions
        if (skillId === 'CL04') return <ArrowUpRight className="w-5 h-5" />; // Prepositional Phrases
        if (skillId === 'CL05') return <Clock className="w-5 h-5" />; // Adverbs of Frequency
        if (skillId === 'CL06') return <Clock className="w-5 h-5" />; // Complex Sentences (Time)
        if (skillId === 'CL07') return <HelpCircle className="w-5 h-5" />; // Complex (Reason)
        if (skillId === 'CL08') return <Quote className="w-5 h-5" />; // Relative Clauses
        if (skillId === 'CL09') return <Shuffle className="w-5 h-5" />; // Conditional I
        if (skillId === 'CL10') return <Flag className="w-5 h-5" />; // Passive Voice
        if (skillId === 'CL11') return <List className="w-5 h-5" />; // Participle Phrases
        if (skillId === 'CL12') return <Scale className="w-5 h-5" />; // Inversion
        if (skillId === 'CL13') return <Target className="w-5 h-5" />; // Cleft Sentences
        if (skillId === 'CL14') return <AlertCircle className="w-5 h-5" />; // Conditional III
        if (skillId === 'CL15') return <FileText className="w-5 h-5" />; // Nominalization
        return <Sparkles className="w-5 h-5" />;
    };

    // Calculate total progress percentage
    const totalProgress = Math.round((completedLevels / COMPLEXITY_LADDER_SKILLS.length) * 100);

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
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Complexity Ladder</h2>
                                <div className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                    CL
                                </div>
                            </div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Writing Gym</p>

                            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                <span className="text-slate-700 dark:text-slate-300">Total Mastery</span>
                                <span className="text-indigo-500">{completedLevels}/{COMPLEXITY_LADDER_SKILLS.length} Skills</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${totalProgress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-indigo-500 rounded-full"
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
                                                {difficulty === 'beginner' && <ArrowUpRight className="w-5 h-5" />}
                                                {difficulty === 'intermediate' && <GitMerge className="w-5 h-5" />}
                                                {difficulty === 'advanced' && <Sparkles className="w-5 h-5" />}
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
                                                const globalIndex = COMPLEXITY_LADDER_SKILLS.findIndex(s => s.id === skill.id);
                                                const isLocked = globalIndex > completedLevels;
                                                const isCompleted = globalIndex < completedLevels;
                                                const isCurrent = globalIndex === completedLevels;

                                                // Icon background colors based on state
                                                let iconBg = 'bg-slate-100 dark:bg-slate-800 text-slate-400';
                                                let cardBorder = 'border-transparent';
                                                let cardShadow = '';

                                                if (isCompleted) {
                                                    iconBg = 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500';
                                                } else if (isCurrent) {
                                                    iconBg = 'bg-amber-100 dark:bg-amber-900/30 text-amber-500';
                                                    cardBorder = 'border-amber-500';
                                                    cardShadow = 'shadow-lg shadow-amber-500/10';
                                                } else { // Locked
                                                    iconBg = 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600';
                                                }

                                                // Special styling for current card
                                                const cardBaseClasses = "relative rounded-2xl p-4 flex flex-col justify-between h-[180px] transition-all duration-200 border-2";
                                                const cardStateClasses = isLocked
                                                    ? "bg-slate-50/50 dark:bg-slate-900/50 border-transparent opacity-80"
                                                    : "bg-white dark:bg-slate-900 shadow-sm hover:shadow-md border-transparent";

                                                const activeCardClasses = isCurrent
                                                    ? "bg-white dark:bg-slate-900 ring-2 ring-amber-500 border-transparent shadow-xl shadow-amber-500/10 scale-[1.02] z-10"
                                                    : "";

                                                // Icon container classes
                                                const iconContainerBase = "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors";
                                                const iconContainerState = isLocked
                                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-300"
                                                    : isCompleted
                                                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600"
                                                        : isCurrent
                                                            ? "bg-amber-50 dark:bg-amber-900/40 text-amber-600"
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
                                                                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
                                                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                                </div>
                                                            ) : isCurrent ? (
                                                                <div className="w-8 h-8 rounded-full border-4 border-amber-100 flex items-center justify-center bg-transparent text-amber-500">
                                                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
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
                                                                {skill.structures.join(', ')}
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
                                                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
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

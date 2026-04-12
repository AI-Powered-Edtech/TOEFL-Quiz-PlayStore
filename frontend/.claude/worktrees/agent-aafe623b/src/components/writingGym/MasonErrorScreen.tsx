import { motion } from 'framer-motion';
import { XCircle, AlertCircle, Lightbulb, RotateCcw, SkipForward } from 'lucide-react';
import React from 'react';

import { Button } from '../Button';

interface MasonErrorScreenProps {
    userSentence?: string;
    correctSentence?: string;
    grammarTip?: string;
    skillName?: string;
    onRetry: () => void;
    onSkip?: () => void;
    tip?: string; // Add tip prop for compatibility
    onBack?: () => void; // Add onBack
}

export const MasonErrorScreen: React.FC<MasonErrorScreenProps> = ({
    userSentence = "",
    correctSentence = "",
    grammarTip,
    skillName = "Practice",
    onRetry,
    onSkip,
    tip,
    onBack
}) => {
    // Merge tips
    const activeTip = grammarTip || tip;
    // Calculate diff between user and correct sentence
    const getDiff = () => {
        if (!userSentence || !correctSentence) return [];

        const userWords = userSentence.trim().split(/\s+/);
        const correctWords = correctSentence.trim().split(/\s+/);

        const diff: Array<{ word: string; status: 'correct' | 'wrong' | 'missing' }> = [];

        correctWords.forEach((correctWord, index) => {
            if (userWords[index] === correctWord) {
                diff.push({ word: correctWord, status: 'correct' });
            } else if (userWords[index]) {
                diff.push({ word: userWords[index], status: 'wrong' });
            } else {
                diff.push({ word: correctWord, status: 'missing' });
            }
        });

        return diff;
    };

    const diffWords = getDiff();

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.4, type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm p-6 relative flex flex-col max-h-[90vh]"
            >
                {/* Top Icon Badge - Overlapping Top */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="bg-red-500 p-4 rounded-full shadow-lg border-4 border-white dark:border-slate-800"
                    >
                        <XCircle className="w-8 h-8 text-white" />
                    </motion.div>
                </div>

                {/* Scrollable Content Area */}
                <div className="mt-8 overflow-y-auto flex-1 pr-1 -mr-1">
                    {/* Header */}
                    <div className="text-center w-full mb-6 relative">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">
                            Not Quite Right
                        </h2>
                        <p className="text-slate-500 font-medium text-sm">
                            {skillName}
                        </p>
                    </div>

                    {/* Your Answer Card */}
                    <div className="mb-4">
                        <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Your Answer
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4 text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                            {userSentence || <span className="text-slate-400 italic">(Empty)</span>}
                        </div>
                    </div>

                    {/* Correct Answer Card */}
                    <div className="mb-6">
                        <div className="flex items-center gap-1.5 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <Lightbulb className="w-3.5 h-3.5 text-green-500" />
                            Correction
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-xl p-4 leading-relaxed">
                            <div className="flex flex-wrap gap-1.5">
                                {diffWords.map((item, index) => (
                                    <span
                                        key={index}
                                        className={`
                                            px-1.5 py-0.5 rounded text-sm font-semibold
                                            ${item.status === 'correct'
                                                ? 'text-slate-700 dark:text-slate-300'
                                                : item.status === 'wrong'
                                                    ? 'bg-red-100 text-red-600 line-through decoration-2'
                                                    : 'bg-green-200 text-green-800 ring-1 ring-green-300'
                                            }
                                        `}
                                    >
                                        {item.word}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Grammar Tip */}
                    {activeTip && (
                        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 flex gap-3">
                            <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm mb-1">Grammar Tip</h4>
                                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                                    {activeTip}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons (Fixed at bottom) */}
                <div className="flex gap-3 w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {onSkip && (
                        <Button
                            variant="outline"
                            onClick={onSkip}
                            className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50"
                        >
                            Skip
                        </Button>
                    )}
                    {onBack && (
                        <Button
                            variant="outline"
                            onClick={onBack}
                            className="flex-1 py-3.5 rounded-xl border-2 border-slate-200 text-slate-500 font-bold hover:bg-slate-50"
                        >
                            Exit
                        </Button>
                    )}
                    <Button
                        onClick={onRetry}
                        className="flex-1 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4 stroke-[3]" />
                        Try Again
                    </Button>
                </div>
            </motion.div>
        </div>
    );
};

import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Check, Zap } from 'lucide-react';
import React from 'react';

import { Button } from '../Button';

interface LogicWeaverSuccessScreenProps {
    onNext: () => void;
    onReview: () => void;
    onNextLevel?: () => void;
    hasNextLevel?: boolean;
    xpEarned: number;
    sentence: {
        main: string;
        connector: string;
        subordinate: string;
    };
}

export const LogicWeaverSuccessScreen: React.FC<LogicWeaverSuccessScreenProps> = ({
    onNext,
    onReview,
    onNextLevel,
    hasNextLevel,
    xpEarned,
    sentence
}) => {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-[#F0FDF4] dark:bg-black relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#4ade80_1px,transparent_1px)] bg-[length:24px_24px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-sm text-center"
            >
                {/* XP Pill */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 px-4 py-1.5 rounded-full shadow-sm mb-8 border border-emerald-100 dark:border-emerald-900/30"
                >
                    <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                    <span className="font-black text-slate-800 dark:text-white text-sm">+{xpEarned} XP</span>
                </motion.div>

                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-4xl font-black text-emerald-500 mb-2 tracking-tight"
                >
                    Logic Woven!
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-slate-500 dark:text-slate-400 font-medium mb-10"
                >
                    You've successfully connected the clauses.
                </motion.p>

                {/* Sentence Card */}
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-emerald-500/10 mb-12 relative"
                >
                    {/* Checkmark Badge */}
                    <div className="absolute -top-4 -right-4 bg-emerald-500 text-white p-2 rounded-full shadow-lg border-4 border-[#F0FDF4] dark:border-black">
                        <Check className="w-6 h-6" strokeWidth={3} />
                    </div>

                    <p className="text-lg font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
                        {sentence.main},
                        <br />
                        <span className="text-emerald-500 font-black text-xl block my-2 uppercase tracking-wide">
                            {sentence.connector}
                        </span>
                        {sentence.subordinate}.
                    </p>
                </motion.div>
            </motion.div>

            {/* Bottom Actions */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="w-full max-w-sm space-y-3"
            >
                <button
                    onClick={onReview}
                    className="w-full py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                    <BookOpen className="w-5 h-5" />
                    Review Rule
                </button>

                <Button
                    onClick={hasNextLevel && onNextLevel ? onNextLevel : onNext}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                >
                    {hasNextLevel ? "Next Level" : "Next Question"}
                    <ArrowRight className="w-5 h-5" strokeWidth={3} />
                </Button>
            </motion.div>
        </div>
    );
};

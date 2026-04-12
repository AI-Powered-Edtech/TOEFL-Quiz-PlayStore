import { motion, AnimatePresence } from 'framer-motion';
import { Clock, FileText, Trash2, RotateCcw } from 'lucide-react';
import React from 'react';

import { Button } from '../../Button';

interface RecoveryModalProps {
    isOpen: boolean;
    taskType: 'Task 1' | 'Task 2';
    minutesLeft: number;
    wordCount: number;
    onResume: () => void;
    onDiscard: () => void;
}

/**
 * Modal that replaces window.confirm() for essay draft recovery.
 * Shown when a user returns to the sim with an unfinished essay + active timer.
 * Touch-friendly for Capacitor mobile.
 */
export const RecoveryModal: React.FC<RecoveryModalProps> = ({
    isOpen,
    taskType,
    minutesLeft,
    wordCount,
    onResume,
    onDiscard,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        onClick={onResume}
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        className="fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl overflow-hidden"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                        {/* Drag indicator */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        </div>

                        <div className="p-6 pb-8">
                            {/* Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mx-auto mb-4">
                                <RotateCcw className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                            </div>

                            <h2 className="text-xl font-black text-slate-900 dark:text-white text-center mb-1">
                                Resume Your Essay?
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
                                You have an unfinished {taskType} essay saved.
                            </p>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                            {minutesLeft}m
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">remaining</div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                            {wordCount}
                                        </div>
                                        <div className="text-[11px] text-slate-500 font-medium">words saved</div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <Button
                                    size="lg"
                                    onClick={onResume}
                                    className="w-full rounded-2xl font-bold text-base"
                                >
                                    Continue Writing
                                </Button>
                                <button
                                    onClick={onDiscard}
                                    className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-red-500 hover:text-red-700 dark:text-red-400 transition-colors active:scale-95"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Discard & Start Fresh
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

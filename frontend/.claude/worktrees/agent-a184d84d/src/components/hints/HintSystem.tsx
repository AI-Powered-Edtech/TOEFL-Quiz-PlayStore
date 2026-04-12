import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import React from 'react';

interface HintSystemProps {
    showHint: boolean;
    onToggleHint: () => void;
    translation?: string;
    difficulty: string;
    availableHints: number;
}

export const HintSystem: React.FC<HintSystemProps> = ({
    showHint,
    onToggleHint,
    translation,
    difficulty,
    availableHints
}) => {
    return (
        <div className="space-y-3">
            <button
                onClick={onToggleHint}
                disabled={availableHints <= 0}
                className={`
          w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border-2 
          transition-all font-semibold text-sm
          ${showHint
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
                    }
          ${availableHints <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
        `}
            >
                <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    <span>{showHint ? 'Hide Translation' : 'Show Translation Hint'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {availableHints} left
                    </span>
                    {showHint && <X className="w-4 h-4" />}
                </div>
            </button>

            <AnimatePresence>
                {showHint && translation && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="px-4 py-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-800"
                    >
                        <p className="text-sm text-blue-800 dark:text-blue-300 italic leading-relaxed">
                            {translation}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

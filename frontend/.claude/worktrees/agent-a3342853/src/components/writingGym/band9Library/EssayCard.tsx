import { motion } from 'framer-motion';
import { Star, BookOpen, Eye, Bookmark, TrendingUp, Sparkles } from 'lucide-react';
import React from 'react';

import { ModelEssay } from '../../../types';

interface EssayCardProps {
    essay: ModelEssay;
    onClick: () => void;
    onToggleSave: (e: React.MouseEvent) => void;
    isSaved: boolean;
}

export const EssayCard: React.FC<EssayCardProps> = ({ essay, onClick, onToggleSave, isSaved }) => {
    return (
        <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group relative overflow-hidden"
        >
            {/* Visual Flair: Verification Badge / Source Indicator */}
            {essay.source === 'curated' && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-20">
                    CURATED
                </div>
            )}

            {/* Decorative Background Element */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            {/* Header: Topic & Band Score */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex-1 pr-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {essay.task_type}
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        {essay.category || 'General'}
                    </span>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white leading-tight line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {essay.topic}
                    </h3>
                </div>

                <div className="flex flex-col items-center">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                        <span className="text-[10px] font-bold uppercase tracking-tighter opacity-80">BAND</span>
                        <span className="text-xl font-black">{essay.band_score}</span>
                    </div>
                </div>
            </div>

            {/* Content Preview */}
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-6 relative z-10 font-serif leading-relaxed">
                {essay.content}
            </p>

            {/* Footer: Stats & Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 relative z-10">
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {essay.word_count} words
                    </span>
                    <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {essay.annotations?.length || 0} analyses
                    </span>
                </div>

                <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={onToggleSave}
                    className={`
                        p-2 rounded-full transition-colors flex items-center justify-center
                        ${isSaved
                            ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400'
                            : 'bg-transparent text-slate-300 hover:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}
                    `}
                >
                    <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                </motion.button>
            </div>
        </motion.div>
    );
};

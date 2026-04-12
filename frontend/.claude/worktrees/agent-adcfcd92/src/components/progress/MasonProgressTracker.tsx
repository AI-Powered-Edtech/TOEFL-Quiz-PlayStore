import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import React from 'react';

interface MasonProgressTrackerProps {
    currentLevel: number;
    totalLevels: number;
    progress: number;
}

export const MasonProgressTracker: React.FC<MasonProgressTrackerProps> = ({
    currentLevel,
    totalLevels,
    progress
}) => {
    return (
        <div className="bg-white rounded-[20px] border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold text-slate-800">Progress</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                    Level {currentLevel} / {totalLevels}
                </span>
            </div>

            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
            </div>

            <p className="text-[10px] text-slate-500 mt-2">
                {Math.round(progress)}% complete
            </p>
        </div>
    );
};

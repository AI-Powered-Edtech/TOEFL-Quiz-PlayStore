import React from 'react';

/**
 * Loading skeleton for submission/review cards
 */
export const SubmissionCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 animate-pulse">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
            <div className="space-y-2 mb-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
    );
};

/**
 * Loading skeleton for stats card
 */
export const StatsCardSkeleton: React.FC = () => {
    return (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-white/20 rounded"></div>
                <div className="h-8 w-16 bg-white/20 rounded-full"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <div className="h-8 bg-white/20 rounded"></div>
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-8 bg-white/20 rounded"></div>
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-8 bg-white/20 rounded"></div>
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                </div>
            </div>
        </div>
    );
};

/**
 * Loading skeleton for review queue
 */
export const ReviewQueueSkeleton: React.FC = () => {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <SubmissionCardSkeleton key={i} />
            ))}
        </div>
    );
};

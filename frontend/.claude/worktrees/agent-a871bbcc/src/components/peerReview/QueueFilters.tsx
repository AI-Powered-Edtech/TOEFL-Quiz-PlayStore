import { Search, Filter, X, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';

import { QueueFilters } from '../../services/peerReviewService';
import { Button } from '../Button';

export type { QueueFilters };

interface QueueFiltersProps {
    filters: QueueFilters;
    onFiltersChange: (filters: QueueFilters) => void;
    onRefresh: () => void;
    isLoading: boolean;
    resultCount: number;
}

export const QueueFiltersComponent: React.FC<QueueFiltersProps> = ({
    filters,
    onFiltersChange,
    onRefresh,
    isLoading,
    resultCount
}) => {
    const [showFilters, setShowFilters] = useState(false);

    const hasActiveFilters =
        filters.search !== '' ||
        filters.taskType !== 'all' ||
        filters.sortBy !== 'newest' ||
        filters.difficulty !== 'all';

    const clearFilters = () => {
        onFiltersChange({
            search: '',
            taskType: 'all',
            sortBy: 'newest',
            difficulty: 'all'
        });
    };

    return (
        <div className="space-y-3">
            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                        placeholder="Search essays by prompt or content..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800' : ''}
                >
                    <Filter className="w-4 h-4" />
                </Button>
                <Button
                    variant="outline"
                    onClick={onRefresh}
                    disabled={isLoading}
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Task Type Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Task Type
                            </label>
                            <select
                                value={filters.taskType}
                                onChange={(e) => onFiltersChange({ ...filters, taskType: e.target.value as QueueFilters['taskType'] })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
                            >
                                <option value="all">All Tasks</option>
                                <option value="Task 1">Task 1 (Graph/Chart)</option>
                                <option value="Task 2">Task 2 (Essay)</option>
                            </select>
                        </div>

                        {/* Difficulty Filter */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Difficulty
                            </label>
                            <select
                                value={filters.difficulty}
                                onChange={(e) => onFiltersChange({ ...filters, difficulty: e.target.value as QueueFilters['difficulty'] })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
                            >
                                <option value="all">All Levels</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>

                        {/* Sort By */}
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Sort By
                            </label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value as QueueFilters['sortBy'] })}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="word_count_asc">Shortest First</option>
                                <option value="word_count_desc">Longest First</option>
                            </select>
                        </div>
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-xs text-slate-500">
                                {resultCount} essay{resultCount !== 1 ? 's' : ''} found
                            </span>
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                            >
                                <X className="w-3 h-3" />
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Active Filter Tags */}
            {hasActiveFilters && !showFilters && (
                <div className="flex flex-wrap gap-2">
                    {filters.search && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs">
                            Search: "{filters.search}"
                            <button onClick={() => onFiltersChange({ ...filters, search: '' })}>
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {filters.taskType !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs">
                            {filters.taskType}
                            <button onClick={() => onFiltersChange({ ...filters, taskType: 'all' })}>
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                    {filters.difficulty !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs">
                            {filters.difficulty}
                            <button onClick={() => onFiltersChange({ ...filters, difficulty: 'all' })}>
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

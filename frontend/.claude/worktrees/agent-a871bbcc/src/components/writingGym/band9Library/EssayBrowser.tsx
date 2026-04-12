
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Grid, List, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';

import { ModelEssay } from '../../../types';

import { EssayCard } from './EssayCard';

interface EssayBrowserProps {
    essays: ModelEssay[];
    savedEssays: string[];
    onSelectEssay: (essay: ModelEssay) => void;
    onToggleSave: (essayId: string) => void;
    isLoading: boolean;
    onRefresh: () => void;
    hasMore?: boolean;
    onLoadMore?: () => void;
    onFilterChange?: (filters: { band_score_min?: number }) => void;
}

import { Button } from '../../Button';

const CATEGORIES = ["All", "Technology", "Environment", "Education", "Society", "Health", "Government", "Work"];

export const EssayBrowser: React.FC<EssayBrowserProps> = ({
    essays,
    savedEssays,
    onSelectEssay,
    onToggleSave,
    isLoading,
    onRefresh,
    hasMore,
    onLoadMore,
    onFilterChange
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const filteredEssays = essays.filter(essay => {
        const matchesSearch = essay.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
            essay.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === "All" || essay.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="w-full h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`
                                px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border
                                ${activeCategory === cat
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-indigo-900/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800'}
                            `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search essays..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700 dark:text-slate-200"
                        />
                    </div>
                    {/* Band Score Filter */}
                    <div className="relative">
                        <select
                            className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : undefined;
                                onFilterChange?.({ band_score_min: val });
                            }}
                        >
                            <option value="">Any Band</option>
                            <option value="9">Band 9.0</option>
                            <option value="8">Band 8.0+</option>
                            <option value="7">Band 7.0+</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="hidden md:flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            {isLoading && essays.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">Loading library...</p>
                </div>
            ) : filteredEssays.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <Filter className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No essays found</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-md">try adjusting your search or selecting a different category.</p>
                    <button onClick={onRefresh} className="mt-6 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm transition-colors">
                        Refresh Library
                    </button>
                </div>
            ) : (
                <div className="space-y-8 pb-10">
                    <div className={`
                        grid gap-6 
                        ${viewMode === 'grid'
                            ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                            : 'grid-cols-1'}
                    `}>
                        <AnimatePresence>
                            {filteredEssays.map(essay => (
                                <EssayCard
                                    key={essay.id}
                                    essay={essay}
                                    onClick={() => onSelectEssay(essay)}
                                    isSaved={savedEssays.includes(essay.id)}
                                    onToggleSave={(e) => {
                                        e.stopPropagation();
                                        onToggleSave(essay.id);
                                    }}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Load More Trigger */}
                    {hasMore && (
                        <div className="flex justify-center pt-4">
                            <Button
                                onClick={onLoadMore}
                                disabled={isLoading}
                                variant="outline"
                                className="w-full md:w-auto min-w-[200px]"
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Loading more...
                                    </>
                                ) : (
                                    'Load More Essays'
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

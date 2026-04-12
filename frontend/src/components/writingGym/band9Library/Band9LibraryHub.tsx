
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Star, Sparkles, AlertCircle, WifiOff } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { useOfflineDetection } from '../../../hooks/useOfflineDetection';
import { band9LibraryService } from '../../../services/band9LibraryService';
import { writingGymService } from '../../../services/writingGymService';
import { AppView, ModelEssay } from '../../../types';
import { Button } from '../../Button';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { useToast } from '../../ui/Toast';

import { AnnotationPanel } from './AnnotationPanel';
import { EssayBrowser } from './EssayBrowser';
import { EssayReader } from './EssayReader';
import { VocabularyCollector } from './VocabularyCollector';


interface Band9LibraryHubProps {
    onNavigate: (view: AppView) => void;
    userId?: string;
}

export const Band9LibraryHub: React.FC<Band9LibraryHubProps> = ({ onNavigate, userId }) => {
    // View State
    const [currentView, setCurrentView] = useState<'BROWSER' | 'READER'>('BROWSER');
    const toast = useToast();
    const { isOffline, justReconnected } = useOfflineDetection();

    // Data State
    const [essays, setEssays] = useState<ModelEssay[]>([]);
    const [savedEssays, setSavedEssays] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [filters, setFilters] = useState<{ band_score_min?: number }>({});

    // Active Essay State
    const [activeEssay, setActiveEssay] = useState<ModelEssay | null>(null);
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
    const [showMobileAnalysis, setShowMobileAnalysis] = useState(false);

    // Feature State
    const [vocabModalOpen, setVocabModalOpen] = useState(false);
    const [selectedWord, setSelectedWord] = useState("");

    const ESSAYS_CACHE_KEY = 'band9_essays_cache';

    // Phase 4: Cache-first essay loading
    const fetchEssays = useCallback(async (reset = false, activeFilters = filters) => {
        // If offline, serve from localStorage cache immediately
        if (isOffline) {
            try {
                const raw = localStorage.getItem(ESSAYS_CACHE_KEY);
                if (raw) {
                    const cached: ModelEssay[] = JSON.parse(raw);
                    if (reset) setEssays(cached);
                    setHasMore(false);
                }
            } catch (e) {
                console.warn('[Band9] Failed to load offline cache:', e);
            }
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const currentPage = reset ? 0 : page;
            const limit = 9;

            const libraryPromise = band9LibraryService.getEssays(activeFilters, currentPage, limit);
            const savedPromise = (userId && reset)
                ? band9LibraryService.getSavedEssays(userId)
                : Promise.resolve(null);

            const [libraryData, savedData] = await Promise.all([
                libraryPromise,
                savedPromise
            ]);

            if (libraryData.length < limit) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (reset) {
                setEssays(libraryData);
                setPage(1);
                if (savedData) setSavedEssays(savedData.map(e => e.id));
                // Phase 4: Cache freshly fetched essays for offline use
                try {
                    localStorage.setItem(ESSAYS_CACHE_KEY, JSON.stringify(libraryData.slice(0, 20)));
                } catch (e) {
                    console.warn('[Band9] Failed to cache essays:', e);
                }
            } else {
                setEssays(prev => [...prev, ...libraryData]);
                setPage(prev => prev + 1);
            }

        } catch (e) {
            console.error('Failed to load library:', e);
            toast.error('Failed to load essays. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    }, [isOffline, page, filters, userId]);

    useEffect(() => {
        fetchEssays(true);
    }, []);

    // --- Actions ---

    const handleFilterChange = (newFilters: { band_score_min?: number }) => {
        const updated = { ...filters, ...newFilters };
        setFilters(updated);
        fetchEssays(true, updated);
    };

    // --- Actions ---

    const handleSelectEssay = async (essay: ModelEssay) => {
        setActiveEssay(essay);
        setCurrentView('READER');
        setActiveAnnotationId(null);
        setShowMobileAnalysis(false);

        // Track view
        if (userId) {
            try {
                await band9LibraryService.trackView(userId, essay.id);
            } catch (e) {
                console.warn("Analytics failed", e);
            }
        }
    };

    const handleToggleSave = async (essayId: string) => {
        if (!userId) {
            // Phase 2B: Replace alert() with toast
            toast.warning('Please sign in to save essays.');
            return;
        }

        const isSaved = savedEssays.includes(essayId);
        try {
            if (isSaved) {
                // Optimistic update
                setSavedEssays(prev => prev.filter(id => id !== essayId));
                // API call
                await band9LibraryService.unsaveFromFavorites(userId, essayId);
            } else {
                setSavedEssays(prev => [...prev, essayId]);
                await band9LibraryService.saveToFavorites(userId, essayId);
            }
        } catch (e) {
            console.error("Save toggle failed:", e);
            // Revert on fail
        }
    };

    const handleGenerateNew = async () => {
        setIsLoading(true);
        try {
            // 1. Generate
            const newEssay = await writingGymService.generateModelEssay(); // No topic = random

            // 2. Save to DB for persistence
            // Note: writingGymService now returns full ModelEssay structure

            // 3. Update state
            setEssays(prev => [newEssay, ...prev]);

            // 4. Auto-open
            handleSelectEssay(newEssay);
        } catch (e) {
            console.error("Generation failed:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleWordLongPress = (word: string) => {
        setSelectedWord(word);
        setVocabModalOpen(true);
    };

    const handleSaveVocabulary = (data: { word: string; definition: string }) => {
        console.log("Saved vocab:", data);
        // Integrate with band9LibraryService.saveVocabulary
    };

    // --- Render ---

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100">

            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 md:px-6 py-4 flex items-center justify-between shadow-sm z-20 flex-shrink-0 h-16 gap-4">
                <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                    <Button variant="outline" onClick={() => onNavigate(AppView.ESSAY_DOJO_HUB)} size="sm" className="bg-white hover:bg-slate-50 border-slate-200 shrink-0">
                        <ArrowLeft className="w-5 h-5 md:mr-2" />
                        <span className="hidden md:inline">Back</span>
                    </Button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 shrink-0" />
                    <h1 className="text-lg md:text-xl font-black flex items-center gap-2 truncate">
                        <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">Band 9 Library</span>
                    </h1>
                </div>

                {currentView === 'BROWSER' && (
                    <Button
                        onClick={handleGenerateNew}
                        disabled={isLoading}
                        variant="primary"
                        className="shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 bg-indigo-600 text-white border-none shrink-0"
                    >
                        <Sparkles className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">{isLoading ? 'Writing...' : 'New Essay'}</span>
                        <span className="md:hidden">New</span>
                    </Button>
                )}

                {currentView === 'READER' && (
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] md:text-xs font-bold bg-green-100 text-green-700 px-2 md:px-3 py-1 rounded-full border border-green-200 whitespace-nowrap">
                            BAND {activeEssay?.band_score} MODEL
                        </span>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">

                    {/* BROWSER VIEW */}
                    {currentView === 'BROWSER' && (
                        <motion.div
                            key="browser"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full overflow-y-auto p-6 md:p-8"
                        >
                            <div className="max-w-7xl mx-auto h-full flex flex-col">
                                <EssayBrowser
                                    essays={essays}
                                    savedEssays={savedEssays}
                                    onSelectEssay={handleSelectEssay}
                                    onToggleSave={handleToggleSave}
                                    isLoading={isLoading}
                                    onRefresh={() => fetchEssays(true)}
                                    hasMore={hasMore}
                                    onLoadMore={() => fetchEssays(false)}
                                    onFilterChange={handleFilterChange}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* READER VIEW */}
                    {currentView === 'READER' && activeEssay && (
                        <motion.div
                            key="reader"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="h-full flex flex-col lg:flex-row relative"
                        >
                            {/* Left: Content */}
                            <div className="flex-1 h-full overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar bg-white dark:bg-slate-900 shadow-xl z-10 pb-24">
                                <div className="max-w-3xl mx-auto">
                                    <button
                                        onClick={() => setCurrentView('BROWSER')}
                                        className="mb-8 flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl w-fit"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Library
                                    </button>

                                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-black mb-6 md:mb-8 leading-tight text-slate-800 dark:text-white">
                                        {activeEssay.topic}
                                    </h2>

                                    {/* Task Prompt Box */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl border-l-4 border-indigo-500 mb-8 md:mb-10 text-sm md:text-base italic text-slate-600 dark:text-slate-400">
                                        Tasks like this require you to discuss specific viewpoints and give your opinion. This model answer demonstrates perfect paragraphing and cohesive flow.
                                    </div>

                                    <EssayReader
                                        essay={activeEssay}
                                        activeAnnotationId={activeAnnotationId}
                                        onAnnotationClick={setActiveAnnotationId}
                                        onWordLongPress={handleWordLongPress}
                                    />

                                    <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                                        <p className="text-slate-400 text-sm mb-4">Did you find this essay helpful?</p>
                                        <Button
                                            variant={savedEssays.includes(activeEssay.id) ? 'primary' : 'outline'}
                                            onClick={() => handleToggleSave(activeEssay.id)}
                                        >
                                            <Star className="w-4 h-4 mr-2" fill={savedEssays.includes(activeEssay.id) ? "currentColor" : "none"} />
                                            {savedEssays.includes(activeEssay.id) ? 'Saved to Favorites' : 'Save to Favorites'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Analysis Sidebar (Desktop) */}
                            <div className="hidden lg:block w-96 h-full border-l border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-950 p-6 flex-shrink-0 z-0">
                                <AnnotationPanel
                                    annotations={activeEssay.annotations}
                                    activeAnnotationId={activeAnnotationId}
                                    onSelectAnnotation={setActiveAnnotationId}
                                    onPracticeSkill={(id) => console.log("Nav to skill", id)}
                                />
                            </div>

                            {/* Mobile Analysis Toggle & Sheet */}
                            <div className="lg:hidden fixed bottom-6 right-6 z-50">
                                <Button
                                    onClick={() => setShowMobileAnalysis(!showMobileAnalysis)}
                                    className="rounded-full w-14 h-14 shadow-xl flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <Sparkles className="w-6 h-6" />
                                </Button>
                            </div>

                            <AnimatePresence>
                                {showMobileAnalysis && (
                                    <motion.div
                                        initial={{ y: "100%" }}
                                        animate={{ y: 0 }}
                                        exit={{ y: "100%" }}
                                        className="lg:hidden fixed bottom-0 left-0 right-0 h-[60vh] bg-white dark:bg-slate-900 rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] z-40 flex flex-col border-t border-slate-200 dark:border-slate-800"
                                    >
                                        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
                                            <h3 className="font-bold text-slate-800 dark:text-white">Analysis & Annotations</h3>
                                            <button onClick={() => setShowMobileAnalysis(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                                                <ArrowLeft className="w-5 h-5 rotate-270" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4">
                                            <AnnotationPanel
                                                annotations={activeEssay.annotations}
                                                activeAnnotationId={activeAnnotationId}
                                                onSelectAnnotation={setActiveAnnotationId}
                                                onPracticeSkill={(id) => console.log("Nav to skill", id)}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Phase 4: Offline Banner */}
            <OfflineBanner
                isOffline={isOffline}
                justReconnected={justReconnected}
                offlineMessage="Offline. Showing cached essays."
            />

            {/* Modals */}
            <VocabularyCollector
                isOpen={vocabModalOpen}
                onClose={() => setVocabModalOpen(false)}
                word={selectedWord}
                onSave={handleSaveVocabulary}
            />
        </div>
    );
};

import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, BookOpen, Search, Star, MessageSquare,
    Highlighter, ChevronRight, RefreshCw
} from 'lucide-react';
import React, { useState } from 'react';

import { writingGymService } from '../../services/writingGymService';
import { AppView, ModelEssay } from '../../types';
import { Button } from '../Button';

export const ModelEssayLibrary: React.FC<{ onNavigate: (view: AppView) => void }> = ({ onNavigate }) => {
    const [essay, setEssay] = useState<ModelEssay | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

    const generateEssay = async (topic?: string) => {
        setLoading(true);
        setActiveAnnotationId(null);
        try {
            const data = await writingGymService.generateModelEssay(topic);
            setEssay(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const topics = [
        "Technology in Education",
        "Environmental Protection",
        "Remote Work",
        "Globalization",
        "Social Media"
    ];

    // Helper to render text with highlighted annotations
    const renderContent = () => {
        if (!essay) return null;

        const content = essay.content;
        // This is a simplified highlighter. In a real app, use a proper index-based replacement to handle overlaps.
        // We'll replace occurrences of quotes with spans. 
        // Note: This naive approach fails if quote appears multiple times or overlaps. 
        // For this demo, we assume the AI provides unique enough quotes.

        const parts: { text: string; annotationId?: string }[] = [];

        // Very basic tokenizer for demo purposes
        // Ideally, we'd map string indices. Here we just split by first match.
        // A more robust solution involves sorting annotations by index and slicing the string.
        // Given we don't have indices from AI, we'll try to match exact strings.

        // Let's just create a list of replacements
        const replacements: { start: number, end: number, id: string }[] = [];

        essay.annotations.forEach(anno => {
            const index = content.indexOf(anno.quote);
            if (index !== -1) {
                replacements.push({ start: index, end: index + anno.quote.length, id: anno.id });
            }
        });

        replacements.sort((a, b) => a.start - b.start);

        let lastIndex = 0;
        replacements.forEach(rep => {
            if (rep.start >= lastIndex) {
                // Add text before
                parts.push({ text: content.substring(lastIndex, rep.start) });
                // Add annotated part
                parts.push({ text: content.substring(rep.start, rep.end), annotationId: rep.id });
                lastIndex = rep.end;
            }
        });
        parts.push({ text: content.substring(lastIndex) });

        return (
            <p className="leading-loose text-lg text-slate-700 dark:text-slate-300 font-serif">
                {parts.map((part: any, i: number) => (
                    part.annotationId ? (
                        <span
                            key={i}
                            onClick={() => setActiveAnnotationId(part.annotationId === activeAnnotationId ? null : part.annotationId!)}
                            className={`
                                cursor-pointer px-1 rounded transition-colors duration-200 border-b-2
                                ${activeAnnotationId === part.annotationId
                                    ? 'bg-yellow-200 border-yellow-500 text-slate-900'
                                    : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'}
                            `}
                        >
                            {part.text}
                        </span>
                    ) : (
                        <span key={i}>{part.text}</span>
                    )
                ))}
            </p>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                <Button variant="ghost" onClick={() => onNavigate(AppView.ESSAY_DOJO_HUB)} className="hover:bg-slate-100">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Dojo
                </Button>
                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-indigo-500" /> Band 9 Library
                </h2>
                <div className="w-20"></div> {/* Spacer for centering */}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                    {/* Sidebar: Topic Selection */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Search className="w-4 h-4" /> Browse Topics
                            </h3>
                            <div className="space-y-2">
                                {topics.map(topic => (
                                    <button
                                        key={topic}
                                        onClick={() => generateEssay(topic)}
                                        className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-800 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all flex justify-between items-center group"
                                    >
                                        <span className="truncate">{topic}</span>
                                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 flex-shrink-0" />
                                    </button>
                                ))}
                                <Button onClick={() => generateEssay()} className="mt-4 w-full" disabled={loading}>
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Star className="w-4 h-4 mr-2" />}
                                    {loading ? 'Generating...' : 'Surprise Me'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Essay */}
                    <div className="lg:col-span-9 h-full flex flex-col">
                        {!essay && !loading && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-medium text-lg">Select a topic to study a Band 9 Model Answer.</p>
                                <p className="text-sm mt-2">AI will generate a unique essay and analyze it for you.</p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex flex-col items-center justify-center h-full py-20 gap-6">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
                                <p className="text-indigo-900 font-bold bg-indigo-50 px-4 py-2 rounded-full">Writing Band 9 Essay...</p>
                            </div>
                        )}

                        {essay && !loading && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full overflow-hidden">
                                {/* Essay Text */}
                                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-y-auto max-h-full custom-scrollbar">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black uppercase">Band {essay.band_score}</span>
                                        <span className="text-slate-400 text-sm">Model Answer</span>
                                    </div>
                                    <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-8 leading-tight">
                                        {essay.topic}
                                    </h1>
                                    <div className="prose dark:prose-invert max-w-none pb-12">
                                        {renderContent()}
                                    </div>
                                </div>

                                {/* Annotations Sidebar */}
                                <div className="lg:col-span-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 max-h-full">
                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 sticky top-0 bg-[#F8FAFC] dark:bg-slate-950 py-2 z-10">
                                        <Highlighter className="w-4 h-4 text-indigo-500" /> Analysis
                                    </h3>
                                    <div className="space-y-3 pb-8">
                                        {essay.annotations.map(anno => (
                                            <motion.div
                                                key={anno.id}
                                                initial={{ opacity: 0.8 }}
                                                animate={{
                                                    opacity: activeAnnotationId && activeAnnotationId !== anno.id ? 0.4 : 1,
                                                    scale: activeAnnotationId === anno.id ? 1.02 : 1
                                                }}
                                                onClick={() => setActiveAnnotationId(anno.id)}
                                                className={`
                                                    p-4 rounded-xl border-l-4 cursor-pointer transition-all
                                                    ${activeAnnotationId === anno.id
                                                        ? 'bg-white shadow-md border-indigo-500 ring-2 ring-indigo-100'
                                                        : 'bg-slate-50 border-slate-300 hover:bg-white hover:shadow-sm'}
                                                `}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-bold uppercase bg-slate-200 px-2 py-0.5 rounded text-slate-600">{anno.type}</span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-800 mb-1 line-clamp-2 italic">"{anno.quote}"</p>
                                                <p className="text-sm text-slate-600 leading-snug">{anno.comment}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

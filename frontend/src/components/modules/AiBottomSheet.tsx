import { X, Sparkles, AlertCircle, BookA, Highlighter, BookOpen, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { DefinitionResult, ExplanationResult, generateDefinition, generateExplanation } from '../../services/groq/readingGenerator';
import { consumeToken, getUserTier, type SubscriptionTier } from '../../services/subscriptionService';
import { AppView } from '../../types';
import PaywallSheet from '../PaywallSheet';

interface AiBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    selectedText: string;
    contextText?: string;
    skillContext?: string;
    actionType: 'define' | 'explain' | 'highlight' | null;
    onOpenChat?: () => void;
}

export const AiBottomSheet: React.FC<AiBottomSheetProps> = ({
    isOpen,
    onClose,
    selectedText,
    contextText = '',
    skillContext = '',
    actionType,
    onOpenChat
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [definitionData, setDefinitionData] = useState<DefinitionResult | null>(null);
    const [explanationData, setExplanationData] = useState<ExplanationResult | null>(null);

    const [tier, setTier] = useState<SubscriptionTier | null>(null);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [paywallReason, setPaywallReason] = useState('');

    useEffect(() => {
        let isMounted = true;
        getUserTier().then(t => {
            if (isMounted) setTier(t);
        });
        return () => { isMounted = false; };
    }, []);

    // Reset state when opening/closing or changing text
    useEffect(() => {
        if (!isOpen) return;

        setDefinitionData(null);
        setExplanationData(null);
        setError(null);

        if (!actionType || actionType === 'highlight' || !selectedText) {
            return; // Only define & explain do API calls
        }

        const fetchAiData = async () => {
            setIsLoading(true);

            // Gate 1: Free Tier completely blocked from AI
            if (tier === 'free') {
                setIsLoading(false);
                setPaywallReason('Fitur AI hanya tersedia untuk paket Basic atau C2. Upgrade sekarang!');
                setIsPaywallOpen(true);
                return;
            }

            // Gate 2: Token limit check
            const tokenCheck = await consumeToken('ai_generation', { strict: true });
            if (!tokenCheck.allowed) {
                setIsLoading(false);
                setPaywallReason('Token AI harian habis. Upgrade untuk lebih banyak token!');
                setIsPaywallOpen(true);
                return;
            }

            try {
                // Ensure we pass at least the selected text as context if none provided
                const context = contextText || selectedText;

                if (actionType === 'define') {
                    const data = await generateDefinition(selectedText, context, skillContext);
                    setDefinitionData(data);
                } else if (actionType === 'explain') {
                    const data = await generateExplanation(selectedText, context, skillContext);
                    setExplanationData(data);
                }
            } catch (err: any) {
                console.error("AI Action Error:", err);
                setError(err.message || 'Failed to get a response from Mason AI. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        if (tier !== null) { // wait until tier is loaded
            fetchAiData();
        }
    }, [isOpen, selectedText, actionType, contextText, skillContext, tier]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center pointer-events-none">
            {/* Backdrop (invisible but captures clicks outside) */}
            <div
                className="absolute inset-0 bg-black/5 backdrop-blur-[1px] pointer-events-auto transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div
                className="w-full max-w-md bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pointer-events-auto flex flex-col max-h-[85vh] transition-transform duration-300 translate-y-0"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag Handle Indicator */}
                <div className="w-full h-6 flex items-center justify-center pt-2 pb-1" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                {/* Header: Selected Text Context */}
                <div className="px-6 pb-4 border-b border-slate-100 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-blue-600 font-bold mb-1 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3" />
                            {actionType === 'define' ? 'Defining Context' : 'Explaining Context'}
                        </p>
                        <p className="text-sm font-serif text-slate-800 line-clamp-2 leading-relaxed italic border-l-2 border-slate-200 pl-3">
                            "{selectedText}"
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                            <div className="relative w-12 h-12 mb-4">
                                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                                <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-blue-500 animate-pulse" />
                            </div>
                            <p className="text-sm font-medium animate-pulse">Mason AI is thinking...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3 text-red-800">
                            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                            <p className="text-sm leading-relaxed">{error}</p>
                        </div>
                    ) : actionType === 'define' && definitionData ? (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 font-serif mb-1 capitalize">
                                    {definitionData.word}
                                </h3>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-blue-600 font-medium italic">{definitionData.partOfSpeech}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500 font-mono tracking-tight">{definitionData.phonetic}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative overflow-hidden">
                                <BookA className="w-24 h-24 text-slate-100 absolute -right-4 -bottom-4 -rotate-12" />
                                <div className="relative">
                                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Definition in Context</h4>
                                    <p className="text-slate-800 leading-relaxed">{definitionData.definition}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Example</h4>
                                <p className="text-slate-600 font-serif italic border-l-2 border-blue-300 pl-3 leading-relaxed">
                                    "{definitionData.example}"
                                </p>
                            </div>
                        </div>
                    ) : actionType === 'explain' && explanationData ? (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-start gap-3 mb-1">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                        {explanationData.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Grammar & Mechanics</p>
                                </div>
                            </div>

                            <div className="text-slate-700 leading-relaxed space-y-4">
                                <p>{explanationData.explanation}</p>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 mt-6">
                                <Highlighter className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 mb-1">Key Takeaway</p>
                                    <p className="text-sm text-blue-900 leading-relaxed">{explanationData.keyTakeaway}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Ask AI Deep Dive Prompt */}
                    {!isLoading && !error && (
                        <div className="mt-8 pt-5 border-t border-slate-100">
                            <button
                                onClick={() => {
                                    if (tier === 'free') {
                                        setPaywallReason('Fitur Ask AI hanya tersedia untuk paket Basic atau C2.');
                                        setIsPaywallOpen(true);
                                    } else {
                                        onOpenChat?.();
                                    }
                                }}
                                className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition-colors rounded-xl p-4 group border border-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#0B132B] flex items-center justify-center text-white">
                                        <Sparkles className="w-4 h-4 text-blue-300" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-slate-900">Still confused?</p>
                                        <p className="text-xs text-slate-500">Chat with Ask AI</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Paywall Gate */}
            {isPaywallOpen && (
                <PaywallSheet
                    isOpen={isPaywallOpen}
                    onClose={() => {
                        setIsPaywallOpen(false);
                        onClose(); // Automatically close the bottom sheet too if they decline
                    }}
                    triggeredBy="ai_generation"
                    reason={paywallReason}
                />
            )}
        </div>
    );
};

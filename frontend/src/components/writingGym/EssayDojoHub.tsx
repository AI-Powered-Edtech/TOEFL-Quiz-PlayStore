import {
    ArrowLeft, Swords, BookOpen, PenTool,
    ArrowRight, Star, Target, ShieldCheck, FileEdit, Zap, Lock
} from 'lucide-react';
import React, { useState } from 'react';

import { useSubscription } from '../../hooks/useSubscription';
import { AppView } from '../../types';
import * as analytics from '../../utils/analytics';
import { Button } from '../Button';
import PaywallSheet from '../PaywallSheet';

interface EssayDojoHubProps {
    onNavigate: (view: AppView) => void;
    onBack?: () => void;
    backLabel?: string;
}

export const EssayDojoHub: React.FC<EssayDojoHubProps> = ({ onNavigate, onBack, backLabel = "Back" }) => {
    const { tier, isPaid } = useSubscription();
    const [showPaywall, setShowPaywall] = useState(false);

    return (
        <div className="h-full flex flex-col bg-[#F5F7FA] dark:bg-black font-sans">
            {/* --- Fixed Header --- */}
            <div className="flex-shrink-0 bg-[#F5F7FA] dark:bg-black z-10 px-4 pt-4 pb-2">
                <Button
                    variant="ghost"
                    onClick={onBack || (() => onNavigate(AppView.WRITING_GYM_HUB))}
                    className="mb-2 pl-0 hover:bg-transparent hover:text-indigo-600 text-slate-600 dark:text-slate-400"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {backLabel}
                </Button>

                <div className="flex items-center justify-between pb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Swords className="w-7 h-7 text-indigo-600" />
                            Essay Dojo
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            Master every aspect of IELTS Writing.
                        </p>
                    </div>
                </div>
            </div>

            {/* --- Scrollable Content --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-4 pt-2 space-y-6">

                {/* Hero / Intro */}
                <div className="bg-indigo-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-indigo-200 dark:shadow-none">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="inline-flex items-center gap-1.5 bg-indigo-500/50 border border-indigo-400/30 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider mb-3">
                                    <Target className="w-3 h-3" />
                                    Band 9 Goal
                                </div>
                                <h2 className="text-xl font-bold mb-2">writing excellence</h2>
                                <p className="text-indigo-100 text-sm leading-relaxed max-w-xs">
                                    Simulate the real exam experience with AI scoring, or study expert models to learn the secrets of high-scoring essays.
                                </p>
                            </div>
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                                <PenTool className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Cards Grid */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        Training Modes
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Simulation Card */}
                        <div
                            onClick={() => {
                                if (!isPaid) {
                                    setShowPaywall(true);
                                    return;
                                }
                                analytics.trackEvent({
                                    eventType: 'navigate',
                                    metadata: { destination: 'writing_sim', source: 'essay_dojo_hub' }
                                });
                                onNavigate(AppView.WRITING);
                            }}
                            className={`group bg-white dark:bg-[#1E1E1E] rounded-2xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer ${!isPaid ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-center gap-4 p-4">
                                <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <PenTool className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">IELTS Writing Sim</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                                        Full exam simulation with AI scoring & criteria feedback.
                                    </p>
                                </div>
                                <div className="pr-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                                        {!isPaid ? <Lock className="w-4 h-4 text-slate-400" /> : <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-white transition-colors" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Band 9 Library Card */}
                        <div
                            onClick={() => {
                                analytics.trackEvent({
                                    eventType: 'navigate',
                                    metadata: { destination: 'band9_library', source: 'essay_dojo_hub' }
                                });
                                onNavigate(AppView.BAND9_LIBRARY);
                            }}
                            className="group bg-white dark:bg-[#1E1E1E] rounded-2xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-4 p-4">
                                <div className="w-14 h-14 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <BookOpen className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Band 9 Library</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                                        Study model essays, vocab breakdowns & examiner comments.
                                    </p>
                                </div>
                                <div className="pr-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-amber-600 transition-colors">
                                        <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Peer Review Card */}
                        <div
                            onClick={() => {
                                if (!isPaid) {
                                    setShowPaywall(true);
                                    return;
                                }
                                analytics.trackEvent({
                                    eventType: 'navigate',
                                    metadata: { destination: 'peer_review', source: 'essay_dojo_hub' }
                                });
                                onNavigate(AppView.PEER_REVIEW);
                            }}
                            className={`group bg-white dark:bg-[#1E1E1E] rounded-2xl p-1 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer ${!isPaid ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-center gap-4 p-4">
                                <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                    <FileEdit className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Peer Review</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                                        Get community feedback & help others improve.
                                    </p>
                                </div>
                                <div className="pr-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                                        {!isPaid ? <Lock className="w-4 h-4 text-slate-400" /> : <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-white transition-colors" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info - Horizontal Scroll */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <Star className="w-4 h-4 text-amber-500" />
                        Key Features
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                        <div className="flex-shrink-0 w-40 bg-white dark:bg-[#1E1E1E] p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                            <Target className="w-6 h-6 text-green-500 p-1 bg-green-100 dark:bg-green-900/30 rounded-lg" />
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-xs">Target Scores</h4>
                                <p className="text-[10px] text-slate-500">Optimized for 7.0+</p>
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-40 bg-white dark:bg-[#1E1E1E] p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                            <ShieldCheck className="w-6 h-6 text-blue-500 p-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg" />
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-xs">CEFR Aligned</h4>
                                <p className="text-[10px] text-slate-500">C1/C2 Level Analysis</p>
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-40 bg-white dark:bg-[#1E1E1E] p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                            <Star className="w-6 h-6 text-purple-500 p-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg" />
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-xs">AI Tutor</h4>
                                <p className="text-[10px] text-slate-500">24/7 Feedback</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Paywall */}
            <PaywallSheet
                isOpen={showPaywall}
                onClose={() => setShowPaywall(false)}
                triggeredBy="essay_dojo"
                currentTier={tier}
            />
        </div>
    );
};

import { Lock, ArrowLeft, Play, Trash2, ShieldCheck, Loader2, LogIn, Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useGuestPolicy } from '../hooks/useGuestPolicy';
import { getIncorrectQuestions, getJailStats, clearJail } from '../services/errorJailService';
import { QuizData, AppView } from '../types';

import { Button } from './Button';


interface ErrorJailViewProps {
    onNavigate: (view: AppView) => void;
    onStartReview: (questions: QuizData[]) => void;
}

export const ErrorJailView: React.FC<ErrorJailViewProps> = ({ onNavigate, onStartReview }) => {
    const { user, signInWithGoogle } = useAuth();
    const { isGuest, renderGuestFallback } = useGuestPolicy('error_jail');
    const [jailedQuestions, setJailedQuestions] = useState<QuizData[]>([]);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [selectedSection, setSelectedSection] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch jailed questions when user or section changes
    useEffect(() => {
        const fetchJail = async () => {
            if (!user?.id) {
                setJailedQuestions([]);
                setStats({});
                return;
            }

            setIsLoading(true);
            try {
                const [questions, jailStats] = await Promise.all([
                    getIncorrectQuestions(user.id, selectedSection),
                    getJailStats(user.id)
                ]);
                setJailedQuestions(questions);
                setStats(jailStats);
            } catch (error) {
                console.error('[ErrorJailView] Failed to fetch:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchJail();
    }, [user, selectedSection]);

    const handleClear = async () => {
        if (!user?.id) return;

        if (confirm("Are you sure you want to release all questions without reviewing them?")) {
            try {
                await clearJail(user.id, selectedSection);
                setJailedQuestions([]);
                // Refresh stats
                const newStats = await getJailStats(user.id);
                setStats(newStats);
            } catch (error) {
                console.error('[ErrorJailView] Failed to clear:', error);
                alert('Failed to clear jail. Please try again.');
            }
        }
    };

    const totalJailed: number = (Object.values(stats) as number[]).reduce((sum, count) => sum + count, 0);

    // Guest user view
    if (isGuest) {
        return renderGuestFallback(
            'Error Jail',
            'Error Jail tracks your incorrect answers across devices. Please login to access this feature.',
            () => onNavigate(AppView.DASHBOARD)
        );
    }

    // Clean Record View (Empty State)
    if (!isLoading && totalJailed === 0) {
        return (
            <div className="flex flex-col h-full bg-slate-50">
                <div className="bg-transparent px-4 py-4 flex items-center justify-between shrink-0 z-10">
                    <button
                        onClick={() => onNavigate(AppView.DASHBOARD)}
                        className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-slate-800" />
                    </button>
                    <h1 className="font-bold text-slate-800 text-lg">Error Jail</h1>
                    <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <Clock className="w-6 h-6 text-slate-600" />
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 text-center border-2 border-emerald-50">
                        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
                            <ShieldCheck className="w-12 h-12 text-white fill-emerald-500" />
                        </div>

                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Clean Record</h2>

                        <p className="text-slate-500 mb-8 leading-relaxed">
                            You have no errors pending review.
                            <br />
                            Great job maintaining your streak!
                        </p>

                        <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 inline-flex items-center gap-2">
                            <span className="text-xl">🔥</span>
                            <span className="font-bold text-slate-700">Current Streak: <span className="text-slate-900">12 Days</span></span>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <Button
                        onClick={() => onNavigate(AppView.DASHBOARD)}
                        className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-4 rounded-xl"
                    >
                        Return to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-transparent px-4 py-4 flex items-center justify-between shrink-0 z-10">
                <button
                    onClick={() => onNavigate(AppView.DASHBOARD)}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-800" />
                </button>
                <h1 className="font-bold text-slate-800 text-lg">Error Jail</h1>
                <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <Clock className="w-6 h-6 text-slate-600" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="px-6 pb-6 max-w-2xl mx-auto">

                    {/* Hero Card */}
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2.5rem] shadow-xl shadow-orange-200 p-8 text-center text-white mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-16 -mb-16 pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
                                <Lock className="w-8 h-8 text-white" />
                            </div>

                            <h2 className="text-4xl font-bold mb-2 tracking-tight">
                                {totalJailed} Questions
                            </h2>
                            <p className="text-orange-100 text-sm font-medium tracking-wide uppercase mb-8">
                                Currently Detained
                            </p>

                            <div className="bg-black/20 backdrop-blur-md rounded-full px-6 py-3 text-sm font-medium text-white/90 border border-white/10">
                                Review these mistakes to unlock mastery.
                            </div>
                        </div>
                    </div>

                    {/* Section Filters */}
                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar mb-2">
                        {['all', 'structure', 'written', 'reading', 'listening'].map((section) => {
                            const count = section === 'all' ? totalJailed : (stats[section] || 0);
                            const isSelected = selectedSection === section;
                            const label = section === 'all' ? 'All' : section.charAt(0).toUpperCase() + section.slice(1);

                            return (
                                <button
                                    key={section}
                                    onClick={() => setSelectedSection(section)}
                                    className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${isSelected
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-105'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Area */}
                    <div className="flex gap-4 items-center mb-8 mt-4">
                        <Button
                            onClick={() => onStartReview(jailedQuestions)}
                            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-none shadow-xl shadow-orange-200 rounded-full py-4 text-lg font-bold"
                            disabled={isLoading || jailedQuestions.length === 0}
                        >
                            <Play className="w-5 h-5 mr-2 fill-current" />
                            Start Review
                        </Button>

                        <button
                            onClick={handleClear}
                            className="w-14 h-14 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center justify-center hover:bg-red-100 hover:scale-105 transition-all shadow-sm"
                            title="Clear all"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Detained Items Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Detained Items</h3>
                        <button className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-200 transition-colors">
                            Sort by Date
                        </button>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                    )}

                    {/* Questions List */}
                    {!isLoading && (
                        <div className="space-y-4">
                            {jailedQuestions.map((q, idx) => (
                                <div
                                    key={q.id || idx}
                                    className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex gap-4 items-start group hover:border-orange-200 transition-all cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 font-bold text-sm flex items-center justify-center shrink-0 mt-1">
                                        {(idx + 1).toString().padStart(2, '0')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] tracking-wider font-bold text-slate-400 uppercase">
                                                {q.section}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span className="text-[10px] tracking-wider font-bold text-orange-500 uppercase">
                                                Skill {q.skill_id}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 font-medium leading-relaxed line-clamp-2">
                                            {q.prompt.replace(/\{[A-D]\}/g, '').replace(/\{\/[A-D]\}/g, '')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="h-8" /> {/* Bottom Spacer */}

                </div>
            </div>
        </div>
    );
};

import { motion, AnimatePresence } from 'framer-motion';
import { jsonrepair } from 'jsonrepair';
import {
    ArrowLeft, GitCompare, Lightbulb, Target, TrendingUp,
    ChevronRight, Loader2, Star, AlertCircle
} from 'lucide-react';
import React, { useState } from 'react';

import { callGroq, cleanJson } from '../../services/groq/client';
import { getComparativeAnalysisPrompt } from '../../services/groq/prompts/integratedWritingPrompts';
import { Button } from '../Button';


interface ComparativeAnalysis {
    structure_comparison: {
        user_approach: string;
        model_approach: string;
        key_difference: string;
        tip: string;
    };
    content_coverage: {
        user_points: string[];
        model_points: string[];
        missing_from_user: string[];
        strength: string;
    };
    language_quality: {
        user_highlights: string[];
        model_highlights: string[];
        upgrades: Array<{
            original: string;
            improved: string;
            why: string;
        }>;
    };
    overall_gap_analysis: string;
}

interface ComparativeAnalysisViewProps {
    userEssay: string;
    sampleResponse: string;
    userScore: number;
    onClose: () => void;
}

export const ComparativeAnalysisView: React.FC<ComparativeAnalysisViewProps> = ({
    userEssay,
    sampleResponse,
    userScore,
    onClose
}) => {
    const [analysis, setAnalysis] = useState<ComparativeAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'side-by-side' | 'insights'>('insights');

    const generateAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const prompt = getComparativeAnalysisPrompt(userEssay, sampleResponse, userScore);
            const response = await callGroq([
                { role: 'user', content: prompt }
            ], 0.5, { jsonMode: true });

            const cleaned = cleanJson(response);
            let parsed;
            try {
                parsed = JSON.parse(cleaned);
            } catch {
                parsed = JSON.parse(jsonrepair(cleaned));
            }
            setAnalysis(parsed);
        } catch (e) {
            console.error('Analysis failed:', e);
            setError('Failed to generate analysis. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        generateAnalysis();
    }, []);

    const getScoreStars = (score: number) => (
        <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
                <Star
                    key={i}
                    className={`w-4 h-4 ${i < score ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                />
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                            <GitCompare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-white">Comparative Analysis</h2>
                            <p className="text-xs text-slate-500">Your essay vs Model response</p>
                        </div>
                    </div>
                    <Button variant="ghost" onClick={onClose}>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Close
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex gap-2">
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'insights'
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <Lightbulb className="w-4 h-4 inline mr-1" />
                        AI Insights
                    </button>
                    <button
                        onClick={() => setActiveTab('side-by-side')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'side-by-side'
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <GitCompare className="w-4 h-4 inline mr-1" />
                        Side by Side
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                            <p className="text-slate-500">Analyzing differences...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                            <p className="text-red-500 mb-4">{error}</p>
                            <Button onClick={generateAnalysis}>Try Again</Button>
                        </div>
                    ) : activeTab === 'side-by-side' ? (
                        /* Side by Side View */
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Your Essay</h4>
                                    {getScoreStars(userScore)}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                                    {userEssay}
                                </div>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-emerald-700 dark:text-emerald-300">Model Response</h4>
                                    {getScoreStars(5)}
                                </div>
                                <div className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                                    {sampleResponse}
                                </div>
                            </div>
                        </div>
                    ) : analysis ? (
                        /* AI Insights View */
                        <div className="space-y-6 max-w-2xl mx-auto">
                            {/* Overall Gap */}
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
                                <h3 className="font-bold mb-2 flex items-center gap-2">
                                    <Target className="w-5 h-5" />
                                    Gap Analysis
                                </h3>
                                <p className="text-sm opacity-95">{analysis.overall_gap_analysis}</p>
                            </div>

                            {/* Structure */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                <h4 className="font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-500" />
                                    Structure Comparison
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4 mb-3">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                        <span className="text-xs text-slate-500 font-medium">Your Approach</span>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{analysis.structure_comparison.user_approach}</p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                                        <span className="text-xs text-emerald-600 font-medium">Model Approach</span>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">{analysis.structure_comparison.model_approach}</p>
                                    </div>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                        <Lightbulb className="w-3 h-3" /> Tip
                                    </span>
                                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{analysis.structure_comparison.tip}</p>
                                </div>
                            </div>

                            {/* Language Upgrades */}
                            {analysis.language_quality.upgrades.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-semibold text-slate-800 dark:text-white mb-3">Language Upgrades</h4>
                                    <div className="space-y-3">
                                        {analysis.language_quality.upgrades.slice(0, 3).map((upgrade, i) => (
                                            <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-sm text-red-500 line-through">{upgrade.original}</span>
                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm text-green-600 font-medium">{upgrade.improved}</span>
                                                </div>
                                                <p className="text-xs text-slate-500">{upgrade.why}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Content Coverage */}
                            {analysis.content_coverage.missing_from_user.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-semibold text-slate-800 dark:text-white mb-3">Points You Missed</h4>
                                    <ul className="space-y-2">
                                        {analysis.content_coverage.missing_from_user.map((point, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <span className="text-amber-500 mt-0.5">•</span>
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </motion.div>
        </div>
    );
};

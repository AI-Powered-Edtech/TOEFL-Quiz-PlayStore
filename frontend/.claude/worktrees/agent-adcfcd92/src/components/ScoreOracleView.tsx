import {
    ArrowLeft, TrendingUp, TrendingDown, Minus, Award, Target, BarChart3,
    Sparkles, Lock, ChevronRight, RefreshCw, AlertCircle, CheckCircle2,
    BookOpen, Headphones, PenTool, MessageSquare, Loader2, Trophy
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { oracleService } from '../services/oracleService';
import { supabase } from '../services/supabase';
import { AppView, ScorePrediction, PredictionHistoryItem, OracleRecommendation, AggregatedOracleData } from '../types';

// ================================================================
// Props
// ================================================================
interface ScoreOracleViewProps {
    onNavigate: (view: AppView) => void;
    userId: string;
}

// ================================================================
// Score Card Component
// ================================================================
interface ScoreCardData {
    testType: string;
    score: number | null;
    maxScore: number;
    breakdown: Record<string, number>;
    gradient: string;
    iconBg: string;
    barColor: string;
}

const ScoreCard: React.FC<{ card: ScoreCardData; trend: 'up' | 'down' | 'stable' }> = ({ card, trend }) => {
    const percentage = card.score ? Math.round((card.score / card.maxScore) * 100) : 0;

    const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
    const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            {/* Decorative gradient blob */}
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 -translate-y-1/2 translate-x-1/3 ${card.iconBg}`} />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                        <Award className="w-4 h-4 text-white" />
                    </div>
                    <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                </div>

                {/* Test Type Label */}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{card.testType}</p>

                {/* Score */}
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-black text-slate-800 dark:text-white">
                        {card.score !== null ? (typeof card.score === 'number' && card.maxScore === 9 ? card.score.toFixed(1) : card.score) : '—'}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/{card.maxScore}</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${card.barColor}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                {/* Section chips */}
                <div className="flex flex-wrap gap-1">
                    {Object.entries(card.breakdown).map(([key, val]) => (
                        <span
                            key={key}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                        >
                            {key.charAt(0).toUpperCase()}: {typeof val === 'number' && card.maxScore === 9 ? val.toFixed(1) : val}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ================================================================
// Trend Chart Component (SVG)
// ================================================================
const TrendChart: React.FC<{
    history: PredictionHistoryItem[];
    testType: string;
    maxScore: number;
}> = ({ history, testType, maxScore }) => {
    if (history.length < 2) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Score Progress</h3>
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                    <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-xs font-medium">Need at least 2 data points to show trend</p>
                </div>
            </div>
        );
    }

    const W = 300, H = 120, PAD = 20;
    const scores = history.map(h => h.predicted_score);
    const minS = Math.min(...scores) * 0.95;
    const maxS = Math.max(...scores) * 1.05;
    const rangeS = maxS - minS || 1;

    const points = history.map((h, i) => ({
        x: PAD + (i / (history.length - 1)) * (W - 2 * PAD),
        y: PAD + ((maxS - h.predicted_score) / rangeS) * (H - 2 * PAD),
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${H} L ${points[0].x} ${H} Z`;

    const latest = scores[scores.length - 1];
    const earliest = scores[0];
    const improvement = latest - earliest;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Score Progress</h3>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    {testType}
                </span>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#areaGrad)" />
                <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill="#3B82F6" stroke="white" strokeWidth="1.5" />
                ))}
            </svg>

            {/* Stats row */}
            <div className="flex gap-2 mt-4">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Change</p>
                    <p className={`text-sm font-black ${improvement >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {improvement >= 0 ? '+' : ''}{maxScore === 9 ? improvement.toFixed(1) : Math.round(improvement)}
                    </p>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Current</p>
                    <p className="text-sm font-black text-blue-600">{maxScore === 9 ? latest.toFixed(1) : Math.round(latest)}</p>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Sessions</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{history.length}</p>
                </div>
            </div>
        </div>
    );
};

// ================================================================
// Recommendation Card
// ================================================================
const RecommendationCard: React.FC<{
    rec: OracleRecommendation;
    onNavigate: (view: AppView) => void;
}> = ({ rec, onNavigate }) => {
    const config = {
        weak_skill: { color: 'border-l-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'HIGH', icon: Target },
        practice_more: { color: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'MEDIUM', icon: BarChart3 },
        ready_for_test: { color: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'READY', icon: Trophy },
    }[rec.recommendation_type];

    const Icon = config.icon;

    // Map section to navigation target
    const handleAction = () => {
        if (rec.section === 'writing') onNavigate(AppView.WRITING_GYM_HUB);
        else if (rec.section === 'ielts') onNavigate(AppView.ESSAY_DOJO_HUB);
        else onNavigate(AppView.LEARNING_PATH);
    };

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 border-l-[3px] ${config.color}`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${config.badge}`}>{config.label}</span>
                </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-3 leading-relaxed">{rec.message}</p>
            <button
                onClick={handleAction}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 active:opacity-70"
            >
                Start Practicing <ChevronRight className="w-3 h-3" />
            </button>
        </div>
    );
};

// ================================================================
// Unlock Requirements Card
// ================================================================
const UnlockCard: React.FC<{
    data: AggregatedOracleData;
    onNavigate: (view: AppView) => void;
}> = ({ data, onNavigate }) => {
    const totalQuizzes = data.quizzes.listening.total + data.quizzes.reading.total +
        data.quizzes.structure.total + data.quizzes.written.total;
    const totalEssays = data.essays.total_submissions;
    const quizProgress = Math.min(100, (totalQuizzes / 50) * 100);
    const essayProgress = Math.min(100, (totalEssays / 5) * 100);

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            {/* Locked Icon */}
            <div className="relative mb-6">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-inner">
                    <Lock className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
            </div>

            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Unlock Score Predictions</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 text-center max-w-[260px]">
                Complete these milestones to receive accurate predictions
            </p>

            {/* Requirements Card */}
            <div className="w-full max-w-[320px] bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
                {/* Quizzes */}
                <div className="mb-5">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Complete 50 Quiz Attempts</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{totalQuizzes}/50</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${quizProgress}%` }} />
                    </div>
                    {totalQuizzes < 50 && (
                        <p className="text-[10px] text-blue-500 font-medium mt-1">{50 - totalQuizzes} more needed</p>
                    )}
                </div>

                {/* Essays */}
                <div className="mb-5">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                            <PenTool className="w-4 h-4 text-purple-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Submit 5 Writing Essays</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{totalEssays}/5</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${essayProgress}%` }} />
                    </div>
                    {totalEssays < 5 && (
                        <p className="text-[10px] text-purple-500 font-medium mt-1">{5 - totalEssays} more needed</p>
                    )}
                </div>

                <button
                    onClick={() => onNavigate(AppView.PRACTICE_HUB)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    Start Practicing
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <p className="text-[10px] text-slate-400 mt-4 text-center max-w-[240px]">
                Predictions become more accurate with more practice data
            </p>
        </div>
    );
};

// ================================================================
// Confidence Badge
// ================================================================
const ConfidenceBadge: React.FC<{ level: 'low' | 'medium' | 'high'; dataPoints: number }> = ({ level, dataPoints }) => {
    const config = {
        low: { icon: AlertCircle, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-400', label: 'Low Confidence' },
        medium: { icon: BarChart3, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', dot: 'bg-blue-400', label: 'Medium Confidence' },
        high: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-400', label: 'High Confidence' },
    }[level];

    const Icon = config.icon;

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${config.color}`}>
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                    <span className="text-xs font-bold">{config.label}</span>
                </div>
                <p className="text-[10px] opacity-80">Based on {dataPoints} activities</p>
            </div>
        </div>
    );
};

// ================================================================
// Main View
// ================================================================
export const ScoreOracleView: React.FC<ScoreOracleViewProps> = ({ onNavigate, userId }) => {
    const [prediction, setPrediction] = useState<ScorePrediction | null>(null);
    const [aggregated, setAggregated] = useState<AggregatedOracleData | null>(null);
    const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
    const [recommendations, setRecommendations] = useState<OracleRecommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTest, setSelectedTest] = useState<'toefl_pbt' | 'toefl_ibt' | 'toefl_itp' | 'ielts'>('toefl_ibt');
    const [cefrResult, setCefrResult] = useState<any>(null);

    const loadData = useCallback(async (retryCount = 0) => {
        try {
            // Wait for auth initialization (token refresh + lock release) before querying
            if (userId !== 'guest' && /^[0-9a-f]{8}-/i.test(userId)) {
                await supabase.auth.initialize();
            }

            const aggData = await oracleService.getAggregatedData(userId);
            setAggregated(aggData);

            // Always calculate predictions, even with 0 data (will show 0 scores)
            const pred = await oracleService.recalculatePrediction(userId);
            setPrediction(pred);

            const hist = await oracleService.getHistory(userId, selectedTest);
            setHistory(hist);

            const recs = await oracleService.getRecommendations(userId);
            setRecommendations(recs);

            // Fetch latest CEFR result (independent from other scores)
            try {
                const { data: cefrData } = await supabase
                    .from('cefr_results')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                setCefrResult(cefrData);
            } catch { setCefrResult(null); }

            setError(null);
        } catch (e: any) {
            console.error('Failed to load oracle data:', e);

            // One retry as safety net for transient network issues
            if (retryCount < 1) {
                console.log('[ScoreOracle] Retrying in 2s...');
                await new Promise(r => setTimeout(r, 2000));
                return loadData(retryCount + 1);
            }

            setError(e.message || 'Failed to analyze progress. Please check your connection.');
        } finally {
            setLoading(false);
        }
    }, [userId, selectedTest]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        setError(null);
        await loadData();
        setRefreshing(false);
    };

    // Navigate to history for selected test
    useEffect(() => {
        if (prediction) {
            oracleService.getHistory(userId, selectedTest).then(setHistory);
        }
    }, [selectedTest, userId, prediction]);

    // Calculate trends
    const getTrend = (testType: 'toefl_pbt' | 'toefl_ibt' | 'toefl_itp' | 'ielts'): 'up' | 'down' | 'stable' => {
        if (history.length < 2) return 'stable';
        const filtered = history.filter(h => h.test_type === testType);
        if (filtered.length < 2) return 'stable';
        const last = filtered[filtered.length - 1].predicted_score;
        const prev = filtered[filtered.length - 2].predicted_score;
        if (last > prev) return 'up';
        if (last < prev) return 'down';
        return 'stable';
    };

    // Score cards config
    const scoreCards: ScoreCardData[] = useMemo(() => {
        if (!prediction) return [];
        return [
            {
                testType: 'TOEFL PBT',
                score: prediction.toefl_pbt_score,
                maxScore: 677,
                breakdown: prediction.toefl_pbt_breakdown || {},
                gradient: 'from-blue-500 to-blue-600',
                iconBg: 'bg-blue-500',
                barColor: 'bg-blue-500',
            },
            {
                testType: 'TOEFL IBT',
                score: prediction.toefl_ibt_score,
                maxScore: 120,
                breakdown: prediction.toefl_ibt_breakdown || {},
                gradient: 'from-cyan-500 to-cyan-600',
                iconBg: 'bg-cyan-500',
                barColor: 'bg-cyan-500',
            },
            {
                testType: 'TOEFL ITP',
                score: prediction.toefl_itp_score,
                maxScore: 677,
                breakdown: prediction.toefl_itp_breakdown || {},
                gradient: 'from-violet-500 to-violet-600',
                iconBg: 'bg-violet-500',
                barColor: 'bg-violet-500',
            },
            {
                testType: 'IELTS',
                score: prediction.ielts_score,
                maxScore: 9,
                breakdown: prediction.ielts_breakdown || {},
                gradient: 'from-emerald-500 to-emerald-600',
                iconBg: 'bg-emerald-500',
                barColor: 'bg-emerald-500',
            },
        ];
    }, [prediction]);

    const testTypeMaxScore: Record<string, number> = {
        toefl_pbt: 677, toefl_ibt: 120, toefl_itp: 677, ielts: 9,
    };

    // ============ LOADING STATE ============
    if (loading) {
        return (
            <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
                <div className="flex-shrink-0 bg-[#2563EB] z-10 px-5 py-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate(AppView.MORE_HUB)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Score Oracle</h1>
                            <p className="text-blue-100 text-xs font-medium opacity-80">Predict Your Test Scores</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-sm text-slate-500 font-medium">Analyzing your progress...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
                <div className="flex-shrink-0 bg-[#2563EB] z-10 px-5 py-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate(AppView.MORE_HUB)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Score Oracle</h1>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-red-100 dark:border-red-900/30 w-full max-w-sm text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Analysis Failed</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all text-sm"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ============ MAIN RENDER ============
    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="flex-shrink-0 bg-[#2563EB] z-10">
                <div className="px-5 pt-6 pb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate(AppView.MORE_HUB)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                Score Oracle
                                <Sparkles className="w-5 h-5 text-amber-300" />
                            </h1>
                            <p className="text-blue-100 text-xs font-medium opacity-80">Predict Your Test Scores</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white active:scale-95 transition-all"
                        >
                            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Gradient extension */}
            <div
                className="relative z-0 px-5 pb-16 -mt-1 overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)' }}
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-28 -mt-14 relative z-10">
                <div className="px-5">
                    {prediction ? (
                        <>
                            {/* Confidence Badge */}
                            <div className="mb-5">
                                <ConfidenceBadge level={prediction.confidence_level} dataPoints={prediction.data_points} />
                            </div>

                            {/* Score Cards Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {scoreCards.map(card => (
                                    <ScoreCard key={card.testType} card={card} trend={getTrend(card.testType.toLowerCase().replace(' ', '_') as any)} />
                                ))}
                            </div>

                            {/* Test Type Tabs for Chart */}
                            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                                {(['toefl_ibt', 'toefl_pbt', 'toefl_itp', 'ielts'] as const).map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedTest(t)}
                                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${selectedTest === t
                                            ? 'bg-blue-500 text-white shadow-sm'
                                            : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800'
                                            }`}
                                    >
                                        {t.toUpperCase().replace('_', ' ')}
                                    </button>
                                ))}
                            </div>

                            {/* Trend Chart */}
                            <div className="mb-6">
                                <TrendChart history={history} testType={selectedTest.toUpperCase().replace('_', ' ')} maxScore={testTypeMaxScore[selectedTest]} />
                            </div>

                            {/* Recommendations */}
                            {recommendations.length > 0 && (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Recommendations</span>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {recommendations.map(rec => (
                                            <RecommendationCard key={rec.id} rec={rec} onNavigate={onNavigate} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-8 h-8 mb-3 animate-spin opacity-40" />
                            <p className="text-sm font-medium">Calculating predictions...</p>
                        </div>
                    )}

                    {/* CEFR Card — Independent from TOEFL/IELTS */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Award className="w-4 h-4 text-teal-500" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">CEFR Level</span>
                        </div>
                        {cefrResult ? (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-15 -translate-y-1/2 translate-x-1/3 bg-teal-400" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
                                                <span className="text-xl font-black text-white">{cefrResult.cefr_level}</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase">Overall Score</p>
                                                <p className="text-2xl font-black text-slate-800 dark:text-white">{cefrResult.overall_score}<span className="text-sm text-slate-400 font-bold">/100</span></p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                                        <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all" style={{ width: `${cefrResult.overall_score}%` }} />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { label: 'Reading', score: cefrResult.reading_score, icon: BookOpen, color: 'text-blue-600 bg-blue-50' },
                                            { label: 'Listening', score: cefrResult.listening_score, icon: Headphones, color: 'text-purple-600 bg-purple-50' },
                                            { label: 'Writing', score: cefrResult.writing_score, icon: PenTool, color: 'text-amber-600 bg-amber-50' },
                                            { label: 'Speaking', score: cefrResult.speaking_score, icon: MessageSquare, color: 'text-rose-600 bg-rose-50' },
                                        ].map(s => (
                                            <div key={s.label} className="text-center">
                                                <div className={`w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center ${s.color}`}>
                                                    <s.icon className="w-4 h-4" />
                                                </div>
                                                <p className="text-lg font-black text-slate-800 dark:text-white">{s.score}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-3 text-center">Taken {new Date(cefrResult.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                                    <Award className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Take a CEFR assessment to see your level</p>
                                <button
                                    onClick={() => onNavigate(AppView.CEFR_SIMULATION)}
                                    className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-teal-500/20 active:scale-95 transition-transform"
                                >
                                    Take CEFR Test
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

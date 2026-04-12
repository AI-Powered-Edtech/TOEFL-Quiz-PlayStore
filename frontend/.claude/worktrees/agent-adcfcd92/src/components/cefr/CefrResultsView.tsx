import React from 'react';
import { ArrowLeft, Share2, Trophy, BookOpen, PenTool, Headphones, Mic, RotateCcw, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { AppView } from '../../types';
import { getCefrLevelInfo, type CefrTestResults } from '../../utils/cefrScoringUtils';

interface CefrResultsViewProps {
    results: CefrTestResults;
    isPartial: boolean;
    onNavigate: (view: AppView) => void;
    onRetake: () => void;
}

const SKILL_CONFIG = [
    { key: 'readingScore' as const, label: 'Reading', icon: BookOpen, color: '#3B82F6', bgColor: 'bg-blue-50', textColor: 'text-blue-600', barColor: 'bg-blue-500' },
    { key: 'writingScore' as const, label: 'Writing', icon: PenTool, color: '#10B981', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', barColor: 'bg-emerald-500' },
    { key: 'listeningScore' as const, label: 'Listening', icon: Headphones, color: '#F59E0B', bgColor: 'bg-amber-50', textColor: 'text-amber-600', barColor: 'bg-amber-500' },
    { key: 'speakingScore' as const, label: 'Speaking', icon: Mic, color: '#EF4444', bgColor: 'bg-red-50', textColor: 'text-red-600', barColor: 'bg-red-500' },
];

// Custom label component for radar chart axes
const CustomPolarLabel = ({ payload, x, y, cx, cy, ...rest }: any) => {
    const skill = SKILL_CONFIG.find(s => s.label === payload.value);
    const score = rest.viewBox ? null : null;
    // Offset label outward from center
    const dx = x > cx ? 8 : x < cx ? -8 : 0;
    const dy = y > cy ? 14 : y < cy ? -8 : 0;

    return (
        <text x={x + dx} y={y + dy} textAnchor="middle" fill="#4B5563" fontSize={12} fontWeight={600}>
            {payload.value}
        </text>
    );
};

export const CefrResultsView: React.FC<CefrResultsViewProps> = ({
    results,
    isPartial,
    onNavigate,
    onRetake,
}) => {
    const levelInfo = getCefrLevelInfo(results.overallScore);
    const isPassed = results.overallScore >= 41; // B1+

    const chartData = isPartial
        ? [
            { subject: 'Reading', score: results.readingScore, fullMark: 100 },
            { subject: 'Writing', score: results.writingScore, fullMark: 100 },
        ]
        : [
            { subject: 'Reading', score: results.readingScore, fullMark: 100 },
            { subject: 'Writing', score: results.writingScore, fullMark: 100 },
            { subject: 'Listening', score: results.listeningScore ?? 0, fullMark: 100 },
            { subject: 'Speaking', score: results.speakingScore ?? 0, fullMark: 100 },
        ];

    const handleShare = async () => {
        const shareText = `🏆 CEFR Level: ${levelInfo.level} (${levelInfo.name})\n📊 Score: ${results.overallScore}/100\n\n📖 Reading: ${results.readingScore}/100\n✍️ Writing: ${results.writingScore}/100${!isPartial ? `\n🎧 Listening: ${results.listeningScore}/100\n🎤 Speaking: ${results.speakingScore}/100` : ''}\n\nTested on TOEFLQuiz App`;

        if (navigator.share) {
            try {
                await navigator.share({ title: `CEFR ${levelInfo.level} — ${levelInfo.name}`, text: shareText });
            } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(shareText);
        }
    };

    return (
        <div className="min-h-full bg-[#f0f4ff] flex flex-col pt-[max(env(safe-area-inset-top),8px)] pb-[max(env(safe-area-inset-bottom),24px)]">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => onNavigate(AppView.PRACTICE_HUB)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur border border-slate-200/50 text-slate-600 touch-manipulation active:scale-95 transition-transform"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold text-slate-800">Test Results</h1>
                <button
                    onClick={handleShare}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur border border-slate-200/50 text-slate-600 touch-manipulation active:scale-95 transition-transform"
                >
                    <Share2 className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5 custom-scrollbar">
                {/* Hero Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center text-center pt-4"
                >
                    {/* Trophy */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-4 shadow-inner">
                        <Trophy className="w-10 h-10 text-blue-500" />
                    </div>

                    {/* Pass badge */}
                    <span className={`text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3 ${isPassed
                            ? 'bg-green-100 text-green-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                        {isPassed ? '✓ Passed' : 'Completed'}
                    </span>

                    {/* CEFR Level */}
                    <motion.h2
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="text-[4rem] font-black leading-none mb-1 bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                    >
                        {levelInfo.level}
                    </motion.h2>
                    <p className="text-lg font-bold text-slate-800 mb-1">{levelInfo.name}</p>
                    <p className="text-sm text-slate-500 max-w-[280px] leading-relaxed">
                        {levelInfo.description}
                    </p>
                </motion.div>

                {/* Performance Map */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-slate-800">Performance Map</h3>
                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            Total: {results.overallScore}/100
                        </span>
                    </div>

                    <div className="w-full h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                                <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={({ payload, x, y, cx, cy }: any) => {
                                        const item = chartData.find(d => d.subject === payload.value);
                                        const skillCfg = SKILL_CONFIG.find(s => s.label === payload.value);
                                        const dx = x > cx ? 10 : x < cx ? -10 : 0;
                                        const dy = y > cy ? 16 : y < cy ? -6 : 0;
                                        return (
                                            <g>
                                                <text x={x + dx} y={y + dy} textAnchor="middle" fill="#64748B" fontSize={12} fontWeight={600}>
                                                    {payload.value}
                                                </text>
                                                <text x={x + dx} y={y + dy + 14} textAnchor="middle" fill={skillCfg?.color || '#3B82F6'} fontSize={11} fontWeight={700}>
                                                    {item?.score}%
                                                </text>
                                            </g>
                                        );
                                    }}
                                />
                                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Score"
                                    dataKey="score"
                                    stroke="#6366F1"
                                    fill="#818CF8"
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Skills Breakdown */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.5 }}
                    className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
                >
                    <h3 className="text-base font-bold text-slate-800 mb-4">Skills Breakdown</h3>
                    <div className="space-y-4">
                        {SKILL_CONFIG.map((skill, i) => {
                            const score = results[skill.key];
                            const isLocked = isPartial && (skill.key === 'listeningScore' || skill.key === 'speakingScore');

                            return (
                                <motion.div
                                    key={skill.key}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className={`w-9 h-9 rounded-xl ${skill.bgColor} flex items-center justify-center shrink-0`}>
                                        <skill.icon className={`w-4.5 h-4.5 ${skill.textColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-semibold text-slate-700">{skill.label}</span>
                                            {isLocked ? (
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Lock className="w-3 h-3" /> Upgrade
                                                </span>
                                            ) : (
                                                <span className="text-sm font-bold text-slate-800">{score}/100</span>
                                            )}
                                        </div>
                                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            {isLocked ? (
                                                <div className="h-full w-full bg-slate-50 rounded-full" />
                                            ) : (
                                                <motion.div
                                                    className={`h-full ${skill.barColor} rounded-full`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${score ?? 0}%` }}
                                                    transition={{ delay: 0.7 + i * 0.15, duration: 0.8, ease: 'easeOut' }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Feedback Section */}
                {results.feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
                    >
                        <h3 className="text-base font-bold text-slate-800 mb-3">AI Feedback</h3>
                        <div className="space-y-3">
                            {SKILL_CONFIG.map((skill) => {
                                const feedbackKey = skill.label.toLowerCase() as keyof typeof results.feedback;
                                const text = results.feedback[feedbackKey];
                                const isLocked = isPartial && (skill.key === 'listeningScore' || skill.key === 'speakingScore');

                                if (isLocked || !text) return null;

                                return (
                                    <div key={skill.key} className="flex gap-3">
                                        <div className={`w-7 h-7 rounded-lg ${skill.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
                                            <skill.icon className={`w-3.5 h-3.5 ${skill.textColor}`} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-600 mb-0.5">{skill.label}</p>
                                            <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className="space-y-3 pt-2"
                >
                    <button
                        onClick={onRetake}
                        className="w-full h-13 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform touch-manipulation"
                    >
                        <RotateCcw className="w-5 h-5" /> Retake Test
                    </button>
                    <button
                        onClick={() => onNavigate(AppView.PRACTICE_HUB)}
                        className="w-full h-12 bg-white text-slate-600 rounded-2xl font-semibold text-sm border border-slate-200 active:scale-[0.98] transition-transform touch-manipulation"
                    >
                        Back to Practice Hub
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

import React from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeft, AlertTriangle, BarChart3, Thermometer,
    GitCommit, Globe, CheckCircle, MessageSquare, Edit3, Bot, Users, Zap, Send, Award
} from 'lucide-react';
import { Button } from '../../Button';
import { IELTSWritingTask, IELTSAssessment, ChatMessage } from '../../../types';
import { TaskType, FeedbackTabType } from './types';
import { TutorChat } from './TutorChat';

interface SimFeedbackViewProps {
    assessment: IELTSAssessment;
    task: IELTSWritingTask | null;
    taskType: TaskType;
    feedbackTab: FeedbackTabType;
    chatHistory: ChatMessage[];
    chatInput: string;
    isChatLoading: boolean;
    chatEndRef: React.RefObject<HTMLDivElement | null>;
    wordCount: number;
    setFeedbackTab: (tab: FeedbackTabType) => void;
    setChatInput: (input: string) => void;
    handleChatSubmit: (e?: React.FormEvent) => void;
    onBackToMenu: () => void;
    onStartNew: () => void;
    onRevise: () => void;
    onSubmitToPeerReview: () => void;
}

const getCEFRColor = (level: string | undefined) => {
    if (!level) return 'text-slate-800 dark:text-slate-200';
    switch (level) {
        case 'C2': return 'text-amber-600 bg-amber-50 font-bold';
        case 'C1': return 'text-purple-600 bg-purple-50 font-bold';
        case 'B2': return 'text-blue-600 bg-blue-50';
        default: return 'text-slate-700 dark:text-slate-300';
    }
};

export const SimFeedbackView: React.FC<SimFeedbackViewProps> = ({
    assessment, task, taskType, feedbackTab, chatHistory, chatInput, isChatLoading, chatEndRef, wordCount,
    setFeedbackTab, setChatInput, handleChatSubmit, onBackToMenu, onStartNew, onRevise, onSubmitToPeerReview
}) => {
    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden relative">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20">
                {/* Header */}
                <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <button onClick={onBackToMenu} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" aria-label="Go back to task selection">
                        <ArrowLeft className="w-5 h-5 text-slate-800 dark:text-white" />
                    </button>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white absolute left-1/2 -translate-x-1/2">
                        Assessment Report
                    </h1>
                    {/* Placeholder for Share Icon */}
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <Globe className="w-5 h-5 text-slate-800 dark:text-white" />
                    </button>
                </div>

                {/* Circular Score & Motivational Text */}
                <div className="flex flex-col items-center py-6">
                    <div className="relative mb-3">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center border-[6px] border-blue-600 text-3xl font-black text-slate-900 dark:text-white">
                            <div className="absolute inset-0 border-[6px] border-blue-100 dark:border-blue-900/30 rounded-full -z-10" />
                            <div className="flex flex-col items-center justify-center leading-none">
                                <span>{assessment.band_score}</span>
                                <span className="text-[10px] font-bold text-slate-500 mt-0.5 tracking-wider">BAND</span>
                            </div>
                        </div>
                    </div>

                    {/* Trending Badge (Placeholder for logic) */}
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full mb-2 flex items-center gap-1">
                        <ArrowLeft className="w-3 h-3 rotate-45" /> +0.5 from last
                    </div>

                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Great job! You're reaching {assessment.band_score >= 8.0 ? 'C2 Mastery' : assessment.band_score >= 7.0 ? 'C1 Advanced' : assessment.band_score >= 5.5 ? 'B2 Upper Intermediate' : 'B1 Intermediate'} level.
                    </p>
                </div>

                {/* Tabs Underline Navigation */}
                <div className="flex overflow-x-auto custom-scrollbar border-t border-slate-100 dark:border-slate-800" role="tablist" aria-label="Feedback sections">
                    {[
                        { id: 'score', label: 'Overview' },
                        { id: 'grammar', label: 'Grammar' },
                        { id: 'vocab', label: 'Vocabulary' },
                        { id: 'heatmap', label: 'Heatmap' },
                        { id: 'flow', label: 'Structure' },
                        { id: 'issues', label: 'Indoglish' },
                        { id: 'tutor', label: 'AI Tutor' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFeedbackTab(tab.id as FeedbackTabType)}
                            role="tab"
                            aria-selected={feedbackTab === tab.id}
                            aria-label={`${tab.label} feedback tab`}
                            className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${feedbackTab === tab.id
                                ? 'text-blue-600 border-blue-600'
                                : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-safe">
                <div className="max-w-3xl mx-auto w-full flex flex-col pb-32">

                    {/* SCORE TAB */}
                    {feedbackTab === 'score' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Task Response Card */}
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                            <GitCommit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                                            {assessment.breakdown?.task_response?.toFixed(1) ?? '0.0'}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Task Response</h3>
                                    <p className="text-xs text-slate-500 mt-1">Addressed all parts</p>
                                </div>

                                {/* Coherence Card */}
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                            <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                                            {assessment.breakdown?.coherence_cohesion?.toFixed(1) ?? '0.0'}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Coherence</h3>
                                    <p className="text-xs text-slate-500 mt-1">Logical flow</p>
                                </div>

                                {/* Lexical Resource Card */}
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                            <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                                            {assessment.breakdown?.lexical_resource?.toFixed(1) ?? '0.0'}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Lexical Resource</h3>
                                    <p className="text-xs text-slate-500 mt-1">Varied vocabulary</p>
                                </div>

                                {/* Grammar Card */}
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                                            {assessment.breakdown?.grammatical_range?.toFixed(1) ?? '0.0'}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">Grammar</h3>
                                    <p className="text-xs text-slate-500 mt-1">Accurate structures</p>
                                </div>
                            </div>

                            {/* Examiner Feedback */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 mt-6 overflow-hidden relative">
                                <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg"><MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div> Examiner Feedback
                                </h3>

                                <div className="border-l-4 border-green-500 pl-4 py-1 mb-4">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Feedback</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {assessment.feedback}
                                    </p>
                                </div>

                                {assessment.confidence !== undefined && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                                        <span>AI Confidence Score</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{Math.round(assessment.confidence * 100)}%</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* GRAMMAR TAB */}
                    {feedbackTab === 'grammar' && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                                    <AlertTriangle className="w-5 h-5 text-indigo-500" /> Structural Grammar Errors
                                </h3>

                                {(!assessment.grammar_errors || assessment.grammar_errors.length === 0) ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-green-500" />
                                        </div>
                                        <p className="font-bold text-slate-700 dark:text-slate-300">Excellent grammar!</p>
                                        <p className="text-slate-500 text-sm">No major structural errors detected.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {assessment.grammar_errors.map((error, i) => (
                                            <div key={i} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700 relative overflow-hidden">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${error.severity === 'high' ? 'bg-red-500' :
                                                    error.severity === 'medium' ? 'bg-amber-500' : 'bg-indigo-400'
                                                    }`} />
                                                <div className="flex justify-between items-start mb-2 pl-3">
                                                    <div>
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                            {error.category} &rsaquo; {error.subcategory}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${error.severity === 'high' ? 'bg-red-100 text-red-700' :
                                                        error.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                                                        }`}>
                                                        {error.severity} impact
                                                    </span>
                                                </div>
                                                <div className="pl-3 mt-3">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="flex-1 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3 relative">
                                                            <span className="text-[10px] absolute -top-2 left-2 bg-white dark:bg-slate-800 text-red-500 font-bold px-1 rounded">Original</span>
                                                            <p className="text-sm font-mono text-red-700 dark:text-red-400 line-through mt-1">{error.fragment}</p>
                                                        </div>
                                                        <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0" />
                                                        <div className="flex-1 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg p-3 relative">
                                                            <span className="text-[10px] absolute -top-2 left-2 bg-white dark:bg-slate-800 text-green-600 font-bold px-1 rounded">Correction</span>
                                                            <p className="text-sm font-mono text-green-700 dark:text-green-400 mt-1">{error.correction}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                                                        <span className="font-bold block mb-1">Rule: {error.rule}</span>
                                                        {error.explanation}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VOCABULARY TAB */}
                    {feedbackTab === 'vocab' && (
                        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Zap className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Smart Flashcards (SRS)</h3>
                                    <p className="text-sm text-slate-500">Based on your essay analysis</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(assessment.vocabulary_srs || []).map((card, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`p-6 rounded-2xl border-l-4 shadow-sm bg-white dark:bg-slate-900 ${card.type === 'strength' ? 'border-green-500' : 'border-indigo-500'}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="text-lg font-black text-slate-800 dark:text-white">{card.word}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${card.type === 'strength' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {card.type === 'strength' ? 'Good' : 'Tip'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-snug">{card.definition}</p>
                                        <div className="text-sm italic text-slate-700 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                            "{card.example}"
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* HEATMAP TAB */}
                    {feedbackTab === 'heatmap' && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Thermometer className="w-5 h-5 text-indigo-500" /> Lexical Density
                                    </h3>
                                    <div className="flex gap-2 text-xs font-bold">
                                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded">B2 (Upper Int)</span>
                                        <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded">C1 (Advanced)</span>
                                        <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded">C2 (Mastery)</span>
                                    </div>
                                </div>

                                <div className="leading-loose text-lg font-serif">
                                    {assessment.lexical_heatmap?.map((token, i) => (
                                        <React.Fragment key={i}>
                                            <span
                                                className={`
                                                    px-0.5 rounded transition-colors
                                                    ${getCEFRColor(token.l)}
                                                    ${token.r ? 'underline decoration-red-400 decoration-wavy' : ''}
                                                `}
                                                title={`Level: ${token.l || 'Basic'} ${token.r ? '| Repetitive' : ''}`}
                                            >
                                                {token.t}
                                            </span>
                                            {" "}
                                        </React.Fragment>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                                    * Wavy red underline indicates repetition. Colors indicate advanced vocabulary usage.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FLOW MAP TAB */}
                    {feedbackTab === 'flow' && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-8">
                                    <GitCommit className="w-5 h-5 text-indigo-500" /> Argument Flow
                                </h3>

                                <div className="relative pl-8 border-l-2 border-indigo-100 dark:border-slate-800 space-y-8">
                                    {assessment.coherence_flow?.map((node, i) => (
                                        <div key={i} className="relative">
                                            <div className={`absolute -left-[41px] w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center ${node.type === 'thesis' ? 'bg-indigo-600' :
                                                node.type === 'conclusion' ? 'bg-slate-800' :
                                                    node.quality === 'weak' ? 'bg-amber-500' : 'bg-indigo-300'
                                                }`} />

                                            <div className={`p-4 rounded-xl border ${node.quality === 'weak'
                                                ? 'bg-amber-50 border-amber-200'
                                                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                                                }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">{node.type}</span>
                                                    {node.quality === 'weak' && (
                                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Needs Link</span>
                                                    )}
                                                </div>
                                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">"{node.snippet}..."</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ISSUES TAB (INDOGLISH) */}
                    {feedbackTab === 'issues' && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                                    <Globe className="w-5 h-5 text-indigo-500" /> Indoglish & Phrasing Check
                                </h3>

                                {(!assessment.indoglish_analysis || assessment.indoglish_analysis.length === 0) ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-green-500" />
                                        </div>
                                        <p className="font-bold text-slate-700 dark:text-slate-300">No major L1 interference detected!</p>
                                        <p className="text-slate-500 text-sm">Your phrasing sounds natural.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {assessment.indoglish_analysis.map((issue, i) => (
                                            <div key={i} className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-800/30">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                                                    <div>
                                                        <p className="text-sm text-slate-500 line-through mb-1">{issue.fragment}</p>
                                                        <p className="text-lg font-bold text-slate-800 dark:text-white mb-2">{issue.correction}</p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-xl border border-amber-100 dark:border-slate-700">
                                                            {issue.explanation}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TUTOR TAB (CHAT) */}
                    {feedbackTab === 'tutor' && (
                        <TutorChat
                            chatHistory={chatHistory}
                            chatInput={chatInput}
                            isChatLoading={isChatLoading}
                            chatEndRef={chatEndRef}
                            setChatInput={setChatInput}
                            handleChatSubmit={handleChatSubmit}
                        />
                    )}

                    <div className="hidden">
                        <Button size="lg" onClick={onStartNew} className="shadow-xl shadow-indigo-200">
                            Start New Essay
                        </Button>
                        <Button size="lg" variant="secondary" onClick={onRevise} className="shadow-lg">
                            <Edit3 className="w-4 h-4 mr-2" /> Revise & Improve
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={onSubmitToPeerReview}
                            disabled={wordCount < 150}
                            className="shadow-lg border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950"
                        >
                            <Users className="w-4 h-4 mr-2" /> Get Peer Feedback
                        </Button>
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 flex gap-3 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <button
                    onClick={onRevise}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-bold flex items-center justify-center transition-colors"
                >
                    Revise
                </button>
                <button
                    onClick={onStartNew}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <span className="text-xl leading-none font-normal">+</span> New Task
                </button>
            </div>
        </div>
    );
};

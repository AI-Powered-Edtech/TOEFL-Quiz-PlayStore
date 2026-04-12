
import { Sparkles } from 'lucide-react';
import React from 'react';

import { EssaySubmission } from '../../types';

export const FeedbackCard = ({ feedback }: { feedback: EssaySubmission['ai_feedback'] }) => {
    if (!feedback) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-8">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold font-serif flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    AI Evaluation
                </h3>
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-bold">
                        Score: {feedback.overall_score}/5
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Linguistic Range</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{feedback.linguistic_range}%</div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${feedback.linguistic_range}%` }} />
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Coherence</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{feedback.coherence}%</div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${feedback.coherence}%` }} />
                    </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Task Response</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{feedback.task_response}%</div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${feedback.task_response}%` }} />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 text-sm uppercase tracking-wide">Key Improvements</h4>
                    <div className="space-y-2">
                        {feedback.improvements.map((imp, idx) => (
                            <div key={idx} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 p-3 rounded-lg text-sm">
                                <div className="flex items-center gap-2 mb-1 text-slate-400 text-xs">
                                    <span className="line-through decoration-red-400 decoration-2 text-slate-500">{imp.original}</span>
                                    <span>→</span>
                                </div>
                                <div className="font-medium text-slate-800 dark:text-amber-100 flex items-center justify-between">
                                    {imp.improved}
                                    {imp.skill_ref && (
                                        <span className="text-[10px] bg-white dark:bg-black/20 border border-amber-200 px-1.5 py-0.5 rounded text-amber-600">
                                            {imp.skill_ref}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {feedback.improvements.length === 0 && (
                            <div className="text-sm text-slate-500 italic">No critical phrasing errors found. Well done!</div>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 text-sm uppercase tracking-wide">Suggestions</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        {feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
};

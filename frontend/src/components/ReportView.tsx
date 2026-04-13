
import { CheckCircle, XCircle, ShieldCheck, Calendar, ArrowLeft, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { quizService } from '../services/quiz';
import { QuizReportData, AppView } from '../types';

import { Button } from './Button';

interface ReportViewProps {
    reportId?: string;
    onNavigate: (view: AppView) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ reportId, onNavigate }) => {
    const [report, setReport] = useState<QuizReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchReport = async () => {
            if (!reportId) {
                setError("Invalid Report ID");
                setLoading(false);
                return;
            }
            try {
                const data = await quizService.getQuizReportById(reportId);
                if (data) {
                    setReport(data);
                } else {
                    setError("Report not found or access denied.");
                }
            } catch (e) {
                setError("Failed to load report.");
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [reportId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Retrieving Official Report...</p>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <Button onClick={() => onNavigate(AppView.DASHBOARD)}>Go Home</Button>
            </div>
        );
    }

    const percentage = Math.round((report.correct_count / report.total_questions) * 100);
    const gradeColor = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
    const gradeBg = percentage >= 80 ? 'bg-green-50' : percentage >= 60 ? 'bg-yellow-50' : 'bg-red-50';

    return (
        <div className="flex flex-col h-full bg-[#F5F7FA]">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-4 shrink-0 shadow-sm z-10">
                <button onClick={() => onNavigate(AppView.DASHBOARD)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h1 className="font-bold text-slate-800 text-lg">Quiz Report</h1>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Certificate Card */}
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
                        <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                        <div className="p-6 md:p-8 text-center">
                            <div className="flex items-center justify-center gap-2 mb-2 text-slate-400 text-xs uppercase tracking-widest font-bold">
                                <ShieldCheck className="w-4 h-4" />
                                Official Result
                            </div>

                            <h2 className="text-2xl font-bold text-slate-900 mb-1">{report.student_name}</h2>
                            <p className="text-slate-500 text-sm mb-6">{report.quiz_topic}</p>

                            <div className="flex justify-center mb-8">
                                <div className={`relative w-32 h-32 rounded-full border-4 flex items-center justify-center ${gradeBg} border-current ${gradeColor}`}>
                                    <div className="text-center">
                                        <div className="text-3xl font-extrabold">{percentage}%</div>
                                        <div className="text-xs font-bold opacity-80 uppercase">Score</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                                <div className="text-center">
                                    <div className="text-slate-400 text-xs uppercase font-bold mb-1">Answered</div>
                                    <div className="text-lg font-bold text-slate-800">{report.correct_count} / {report.total_questions}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-slate-400 text-xs uppercase font-bold mb-1">Date</div>
                                    <div className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {new Date(report.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider pl-2">Performance Detail</h3>
                        {report.answers_snapshot.map((ans, idx) => (
                            <div key={idx} className={`bg-white p-4 rounded-xl border flex gap-4 ${ans.is_correct ? 'border-green-100' : 'border-red-100'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${ans.is_correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {ans.question_number}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 mb-2 line-clamp-2">{ans.prompt_snippet}</p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <span className={`px-2 py-1 rounded font-medium ${ans.is_correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            Your Answer: <span className="font-bold">{ans.user_answer}</span>
                                        </span>
                                        {!ans.is_correct && (
                                            <span className="px-2 py-1 rounded font-medium bg-blue-50 text-blue-700">
                                                Correct: <span className="font-bold">{ans.correct_answer}</span>
                                            </span>
                                        )}
                                        <span className="px-2 py-1 rounded bg-slate-50 text-slate-500 border border-slate-100">
                                            {ans.skill_type}
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0 pt-1">
                                    {ans.is_correct ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center pb-8 pt-4">
                        <Button onClick={() => onNavigate(AppView.DASHBOARD)} className="bg-blue-600 text-white shadow-lg shadow-blue-200">
                            Start Your Own Quiz
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
};

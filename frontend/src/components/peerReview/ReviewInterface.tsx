import { ArrowLeft, AlignLeft } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import * as peerReviewService from '../../services/peerReviewService';
import { PeerReviewSubmission, InlineCorrection } from '../../types';
import * as draftStorage from '../../utils/draftStorage';
import { Button } from '../Button';
import { useToast } from '../ui/Toast';

import { ScoringSliders } from './ScoringSliders';

interface ReviewInterfaceProps {
    submission: PeerReviewSubmission;
    reviewerId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const ReviewInterface: React.FC<ReviewInterfaceProps> = ({
    submission,
    reviewerId,
    onClose,
    onSuccess
}) => {
    const toast = useToast();
    const [scores, setScores] = useState({
        taskResponse: 6.0,
        coherence: 6.5,
        lexical: 6.0,
        grammar: 6.0
    });

    // Kept in state for submit compatibility, but hidden from UI
    const [strengths] = useState('Feedback provided via inline corrections and scoring rubric.');
    const [weaknesses] = useState('Feedback provided via inline corrections and scoring rubric.');
    const [suggestions] = useState('');

    const [inlineCorrections, setInlineCorrections] = useState<InlineCorrection[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [startTime] = useState(Date.now());

    const [activeCorrection, setActiveCorrection] = useState<{
        isNew: boolean;
        start: number;
        end: number;
        original: string;
        correction: string;
        comment: string;
        id?: number;
    } | null>(null);

    useEffect(() => {
        const draft = draftStorage.loadDraft(submission.id);
        if (draft) {
            setScores(draft.scores);
            setInlineCorrections(draft.inlineCorrections);
            toast.info('Draft restored');
        }
        draftStorage.cleanupOldDrafts();
    }, [submission.id]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (inlineCorrections.length > 0) {
                draftStorage.saveDraft({
                    submissionId: submission.id,
                    scores,
                    strengths,
                    weaknesses,
                    suggestions,
                    inlineCorrections,
                    savedAt: new Date().toISOString()
                });
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [submission.id, scores, strengths, weaknesses, suggestions, inlineCorrections]);

    // Added local state to force re-render for timeSpent
    const [timeSpent, setTimeSpent] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length === 0) {
            return;
        }

        const text = selection.toString();
        const range = selection.getRangeAt(0);
        const essayElement = document.getElementById('essay-content');

        if (essayElement && essayElement.contains(range.commonAncestorContainer)) {
            const start = submission.essay_content.indexOf(text);
            if (start !== -1) {
                setActiveCorrection({
                    isNew: true,
                    start,
                    end: start + text.length,
                    original: text,
                    correction: '',
                    comment: ''
                });
                selection.removeAllRanges();
            }
        }
    };

    const handleSaveCorrection = () => {
        if (!activeCorrection || !activeCorrection.correction.trim()) return;

        if (activeCorrection.isNew) {
            setInlineCorrections([...inlineCorrections, {
                start: activeCorrection.start,
                end: activeCorrection.end,
                original: activeCorrection.original,
                correction: activeCorrection.correction,
                comment: activeCorrection.comment
            }]);
        } else if (activeCorrection.id !== undefined) {
            const newCorrections = [...inlineCorrections];
            newCorrections[activeCorrection.id] = {
                start: activeCorrection.start,
                end: activeCorrection.end,
                original: activeCorrection.original,
                correction: activeCorrection.correction,
                comment: activeCorrection.comment
            };
            setInlineCorrections(newCorrections);
        }

        setActiveCorrection(null);
    };

    const handleDeleteCorrection = () => {
        if (activeCorrection && !activeCorrection.isNew && activeCorrection.id !== undefined) {
            const newCorrections = [...inlineCorrections];
            newCorrections.splice(activeCorrection.id, 1);
            setInlineCorrections(newCorrections);
        }
        setActiveCorrection(null);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            const result = await peerReviewService.submitReview(
                submission.id,
                reviewerId,
                scores,
                { strengths, weaknesses, suggestions },
                inlineCorrections,
                timeSpent
            );

            if (result) {
                toast.success('Review submitted!');
                draftStorage.deleteDraft(submission.id);
                onSuccess();
                onClose();
            } else {
                toast.error('Failed to submit review. Please try again.');
            }
        } catch (err) {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderEssayWithHighlights = () => {
        let lastIndex = 0;
        const parts: React.ReactNode[] = [];

        const sortedCorrections = [...inlineCorrections].sort((a, b) => a.start - b.start);

        sortedCorrections.forEach((correction, idx) => {
            if (correction.start > lastIndex) {
                parts.push(
                    <span key={`text-${idx}`}>
                        {submission.essay_content.substring(lastIndex, correction.start)}
                    </span>
                );
            }

            const isActive = activeCorrection && !activeCorrection.isNew && activeCorrection.id === idx;

            parts.push(
                <span
                    key={`correction-${idx}`}
                    onClick={() => setActiveCorrection({
                        ...correction,
                        comment: correction.comment || '',
                        isNew: false,
                        id: idx
                    })}
                    className={`cursor-pointer transition-colors px-0.5 rounded ${isActive
                        ? 'bg-blue-100/50 text-blue-600 border-b-2 border-blue-400 font-medium'
                        : 'bg-yellow-100 text-yellow-800 border-b-2 border-yellow-400'
                        }`}
                >
                    {correction.original}
                </span>
            );

            lastIndex = correction.end;
        });

        if (activeCorrection && activeCorrection.isNew) {
            if (activeCorrection.start > lastIndex) {
                parts.push(
                    <span key="text-before-active">
                        {submission.essay_content.substring(lastIndex, activeCorrection.start)}
                    </span>
                );
            }
            parts.push(
                <span key="active-new-correction" className="bg-blue-100/50 text-blue-600 border-b-2 border-blue-400 font-medium px-0.5 rounded">
                    {activeCorrection.original}
                </span>
            );
            lastIndex = activeCorrection.end;
        }

        if (lastIndex < submission.essay_content.length) {
            parts.push(
                <span key="text-end">
                    {submission.essay_content.substring(lastIndex)}
                </span>
            );
        }

        return parts;
    };

    return (
        <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[100] flex flex-col pt-safe overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 z-20 bg-white dark:bg-slate-950">
                <button
                    onClick={onClose}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900 rounded-full p-2 -ml-2 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-800 dark:text-white" />
                </button>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg absolute left-1/2 -translate-x-1/2">
                    Reviewing Essay
                </h3>
                <button className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                    Help
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto w-full relative">
                <div className="px-5 py-6">
                    {/* Topic */}
                    <div className="mb-6 flex items-start gap-4">
                        <h1 className="flex-1 text-xl font-bold text-slate-900 dark:text-white leading-tight">
                            Topic: {submission.prompt || 'Importance of Art Education'}
                        </h1>
                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[10px] px-2 py-1 rounded tracking-wider uppercase whitespace-nowrap">
                            {submission.task_type.includes('1') ? 'ACADEMIC' : 'ACADEMIC'}
                        </span>
                    </div>

                    {/* Essay Content */}
                    <div
                        id="essay-content"
                        className="text-slate-700 dark:text-slate-300 leading-relaxed font-serif text-[15px] space-y-4 mb-4 select-text"
                        onMouseUp={handleTextSelection}
                    >
                        {inlineCorrections.length > 0 || activeCorrection ? (
                            <p className="whitespace-pre-wrap">{renderEssayWithHighlights()}</p>
                        ) : (
                            <div className="whitespace-pre-wrap">{submission.essay_content}</div>
                        )}
                    </div>

                    {/* Empty state hint */}
                    {inlineCorrections.length === 0 && !activeCorrection && (
                        <div className="mt-6 mb-4 p-4 rounded-xl border border-dashed border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900/50 flex flex-col items-center justify-center gap-2 text-sm text-blue-700 dark:text-blue-400 text-center">
                            <AlignLeft className="w-6 h-6 opacity-70" />
                            <p><strong>Long press</strong> or select text on the essay above to add an inline correction.</p>
                        </div>
                    )}

                    {/* Correction Card */}
                    {activeCorrection && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 border border-blue-100 dark:border-blue-900 relative my-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                                    <AlignLeft className="w-4 h-4" /> CORRECTION
                                </div>
                                <button onClick={() => setActiveCorrection(null)} className="text-slate-400 hover:text-slate-500">
                                    <ArrowLeft className="w-4 h-4 rotate-45" /> {/* Close icon approximation */}
                                </button>
                            </div>

                            <div className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase mb-1">Original Text</div>
                            <div className="line-through text-red-500 dark:text-red-400 font-serif mb-4 selection:bg-red-200">
                                {activeCorrection.original}
                            </div>

                            <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase mb-1">Suggestion</div>
                            <input
                                value={activeCorrection.correction}
                                onChange={(e) => setActiveCorrection({ ...activeCorrection, correction: e.target.value })}
                                placeholder="E.g. Consider using 'unnecessary'"
                                className="w-full font-bold text-slate-800 dark:text-slate-200 mb-3 bg-transparent outline-none border-b border-transparent focus:border-blue-500 pb-1"
                                autoFocus
                            />

                            <textarea
                                value={activeCorrection.comment}
                                onChange={(e) => setActiveCorrection({ ...activeCorrection, comment: e.target.value })}
                                placeholder="Add explanation (optional)..."
                                className="w-full bg-slate-50 dark:bg-slate-800 italic text-slate-600 dark:text-slate-400 p-3 rounded-lg text-sm mb-4 outline-none resize-none h-20"
                            />

                            <div className="flex gap-3">
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={handleSaveCorrection}
                                    disabled={!activeCorrection.correction.trim()}
                                >
                                    {activeCorrection.isNew ? 'Save' : 'Edit'}
                                </Button>
                                <Button
                                    className={`flex-1 ${activeCorrection.isNew ? 'bg-slate-100' : 'bg-white border text-slate-700'}`}
                                    variant={activeCorrection.isNew ? 'secondary' : 'outline'}
                                    onClick={activeCorrection.isNew ? () => setActiveCorrection(null) : handleDeleteCorrection}
                                >
                                    {activeCorrection.isNew ? 'Cancel' : 'Delete'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Scoring Block */}
                    <ScoringSliders scores={scores} onChange={setScores} />

                    {/* Padding corresponding to the fixed footer height */}
                    <div className="h-32" />
                </div>
            </div>

            {/* Fixed Footer */}
            <div className="absolute bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 z-20 flex flex-col items-center">
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full py-4 rounded-xl flex items-center justify-center font-bold text-base transition-colors ${!isSubmitting
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-400'
                        }`}
                >
                    {isSubmitting ? 'Submitting...' : (
                        <div className="flex items-center gap-2">
                            Submit Review
                        </div>
                    )}
                </Button>
            </div>
        </div>
    );
};

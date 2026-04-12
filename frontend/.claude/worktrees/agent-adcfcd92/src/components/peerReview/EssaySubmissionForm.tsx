import { X, Send, AlertCircle, Save, RotateCcw } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import * as peerReviewService from '../../services/peerReviewService';
import { moderateContent, extractTopics, estimateDifficulty } from '../../utils/contentModeration';
import { 
    saveEssayDraft, 
    loadEssayDraft, 
    deleteEssayDraft, 
    formatTimeSinceLastSave,
    AUTO_SAVE_INTERVAL,
    cleanupExpiredDrafts
} from '../../utils/essayDraftStorage';
import { Button } from '../Button';
import { useToast } from '../ui/Toast';

interface EssaySubmissionFormProps {
    userId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const EssaySubmissionForm: React.FC<EssaySubmissionFormProps> = ({
    userId,
    onClose,
    onSuccess
}) => {
    const toast = useToast();
    const [essayContent, setEssayContent] = useState('');
    const [prompt, setPrompt] = useState('');
    const [taskType, setTaskType] = useState<'Task 1' | 'Task 2'>('Task 2');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [limitInfo, setLimitInfo] = useState<{ remaining: number; submissionsToday: number } | null>(null);
    const [lastSaved, setLastSaved] = useState<string>('');
    const [showDraftRecovery, setShowDraftRecovery] = useState(false);
    const [qualityWarnings, setQualityWarnings] = useState<string[]>([]);

    // Load rate limit info and check for drafts on mount
    useEffect(() => {
        const loadInitialData = async () => {
            // Load rate limit
            try {
                const info = await peerReviewService.checkSubmissionLimit(userId);
                setLimitInfo({ remaining: info.remaining, submissionsToday: info.submissionsToday });
            } catch (err) {
                console.error('[SubmissionForm] Failed to load limit info:', err);
            }

            // Cleanup old drafts
            cleanupExpiredDrafts();

            // Check for existing draft
            const draft = loadEssayDraft(userId);
            if (draft && draft.essayContent.trim().length > 0) {
                setShowDraftRecovery(true);
            }
        };
        loadInitialData();
    }, [userId]);

    // Auto-save draft
    useEffect(() => {
        if (essayContent.trim().length < 50) return; // Don't save very short content

        const interval = setInterval(() => {
            if (essayContent.trim().length >= 50) {
                saveEssayDraft({
                    userId,
                    essayContent,
                    prompt,
                    taskType,
                    isAnonymous
                });
                setLastSaved(formatTimeSinceLastSave(userId));
            }
        }, AUTO_SAVE_INTERVAL);

        return () => clearInterval(interval);
    }, [userId, essayContent, prompt, taskType, isAnonymous]);

    // Quality check on content change
    useEffect(() => {
        if (essayContent.trim().length < 100) {
            setQualityWarnings([]);
            return;
        }

        const result = moderateContent(essayContent, 'essay');
        if (result.suggestions.length > 0) {
            setQualityWarnings(result.suggestions.slice(0, 3));
        } else {
            setQualityWarnings([]);
        }
    }, [essayContent]);

    // Recover draft
    const handleRecoverDraft = useCallback(() => {
        const draft = loadEssayDraft(userId);
        if (draft) {
            setEssayContent(draft.essayContent);
            setPrompt(draft.prompt);
            setTaskType(draft.taskType);
            setIsAnonymous(draft.isAnonymous);
            setLastSaved(formatTimeSinceLastSave(userId));
            toast.success('Draft recovered!');
        }
        setShowDraftRecovery(false);
    }, [userId, toast]);

    // Discard draft
    const handleDiscardDraft = useCallback(() => {
        deleteEssayDraft(userId);
        setShowDraftRecovery(false);
        toast.info('Draft discarded');
    }, [userId, toast]);

    const wordCount = essayContent.trim().split(/\s+/).filter(w => w.length > 0).length;
    const isValid = wordCount >= 150 && essayContent.trim().length > 0;

    const handleSubmit = async () => {
        if (!isValid) {
            setError('Essay must be at least 150 words');
            return;
        }

        // Content moderation check
        const moderationResult = moderateContent(essayContent, 'essay');
        if (!moderationResult.isApproved) {
            const highSeverityFlags = moderationResult.flags.filter(f => f.severity === 'high');
            if (highSeverityFlags.length > 0) {
                setError(`Content not allowed: ${highSeverityFlags[0].message}`);
                toast.error('Your essay contains inappropriate content. Please revise.');
                return;
            }
        }

        setIsSubmitting(true);
        setError('');

        try {
            // Extract topics and difficulty for enhanced submission
            const topics = extractTopics(essayContent);
            const difficulty = estimateDifficulty(essayContent);

            const result = await peerReviewService.submitEssay(
                userId,
                essayContent,
                prompt || null,
                taskType,
                isAnonymous
            );

            if (result) {
                // Delete draft after successful submission
                deleteEssayDraft(userId);
                
                toast.success('Essay submitted successfully! 🎉');
                onSuccess();
                onClose();
            }
        } catch (err: any) {
            const errorMessage = err?.message || 'An error occurred. Please try again.';
            setError(errorMessage);

            // Show specific toast for rate limit errors
            if (errorMessage.includes('Daily submission limit')) {
                toast.error('Daily limit reached (5 essays per day)');
            } else {
                toast.error(errorMessage);
            }

            console.error('[SubmissionForm] Submit failed:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-white dark:bg-slate-900 rounded-none md:rounded-2xl w-full md:max-w-2xl h-[100dvh] md:h-auto md:max-h-[85vh] shadow-2xl flex flex-col">
                {/* Draft Recovery Modal */}
                {showDraftRecovery && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                                    <Save className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">Recover Draft?</h4>
                                    <p className="text-xs text-slate-500">We found an unsaved draft</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Would you like to continue where you left off?
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleDiscardDraft}
                                    className="flex-1"
                                >
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Start Fresh
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleRecoverDraft}
                                    className="flex-1"
                                >
                                    Recover
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
                            Submit Essay
                        </h3>
                        <p className="text-xs md:text-sm text-slate-500 mt-1">
                            Get feedback (+10 XP)
                            {lastSaved && <span className="ml-2 text-green-600 dark:text-green-400">• Saved {lastSaved}</span>}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-5">
                        {/* Task Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Task Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setTaskType('Task 1')}
                                    className={`
                                        p-3 rounded-xl border-2 transition-all text-left
                                        ${taskType === 'Task 1'
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}
                                    `}
                                >
                                    <div className="font-bold text-slate-800 dark:text-white text-sm">Task 1</div>
                                    <div className="text-[10px] md:text-xs text-slate-500 mt-0.5">Academic/Graph</div>
                                </button>
                                <button
                                    onClick={() => setTaskType('Task 2')}
                                    className={`
                                        p-3 rounded-xl border-2 transition-all text-left
                                        ${taskType === 'Task 2'
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}
                                    `}
                                >
                                    <div className="font-bold text-slate-800 dark:text-white text-sm">Task 2</div>
                                    <div className="text-[10px] md:text-xs text-slate-500 mt-0.5">Essay Writing</div>
                                </button>
                            </div>
                        </div>

                        {/* Prompt (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Prompt <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Paste the question or topic here..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                                rows={2}
                            />
                        </div>

                        {/* Essay Content */}
                        <div className="flex flex-col flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Your Essay
                                </label>
                                <div className={`text-xs font-medium ${wordCount >= 150
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-orange-600 dark:text-orange-400'
                                    }`}>
                                    {wordCount} words {wordCount < 150 && `(min. 150)`}
                                </div>
                            </div>
                            <textarea
                                value={essayContent}
                                onChange={(e) => setEssayContent(e.target.value)}
                                placeholder="Paste or type your essay here..."
                                className="w-full flex-1 min-h-[200px] px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-serif text-base leading-relaxed"
                            />
                            {/* Quality Warnings */}
                            {qualityWarnings.length > 0 && (
                                <div className="mt-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                        💡 Tips to improve your essay:
                                    </p>
                                    <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                        {qualityWarnings.map((warning, idx) => (
                                            <li key={idx}>• {warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Rate Limit Warning */}
                        {limitInfo && limitInfo.remaining <= 2 && (
                            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                                            {limitInfo.remaining === 0
                                                ? 'Daily limit reached (5/day)'
                                                : `${limitInfo.remaining} submission${limitInfo.remaining === 1 ? '' : 's'} left today`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Anonymous Toggle */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div>
                                <div className="font-medium text-slate-800 dark:text-white text-sm">Anonymous</div>
                                <div className="text-xs text-slate-500">Hide your name</div>
                            </div>
                            <button
                                onClick={() => setIsAnonymous(!isAnonymous)}
                                className={`
                                    relative w-10 h-6 rounded-full transition-colors
                                    ${isAnonymous ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}
                                `}
                            >
                                <div className={`
                                    absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm
                                    ${isAnonymous ? 'translate-x-4' : 'translate-x-0.5'}
                                `} />
                            </button>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 pb-safe">
                    <div className="text-xs text-slate-500 hidden md:block">
                        Community feedback
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 md:flex-none"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={!isValid || isSubmitting}
                            className="flex-1 md:flex-none"
                        >
                            {isSubmitting ? (
                                <>Submitting...</>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Submit
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};


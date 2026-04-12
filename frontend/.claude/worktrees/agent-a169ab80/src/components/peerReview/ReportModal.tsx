import { X, AlertTriangle, Flag } from 'lucide-react';
import React, { useState } from 'react';

import { ReportReason } from '../../types/moderation';
import { Button } from '../Button';
import { useToast } from '../ui/Toast';

interface ReportModalProps {
    contentType: 'submission' | 'review';
    contentId: string;
    onClose: () => void;
    onSubmitted: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
    { 
        value: 'spam', 
        label: 'Spam', 
        description: 'Irrelevant or unsolicited content' 
    },
    { 
        value: 'inappropriate', 
        label: 'Inappropriate Content', 
        description: 'Content not suitable for the platform' 
    },
    { 
        value: 'offensive', 
        label: 'Offensive Language', 
        description: 'Contains offensive or harmful language' 
    },
    { 
        value: 'plagiarism', 
        label: 'Plagiarism', 
        description: 'Copied from another source without attribution' 
    },
    { 
        value: 'low_quality', 
        label: 'Low Quality', 
        description: 'Very poor quality or incomplete content' 
    },
    { 
        value: 'incorrect_scoring', 
        label: 'Incorrect Scoring', 
        description: 'Scores do not match the essay quality' 
    },
    { 
        value: 'other', 
        label: 'Other', 
        description: 'Please describe the issue' 
    },
];

export const ReportModal: React.FC<ReportModalProps> = ({
    contentType,
    contentId,
    onClose,
    onSubmitted
}) => {
    const toast = useToast();
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            toast.error('Please select a reason for your report');
            return;
        }

        setIsSubmitting(true);

        try {
            const { supabase } = await import('../../services/supabase');
            const { getUserId } = await import('../../utils/guestId');
            
            const userId = getUserId();
            
            const { error } = await supabase
                .from('content_reports')
                .insert({
                    reporter_id: userId,
                    content_type: contentType,
                    content_id: contentId,
                    reason: selectedReason,
                    description: description || null,
                    status: 'pending'
                });

            if (error) {
                if (error.code === '23505') {
                    toast.error('You have already reported this content');
                } else {
                    throw error;
                }
            } else {
                toast.success('Report submitted successfully. Thank you for helping keep our community safe.');
                onSubmitted();
                onClose();
            }
        } catch (error) {
            console.error('[ReportModal] Submit failed:', error);
            toast.error('Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                            <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">
                                Report Content
                            </h3>
                            <p className="text-xs text-slate-500">
                                Help us maintain quality standards
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                                False reports may result in account restrictions. Please report only genuine violations.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Reason for Report *
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {REPORT_REASONS.map((reason) => (
                                <button
                                    key={reason.value}
                                    onClick={() => setSelectedReason(reason.value)}
                                    className={`
                                        w-full text-left p-3 rounded-xl border-2 transition-all
                                        ${selectedReason === reason.value
                                            ? 'border-red-500 bg-red-50 dark:bg-red-950'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }
                                    `}
                                >
                                    <div className="font-medium text-sm text-slate-800 dark:text-white">
                                        {reason.label}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {reason.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Additional Details
                            <span className="text-slate-400 font-normal"> (Optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Please provide any additional context..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm"
                            rows={3}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 border-t border-slate-200 dark:border-slate-800">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!selectedReason || isSubmitting}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                        {isSubmitting ? (
                            'Submitting...'
                        ) : (
                            <>
                                <Flag className="w-4 h-4 mr-2" />
                                Submit Report
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

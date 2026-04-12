import { AlertTriangle } from 'lucide-react';
import React from 'react';

import { Button } from './Button';

interface SubmitConfirmProps {
    answeredCount: number;
    markedCount: number;
    unansweredCount: number;
    onCancel: () => void;
    onSubmit: () => void;
}

export const SubmitConfirm: React.FC<SubmitConfirmProps> = ({
    answeredCount,
    markedCount,
    unansweredCount,
    onCancel,
    onSubmit,
}) => {
    return (
        <div className="max-w-2xl mx-auto p-8 mt-10 bg-white rounded-xl shadow-lg border border-slate-200 text-center">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Ready to Submit?</h2>
            <p className="text-slate-500 mb-6">Review your status before finishing the section.</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-2xl font-bold text-blue-600">{answeredCount}</div>
                    <div className="text-sm text-blue-600/80">Answered</div>
                </div>
                <div className="p-4 bg-white border border-orange-500 rounded-lg">
                    <div className="text-2xl font-bold text-orange-500">{markedCount}</div>
                    <div className="text-sm text-orange-500/80">Marked</div>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-lg">
                    <div className="text-2xl font-bold text-slate-700">{unansweredCount}</div>
                    <div className="text-sm text-slate-500">Unanswered</div>
                </div>
            </div>

            <div className="flex justify-center space-x-4">
                <Button variant="ghost" onClick={onCancel}>Return to Review</Button>
                <Button onClick={onSubmit} className="bg-blue-600 hover:bg-blue-800 text-white">Submit Exam</Button>
            </div>
        </div>
    );
};
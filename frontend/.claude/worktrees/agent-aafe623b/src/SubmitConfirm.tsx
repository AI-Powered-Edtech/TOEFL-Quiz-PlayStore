import { Button } from './components/Button';
import { AlertTriangle } from 'lucide-react';
import React from 'react';

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
        <div className="max-w-2xl mx-auto p-8 mt-10 bg-bg-card rounded-xl shadow-lg border border-border-light text-center">
            <AlertTriangle className="w-16 h-16 text-orange-main mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">Ready to Submit?</h2>
            <p className="text-text-secondary mb-6">Review your status before finishing the section.</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-blue-soft rounded-lg border border-blue-primary/20">
                    <div className="text-2xl font-bold text-blue-primary">{answeredCount}</div>
                    <div className="text-sm text-blue-primary/80">Answered</div>
                </div>
                <div className="p-4 bg-bg-card border border-orange-main rounded-lg">
                    <div className="text-2xl font-bold text-orange-main">{markedCount}</div>
                    <div className="text-sm text-orange-main/80">Marked</div>
                </div>
                <div className="p-4 bg-bg-main border border-border-light rounded-lg">
                    <div className="text-2xl font-bold text-text-primary">{unansweredCount}</div>
                    <div className="text-sm text-text-secondary">Unanswered</div>
                </div>
            </div>

            <div className="flex justify-center space-x-4">
                <Button variant="ghost" onClick={onCancel}>Return to Review</Button>
                <Button onClick={onSubmit} className="bg-blue-primary hover:bg-blue-dark text-white">Submit Exam</Button>
            </div>
        </div>
    );
};

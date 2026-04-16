import { AlertTriangle, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    confirmLabel?: string;
    confirmButtonClass?: string;
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    title,
    description,
    confirmText,
    confirmLabel = 'Confirm',
    confirmButtonClass = 'bg-blue-600 hover:bg-blue-700 text-white',
    onConfirm,
    onClose,
}) => {
    const [typed, setTyped] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setTyped('');
            setSubmitting(false);
        }
    }, [open]);

    if (!open) return null;

    const matches = !confirmText || typed === confirmText;
    const disabled = !matches || submitting;

    const handleConfirm = async () => {
        if (disabled) return;
        setSubmitting(true);
        try {
            await onConfirm();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
        >
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                <div className="flex items-start justify-between p-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <h3 id="confirm-dialog-title" className="font-bold text-slate-800 text-base">
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        aria-label="Close"
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-sm text-slate-600">{description}</p>
                    {confirmText && (
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                Type <span className="font-mono font-bold text-red-600">{confirmText}</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                                placeholder={confirmText}
                                autoComplete="off"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm font-mono"
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-3 p-4 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={disabled}
                        className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
                    >
                        {submitting ? 'Working...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;

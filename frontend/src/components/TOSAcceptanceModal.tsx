import { ExternalLink } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from './Button';

export const TOS_ACCEPTED_KEY = 'tos_accepted_at';
export const TOS_VERSION_KEY = 'tos_version';
export const TOS_CURRENT_VERSION = 'v1';

interface TOSAcceptanceModalProps {
    onAccept: () => void;
}

export const TOSAcceptanceModal: React.FC<TOSAcceptanceModalProps> = ({ onAccept }) => {
    const [agreed, setAgreed] = useState(false);

    const handleAccept = () => {
        if (!agreed) return;
        localStorage.setItem(TOS_ACCEPTED_KEY, new Date().toISOString());
        localStorage.setItem(TOS_VERSION_KEY, TOS_CURRENT_VERSION);
        onAccept();
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tos-modal-title"
        >
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md mx-auto mt-20 w-full shadow-2xl">
                <h2
                    id="tos-modal-title"
                    className="text-xl font-bold text-slate-800 dark:text-white mb-3"
                >
                    Welcome to TOEFL Quiz
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    Before you continue, please review our Terms of Service and Privacy Policy.
                </p>

                <div className="flex flex-col gap-2 mb-5">
                    <a
                        href="/terms-of-service.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        Terms of Service
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                        href="/privacy-policy.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        Privacy Policy
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>

                <label className="flex items-start gap-2 mb-5 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                        I have read and agree to the Terms of Service and Privacy Policy
                    </span>
                </label>

                <Button
                    variant="primary"
                    onClick={handleAccept}
                    disabled={!agreed}
                    className="w-full"
                >
                    Accept &amp; Continue
                </Button>
            </div>
        </div>
    );
};

export const needsTOSAcceptance = (): boolean => {
    const acceptedAt = localStorage.getItem(TOS_ACCEPTED_KEY);
    const version = localStorage.getItem(TOS_VERSION_KEY);
    if (!acceptedAt) return true;
    if (version !== TOS_CURRENT_VERSION) return true;
    return false;
};

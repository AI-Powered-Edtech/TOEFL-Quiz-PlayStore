import { BookOpen, ChevronLeft, ChevronRight, Crown, Sparkles, Wand2, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Button } from './Button';

type Step = {
    title: string;
    content: string;
    icon: React.ReactNode;
};

interface FeatureTourModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export const FEATURE_TOUR_KEY = 'feature_tour_v1_done';

export const FeatureTourModal: React.FC<FeatureTourModalProps> = ({ isOpen, onClose, onComplete }) => {
    const steps: Step[] = useMemo(
        () => [
            {
                title: 'Selamat datang di TOEFL Quiz',
                content:
                    'Aplikasi ini fokus untuk latihan TOEFL secara cepat. Mulai dari Practice, pilih section, lalu kerjakan sesi singkat setiap hari.',
                icon: <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
            },
            {
                title: 'Practice & Learning Path',
                content:
                    'Gunakan Practice untuk latihan cepat, dan Learning Path untuk jalur belajar terarah berdasarkan skill yang perlu ditingkatkan.',
                icon: <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
            },
            {
                title: 'Writing Gym & Essay Dojo',
                content:
                    'Writing Gym membangun muscle memory (latihan bertahap). Essay Dojo memberi evaluasi dan feedback lebih detail.',
                icon: <Wand2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
            },
            {
                title: 'AI Tokens & Paywall',
                content:
                    'Fitur AI memakai token harian. Jika token habis, kamu bisa upgrade plan agar limit token lebih besar dan akses fitur premium terbuka.',
                icon: <Crown className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
            },
        ],
        []
    );

    const [step, setStep] = useState(0);
    const isLast = step === steps.length - 1;

    if (!isOpen) return null;

    const current = steps[step];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {current.icon}
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 dark:text-white">Feature Tour</div>
                            <div className="text-xs text-slate-500">
                                {step + 1} / {steps.length}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                <div className="p-5">
                    <div className="text-lg font-bold text-slate-800 dark:text-white mb-2">{current.title}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{current.content}</div>
                </div>

                <div className="px-5 pb-5 flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step === 0}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>

                    <div className="flex gap-1">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                    i === step ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                            />
                        ))}
                    </div>

                    <Button
                        variant="primary"
                        onClick={() => {
                            if (isLast) {
                                onComplete();
                                return;
                            }
                            setStep((s) => Math.min(steps.length - 1, s + 1));
                        }}
                    >
                        {isLast ? 'Selesai' : 'Next'}
                        {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>
                </div>
            </div>
        </div>
    );
};


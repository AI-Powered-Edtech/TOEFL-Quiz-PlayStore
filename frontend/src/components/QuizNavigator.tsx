
import { ChevronUp, ChevronDown, Flag, CheckCircle2 } from 'lucide-react';
import React, { useState, useMemo } from 'react';

interface QuizNavigatorProps {
    totalQuestions: number;
    currentIndex: number;
    answers: Record<number, number>; // Map of index -> submitted answer index
    draftAnswers?: Record<number, number>;
    markedIndices: number[];
    onJump: (index: number) => void;
    onMarkToggle: () => void;
    onNext: () => void;
    onPrev: () => void;
}

export const QuizNavigator: React.FC<QuizNavigatorProps> = React.memo(({
    totalQuestions,
    currentIndex,
    answers,
    draftAnswers = {},
    markedIndices,
    onJump,
    onMarkToggle,
    onNext,
    onPrev
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const isMarked = markedIndices.includes(currentIndex);
    const hasSubmittedCurrent = answers[currentIndex] !== undefined;
    const hasDraftCurrent = draftAnswers[currentIndex] !== undefined;

    // Memoize the grid items to prevent unnecessary re-renders of the whole grid list
    const gridItems = useMemo(() => {
        return Array.from({ length: totalQuestions }).map((_, idx) => {
            const isAnswered = answers[idx] !== undefined;
            const isDraft = draftAnswers[idx] !== undefined;
            const isCurrent = idx === currentIndex;
            const isIdxMarked = markedIndices.includes(idx);

            const baseClasses = "relative h-10 w-full rounded-lg border-2 font-bold text-sm flex items-center justify-center transition-all";
            let stateClasses = "";

            if (isCurrent) {
                stateClasses = "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200 z-10 scale-105";
            } else if (isAnswered) {
                stateClasses = "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200";
            } else if (isDraft) {
                stateClasses = "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100";
            } else {
                stateClasses = "border-slate-200 border-dashed text-slate-400 hover:border-slate-300 hover:text-slate-600";
            }

            return (
                <button
                    key={idx}
                    onClick={() => {
                        onJump(idx);
                        setIsOpen(false);
                    }}
                    className={`${baseClasses} ${stateClasses}`}
                >
                    {idx + 1}
                    {isIdxMarked && (
                        <div className="absolute -top-1 -right-1">
                            <Flag className="w-3 h-3 text-orange-500 fill-orange-500 drop-shadow-sm" />
                        </div>
                    )}
                    {(isAnswered || isDraft) && !isCurrent && (
                        <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isAnswered ? 'bg-slate-400' : 'bg-blue-400'}`}></div>
                    )}
                </button>
            );
        });
    }, [totalQuestions, currentIndex, answers, draftAnswers, markedIndices, onJump]);

    return (
        <>
            {/* Expanded Review Grid (Slide Up) */}
            <div
                className={`fixed left-1/2 bottom-16 z-40 w-full max-w-md -translate-x-1/2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out rounded-t-2xl ${isOpen ? 'translate-y-0' : 'translate-y-[120%]'
                    }`}
                style={{ maxHeight: '70vh' }}
            >
                <div
                    className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 rounded-t-2xl flex justify-between items-center sticky top-0 z-10 cursor-pointer"
                    onClick={() => setIsOpen(false)}
                >
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                        Question Map
                    </h3>
                    <button className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                        <ChevronDown className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar bg-slate-50/50 dark:bg-slate-950/60">
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2.5 pb-8">
                        {gridItems}
                    </div>
                </div>
            </div>

            {/* Bottom Bar (Always Visible) */}
            <div className="fixed bottom-0 left-1/2 z-50 flex h-16 w-full max-w-md -translate-x-1/2 items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 py-2 shadow-lg safe-area-bottom">

                {/* Left: Counter */}
                <div className="flex items-center gap-3 w-1/4">
                    <span className="font-mono text-xs font-bold text-slate-500">
                        <span className="text-slate-900 text-base">{currentIndex + 1}</span>
                        <span className="opacity-50 mx-1">/</span>
                        {totalQuestions}
                    </span>
                </div>

                {/* Center: Review Toggle */}
                <div className="flex-1 flex justify-center">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 group"
                    >
                        <span>{isOpen ? 'Close' : 'Review'}</span>
                        <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        </div>
                    </button>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2 w-1/4 justify-end">

                    <button
                        onClick={onMarkToggle}
                        className={`p-2.5 rounded-full border transition-all ${isMarked
                                ? 'bg-orange-50 border-orange-200 text-orange-500'
                                : 'bg-transparent border-transparent text-slate-300 hover:text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <Flag className={`w-5 h-5 ${isMarked ? 'fill-current' : ''}`} />
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    <button
                        onClick={onPrev}
                        disabled={currentIndex === 0}
                        className="hidden sm:flex px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-30"
                    >
                        Back
                    </button>
                    <button
                        onClick={onNext}
                        disabled={!hasSubmittedCurrent && !hasDraftCurrent}
                        className="p-2.5 sm:px-4 sm:py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                    >
                        <span className="hidden sm:inline">
                            {!hasSubmittedCurrent ? 'Submit' : (currentIndex === totalQuestions - 1 ? 'Finish' : 'Next')}
                        </span>
                        {/* We hide the text on very thin mobile screens but 'Finish' might be better kept visible, let's just use the icon + text consistently or adapt the icon */}
                        <span className="sm:hidden text-[10px] uppercase">
                            {!hasSubmittedCurrent ? 'Submit' : (currentIndex === totalQuestions - 1 ? 'Finish' : <ChevronUp className="w-5 h-5 rotate-90" />)}
                        </span>
                    </button>
                </div>
            </div>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
});

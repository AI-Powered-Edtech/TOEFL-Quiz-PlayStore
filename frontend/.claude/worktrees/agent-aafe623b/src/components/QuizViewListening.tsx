
import { CheckCircle, X, ArrowRight, Ban, Headphones } from 'lucide-react';
import React from 'react';

import { QuizData } from '../types';

import { Button } from './Button';
import { ListeningPlayer } from './ListeningPlayer';

interface QuizViewListeningProps {
    currentQuestion: QuizData;
    selectedAnswerIndex: number | null;
    isCorrect: boolean;
    showExplanation: boolean;
    onAnswer: (index: number) => void;
    onNext: () => void;
    isLastQuestion?: boolean;
    nextTranscript?: string;
}

export const QuizViewListening: React.FC<QuizViewListeningProps> = ({
    currentQuestion,
    selectedAnswerIndex,
    isCorrect,
    showExplanation,
    onAnswer,
    onNext,
    isLastQuestion = false,
    nextTranscript,
}) => {
    // Determine the transcript source
    const transcript = currentQuestion.stimulus?.text ||
        (currentQuestion.metadata as any)?.passage_text ||
        "No audio transcript available.";

    const [eliminatedIndices, setEliminatedIndices] = React.useState<number[]>([]);

    React.useEffect(() => {
        setEliminatedIndices([]);
    }, [currentQuestion]);

    const handleToggleElimination = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (showExplanation) return;
        setEliminatedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    return (
        <div className="max-w-xl mx-auto h-full flex flex-col pb-4 px-4 pt-2">

            {/* 1. Audio Player Section */}
            <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                        <Headphones className="w-4 h-4" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-700">Listen Carefully</h2>
                </div>
                <ListeningPlayer
                    transcript={transcript}
                    questionId={currentQuestion.id}
                    audioUrl={currentQuestion.stimulus?.audio_url}
                    nextTranscript={nextTranscript}
                    autoPlay={true}
                />
            </div>

            {/* 2. Question Card */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">

                {/* Question Prompt (Hidden until audio finishes? Optional. Showing now for simplicity) */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                    <h3 className="font-serif text-lg font-medium text-slate-800 leading-relaxed">
                        {currentQuestion.prompt}
                    </h3>
                </div>

                {/* Options */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid gap-3">
                        {currentQuestion.choices.map((choice, idx) => {
                            const isSelected = selectedAnswerIndex === idx;
                            const isTheCorrectOne = currentQuestion.correct_response.includes(choice);
                            const isEliminated = eliminatedIndices.includes(idx);
                            const label = String.fromCharCode(65 + idx);

                            let btnClass = "border-slate-200 hover:border-blue-400 hover:shadow-sm";
                            if (showExplanation) {
                                if (isTheCorrectOne) btnClass = "bg-green-50 border-green-500 text-green-800 ring-1 ring-green-500";
                                else if (isSelected) btnClass = "bg-red-50 border-red-500 text-red-800";
                                else btnClass = "opacity-50 border-slate-200 bg-slate-50";
                            } else if (isSelected) {
                                btnClass = "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500";
                            } else if (isEliminated) {
                                btnClass = "bg-slate-50 border-slate-100 text-slate-300";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !isEliminated && onAnswer(idx)}
                                    disabled={showExplanation}
                                    className={`relative w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-3 group ${btnClass}`}
                                >
                                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border ${isEliminated ? 'border-slate-200 text-slate-300' : 'border-current opacity-60'
                                        }`}>
                                        {label}
                                    </span>
                                    <span className={`flex-1 font-medium ${isEliminated ? 'line-through decoration-slate-300' : ''}`}>
                                        {choice}
                                    </span>

                                    {!showExplanation && (
                                        <div
                                            onClick={(e) => handleToggleElimination(e, idx)}
                                            className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${isEliminated ? 'text-orange-500 opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
                                        >
                                            <Ban className="w-4 h-4" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Explanation / Next */}
                {showExplanation && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 animate-in slide-in-from-bottom-2">
                        <div className={`mb-4 flex gap-3 items-start ${isCorrect ? 'text-green-700' : 'text-orange-700'}`}>
                            {isCorrect ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <X className="w-5 h-5 shrink-0 mt-0.5" />}
                            <div className="text-sm">
                                <p className="font-bold mb-1">{isCorrect ? 'Correct' : 'Incorrect'}</p>
                                <p className="opacity-90 leading-snug">{currentQuestion.metadata?.explanation}</p>
                            </div>
                        </div>
                        <Button onClick={onNext} className="w-full">
                            {isLastQuestion ? "Finish Section" : "Next Question"} <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

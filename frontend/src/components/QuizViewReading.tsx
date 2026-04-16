import { CheckCircle, X, Lightbulb, ArrowRight, Ban, HelpCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { QuizData } from '../types';
import { isCorrectOption } from '../utils/quizCorrectness';

import { Button } from './Button';
import { ReadingPassage } from './ReadingPassage';
import { Typewriter } from './Typewriter';

interface QuizViewReadingProps {
    currentQuestion: QuizData;
    selectedAnswerIndex: number | null;
    isCorrect: boolean;
    showExplanation: boolean;
    onAnswer: (index: number) => void;
    onNext: () => void;
    isLastQuestion?: boolean;
    isSimulation?: boolean;
}

export const QuizViewReading: React.FC<QuizViewReadingProps> = ({
    currentQuestion,
    selectedAnswerIndex,
    isCorrect,
    showExplanation,
    onAnswer,
    onNext,
    isLastQuestion = false,
    isSimulation = false,
}) => {
    // Resolve passage text from new Stimulus object or legacy metadata
    const passageText = currentQuestion.stimulus?.text || (currentQuestion.metadata as any)?.passage_text;

    // If no passage, default to question tab
    const [mobileTab, setMobileTab] = useState<'passage' | 'question'>(passageText ? 'passage' : 'question');
    const [textSize, setTextSize] = useState<'text-base' | 'text-lg' | 'text-xl'>('text-lg');
    const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
    const [hintsRevealed, setHintsRevealed] = useState(0);
    const [isTyping, setIsTyping] = useState(true);

    // Reset local state when question changes
    useEffect(() => {
        // Auto-switch to question tab if no passage
        setMobileTab(passageText ? 'passage' : 'question');
        setEliminatedIndices([]);
        setHintsRevealed(0);
        setIsTyping(true);
    }, [currentQuestion, passageText]);

    const handleToggleElimination = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (showExplanation) return;
        setEliminatedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleRevealHint = () => {
        setHintsRevealed(prev => prev + 1);
    };

    const cycleTextSize = () => {
        if (textSize === 'text-base') setTextSize('text-lg');
        else if (textSize === 'text-lg') setTextSize('text-xl');
        else setTextSize('text-base');
    };

    const hints = currentQuestion.metadata?.hints || [];

    return (
        <div className="max-w-screen-2xl mx-auto h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col pb-4">
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex mb-4 bg-white p-1 rounded-lg flex-shrink-0 border border-slate-200">
                <button
                    onClick={() => setMobileTab('passage')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mobileTab === 'passage' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                >
                    Passage
                </button>
                <button
                    onClick={() => setMobileTab('question')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mobileTab === 'question' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                >
                    Question
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 flex-1 overflow-hidden">
                {/* Passage Pane */}
                {passageText && (
                    <div className={`${mobileTab === 'passage' ? 'block' : 'hidden'} md:block h-full overflow-hidden`}>
                        <ReadingPassage
                            text={passageText}
                            textSize={textSize}
                            referencedText={currentQuestion.metadata?.referenced_text}
                            onTextSizeChange={cycleTextSize}
                        />
                    </div>
                )}

                {/* Question Pane */}
                <div className={`${mobileTab === 'passage' ? 'hidden' : 'block'} md:block h-full overflow-hidden flex flex-col`}>
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full">
                        {/* Question Text */}
                        <div className="p-8 border-b border-slate-200 bg-white flex-shrink-0">
                            <div className="mb-4 flex flex-wrap items-center gap-2">
                                <span className={`inline-block px-2 py-1 text-xs font-bold rounded uppercase tracking-wide ${currentQuestion.section === 'reading' ? 'bg-blue-50 text-blue-600' :
                                        currentQuestion.section === 'listening' ? 'bg-purple-50 text-purple-600' :
                                            currentQuestion.section === 'written' ? 'bg-orange-50 text-orange-600' :
                                                'bg-green-50 text-green-600'
                                    }`}>
                                    {currentQuestion.section || currentQuestion.skill_type || 'Reading'}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">
                                    Skill #{currentQuestion.skill_id}
                                </span>
                                {currentQuestion.metadata?.source === 'db' ? (
                                    <span className="inline-block px-2 py-1 text-xs font-bold rounded uppercase tracking-wide bg-white text-orange-500 border border-orange-500">📚 From Bank</span>
                                ) : (
                                    <span className="inline-block px-2 py-1 text-xs font-bold rounded uppercase tracking-wide bg-blue-50 text-slate-500 border border-slate-200">✨ AI Generated</span>
                                )}
                            </div>

                            <div className="text-left font-serif text-xl font-medium text-slate-800 leading-relaxed">
                                {isTyping && !showExplanation ? (
                                    <Typewriter
                                        text={currentQuestion.prompt}
                                        speed={15}
                                        onComplete={() => setIsTyping(false)}
                                    />
                                ) : (
                                    currentQuestion.prompt
                                )}

                                {hints.length > 0 && !showExplanation && (
                                    <div className="mt-4">
                                        <button
                                            onClick={handleRevealHint}
                                            disabled={hintsRevealed >= hints.length}
                                            className="text-sm text-orange-500 flex items-center hover:text-orange-600 disabled:opacity-50"
                                        >
                                            <HelpCircle className="w-4 h-4 mr-1" />
                                            {hintsRevealed === 0 ? "Need a hint?" : "Show next hint"}
                                        </button>
                                        {hintsRevealed > 0 && (
                                            <div className="mt-2 space-y-2">
                                                {hints.slice(0, hintsRevealed).map((hint, i) => (
                                                    <div key={i} className="text-sm bg-white p-2 rounded border border-orange-500 text-orange-600 animate-fade-in">
                                                        <span className="font-bold mr-1">Hint {i + 1}:</span> {hint}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Options */}
                        <div className="p-8 bg-white flex-1 overflow-y-auto">
                            <div className="grid gap-4 grid-cols-1">
                                {currentQuestion.choices.map((choiceText, idx) => {
                                    const isSelected = selectedAnswerIndex === idx;
                                    const isTheCorrectOne = isCorrectOption(currentQuestion, idx);
                                    const isEliminated = eliminatedIndices.includes(idx);
                                    const optionLabel = String.fromCharCode(65 + idx); // A, B, C, D

                                    const showOptions = !isTyping || showExplanation;

                                    let btnClass = "relative justify-start text-left h-auto py-3 px-4 border-slate-200 hover:border-blue-600 group";
                                    if (showExplanation) {
                                        if (isTheCorrectOne) btnClass = "justify-start text-left h-auto py-3 px-4 bg-blue-50 border-blue-600 text-blue-800 ring-1 ring-blue-600";
                                        else if (isSelected && !isTheCorrectOne) btnClass = "justify-start text-left h-auto py-3 px-4 bg-white border-orange-500 text-orange-800";
                                        else btnClass = "justify-start text-left h-auto py-3 px-4 opacity-50 border-slate-200";
                                    } else if (isSelected) {
                                        btnClass = "justify-start text-left h-auto py-3 px-4 ring-2 ring-blue-600 border-blue-600 bg-blue-50";
                                    } else if (isEliminated) {
                                        btnClass = "justify-start text-left h-auto py-3 px-4 bg-slate-50 text-slate-400 border-slate-200 opacity-70";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => !isEliminated && onAnswer(idx)}
                                            disabled={showExplanation}
                                            style={{
                                                transitionDelay: `${idx * 150}ms`,
                                                opacity: showOptions ? 1 : 0,
                                                transform: showOptions ? 'translateY(0)' : 'translateY(10px)',
                                            }}
                                            className={`flex items-center rounded-lg border transition-all duration-500 ease-out ${btnClass}`}
                                        >
                                            <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-slate-500 font-bold text-sm mr-3 border border-slate-200 ${isEliminated ? 'opacity-50' : ''}`}>
                                                {optionLabel}
                                            </span>
                                            <span className={`text-lg flex-1 ${isEliminated ? 'line-through decoration-slate-400 decoration-2' : 'text-slate-800'}`}>
                                                {choiceText}
                                            </span>
                                            {!showExplanation && (
                                                <div
                                                    onClick={(e) => handleToggleElimination(e, idx)}
                                                    className={`p-2 rounded-full hover:bg-blue-50 transition-colors ml-2 z-10 ${isEliminated ? 'text-orange-500 bg-white hover:bg-slate-50 opacity-100' : 'text-slate-400 opacity-40 hover:opacity-100'}`}
                                                    title="Eliminate Answer"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Explanation Section */}
            {showExplanation && (
                <div className="mt-6 space-y-6 animate-fade-in-up flex-shrink-0 pb-4">
                    <div className={`rounded-xl p-6 border-l-4 shadow-sm ${isCorrect ? 'bg-blue-50 border-blue-600' : 'bg-white border-orange-500'}`}>
                        <div className="flex items-start">
                            <div className="mr-4 mt-1">
                                {isCorrect ? <CheckCircle className="w-6 h-6 text-blue-600" /> : <X className="w-6 h-6 text-orange-500" />}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg mb-1 ${isCorrect ? 'text-blue-600' : 'text-orange-500'}`}>
                                    {isCorrect ? 'Correct!' : 'Incorrect'}
                                </h3>
                                <p className="text-slate-500 leading-relaxed mb-4">
                                    {currentQuestion.metadata?.explanation || 'No explanation available.'}
                                </p>
                            </div>
                        </div>
                        {/* Reading Strategy Section */}
                        {currentQuestion.metadata?.pattern_tip && (
                            <div className="mt-4 bg-white rounded-lg p-4 border border-blue-100 flex items-start shadow-sm">
                                <Lightbulb className="w-5 h-5 text-orange-500 mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reading Strategy</span>
                                    <p className="text-blue-600 font-medium italic">"{currentQuestion.metadata.pattern_tip}"</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-200">
                        <Button onClick={onNext} className="w-full md:w-auto text-lg px-8">
                            {isLastQuestion ? "Finish Quiz" : "Next Question"} <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Navigation for unanswered (Simulation Mode) */}
            {!showExplanation && isSimulation && (
                <div className="mt-6 flex justify-end flex-shrink-0 pb-4">
                    <Button onClick={onNext} className="px-8">
                        {isLastQuestion ? "Review & Submit" : "Next"} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};

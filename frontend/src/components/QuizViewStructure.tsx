import { CheckCircle, X, Lightbulb, ArrowRight, Ban, Sparkles } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { QuizData } from '../types';
import { isCorrectOption } from '../utils/quizCorrectness';

import { Button } from './Button';
import { Typewriter } from './Typewriter';

interface QuizViewStructureProps {
    currentQuestion: QuizData;
    selectedAnswerIndex: number | null;
    isCorrect: boolean;
    showExplanation: boolean;
    onAnswer: (index: number) => void;
    onNext: () => void;
    isLastQuestion?: boolean;
}

export const QuizViewStructure: React.FC<QuizViewStructureProps> = ({
    currentQuestion,
    selectedAnswerIndex,
    isCorrect,
    showExplanation,
    onAnswer,
    onNext,
    isLastQuestion = false,
}) => {
    const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
    const [isTyping, setIsTyping] = useState(true);
    const [activeTab, setActiveTab] = useState<'question' | 'explanation'>('question');

    // Reset state when question changes
    useEffect(() => {
        setEliminatedIndices([]);
        setIsTyping(true);
        setActiveTab('question'); // Reset tab
    }, [currentQuestion]);

    const handleToggleElimination = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (showExplanation) return;
        setEliminatedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    // Format prompt with blank highlight
    const formatPrompt = (text: string) => {
        const parts = text.split(/(_{2,})/g);
        return parts.map((part, i) => {
            if (/_{2,}/.test(part)) {
                return (
                    <span key={i} className="inline-block mx-1 px-4 py-1 bg-blue-100 border-b-2 border-blue-500 rounded font-bold text-blue-700">
                        _______
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className="max-w-2xl mx-auto flex flex-col h-full">
            <div className="bg-white rounded-[24px] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col h-full max-h-[calc(100vh-120px)]">

                {/* Header */}
                <div className="p-6 bg-gradient-to-b from-green-50/50 to-white border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                                Structure
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <span>Skill #{currentQuestion.skill_id}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span>CEFR {currentQuestion.cefr_target}</span>
                            </span>
                        </div>
                        {currentQuestion.metadata?.source === 'ai' && (
                            <div className="flex items-center text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
                                <Sparkles className="w-3 h-3 mr-1" /> AI Generated
                            </div>
                        )}
                        {currentQuestion.metadata?.source === 'db' && (
                            <div className="flex items-center text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                                📚 From Bank
                            </div>
                        )}
                    </div>

                    {/* Question Prompt */}
                    <div className="min-h-[100px] flex items-center">
                        <div className="font-serif text-xl leading-relaxed text-slate-800 w-full">
                            {isTyping && !showExplanation ? (
                                <Typewriter
                                    text={currentQuestion.prompt.replace(/_{2,}/g, '_______')}
                                    speed={15}
                                    onComplete={() => setIsTyping(false)}
                                />
                            ) : (
                                <div className="leading-relaxed">{formatPrompt(currentQuestion.prompt)}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs (Only visible when explanation is ready) */}
                {showExplanation && (
                    <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-2 gap-2 shrink-0">
                        <button
                            onClick={() => setActiveTab('question')}
                            className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'question'
                                ? 'border-green-500 text-green-700'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Question
                        </button>
                        <button
                            onClick={() => setActiveTab('explanation')}
                            className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'explanation'
                                ? 'border-blue-500 text-blue-700'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <span>Explanation</span>
                            {isCorrect ? (
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                            )}
                        </button>
                    </div>
                )}

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">

                    {/* Tab: Question (Options) */}
                    {(!showExplanation || activeTab === 'question') && (
                        <div className="p-6 bg-white min-h-full">
                            <div className="grid gap-3">
                                {currentQuestion.choices.map((choiceText, idx) => {
                                    const isSelected = selectedAnswerIndex === idx;
                                    const isTheCorrectOne = isCorrectOption(currentQuestion, idx);
                                    const isEliminated = eliminatedIndices.includes(idx);
                                    const optionLabel = String.fromCharCode(65 + idx);
                                    const showOptions = !isTyping || showExplanation;

                                    let btnClass = "relative w-full text-left py-3 px-4 border rounded-xl transition-all duration-200 group flex items-center";

                                    if (showExplanation) {
                                        if (isTheCorrectOne) {
                                            btnClass += " bg-green-50 border-green-500 text-green-900 ring-1 ring-green-500";
                                        } else if (isSelected && !isTheCorrectOne) {
                                            btnClass += " bg-red-50 border-red-500 text-red-900";
                                        } else {
                                            btnClass += " opacity-60 border-slate-100 bg-slate-50 grayscale";
                                        }
                                    } else if (isSelected) {
                                        btnClass += " ring-2 ring-green-500 border-green-500 bg-green-50 shadow-md";
                                    } else if (isEliminated) {
                                        btnClass += " bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed";
                                    } else {
                                        btnClass += " border-slate-200 hover:border-green-400 hover:bg-slate-50 hover:shadow-sm";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => !showExplanation && !isEliminated && onAnswer(idx)}
                                            disabled={showExplanation || isEliminated || isTyping}
                                            style={{
                                                opacity: showOptions ? 1 : 0,
                                                transform: showOptions ? 'translateY(0)' : 'translateY(10px)',
                                                transitionDelay: `${idx * 100}ms`
                                            }}
                                            className={btnClass}
                                        >
                                            <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm mr-3 border transition-colors ${showExplanation && isTheCorrectOne ? 'bg-green-600 border-green-600 text-white' :
                                                showExplanation && isSelected ? 'bg-red-500 border-red-500 text-white' :
                                                    isEliminated ? 'bg-slate-100 border-slate-200 text-slate-300' :
                                                        'bg-white border-slate-200 text-slate-500 group-hover:border-green-400 group-hover:text-green-600'
                                                }`}>
                                                {optionLabel}
                                            </span>
                                            <span className={`text-base font-medium flex-1 ${isEliminated ? 'line-through decoration-slate-300' : ''}`}>
                                                {choiceText}
                                            </span>
                                            {!showExplanation && (
                                                <div
                                                    onClick={(e) => handleToggleElimination(e, idx)}
                                                    className={`p-2 rounded-full transition-all ${isEliminated
                                                        ? 'text-orange-500 bg-orange-50 hover:bg-orange-100'
                                                        : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 'Next' button if in Question tab but already answered */}
                            {showExplanation && (
                                <div className="mt-8 pt-4 border-t border-slate-100 flex gap-3">
                                    <Button onClick={() => setActiveTab('explanation')} variant="outline" className="flex-1 py-3 text-slate-500">
                                        View Explanation
                                    </Button>
                                    <Button onClick={onNext} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700">
                                        {isLastQuestion ? "Finish Quiz" : "Next Question"} <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Explanation */}
                    {showExplanation && activeTab === 'explanation' && (
                        <div className="p-6 bg-slate-50 min-h-full animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className={`rounded-xl p-4 mb-4 flex items-center gap-4 border-l-4 ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                                }`}>
                                <div className={`p-2 rounded-full ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {isCorrect ? <CheckCircle className="w-6 h-6" /> : <X className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                        {isCorrect ? 'Correct!' : 'Incorrect'}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">Difficulty: {currentQuestion.difficulty_score}/100</p>
                                </div>
                            </div>

                            {currentQuestion.metadata?.pattern_tip && (
                                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex gap-3 items-start">
                                    <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[10px] font-bold text-yellow-800 uppercase tracking-wider mb-0.5">Grammar Tip</div>
                                        <div className="text-sm text-yellow-900 font-medium italic">"{currentQuestion.metadata.pattern_tip}"</div>
                                    </div>
                                </div>
                            )}

                            <div className="prose prose-sm prose-slate max-w-none text-slate-700 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-2">Detailed Explanation</h4>
                                <p className="leading-relaxed whitespace-pre-line">
                                    {currentQuestion.metadata?.explanation || "No detailed explanation available."}
                                </p>
                            </div>

                            <div className="mt-6">
                                <Button onClick={onNext} className="w-full shadow-lg shadow-green-200/50 py-3.5 text-base bg-green-600 hover:bg-green-700">
                                    {isLastQuestion ? "Finish Quiz" : "Next Question"} <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


import { CheckCircle, X, Lightbulb, ArrowRight, Ban, Sparkles, BookOpen, HelpCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { CanonicalQuestionV1 } from '../types';
import { isCorrectOption } from '../utils/quizCorrectness';

import { Button } from './Button';
import { Typewriter } from './Typewriter';

interface QuizCardProps {
    data: CanonicalQuestionV1;
    onAnswer: (index: number) => void;
    onNext: () => void;
    isAnswered: boolean;
    selectedOptionIndex: number | null;
}

export const QuizCard: React.FC<QuizCardProps> = ({
    data,
    onAnswer,
    onNext,
    isAnswered,
    selectedOptionIndex,
}) => {
    const [activeTab, setActiveTab] = useState<'question' | 'explanation'>('question');
    const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);

    // Determine if this is an Error Identification question
    // Rely on explicit interaction type, or fallback to tag detection for legacy/external data
    const isErrorId = data.interaction === 'identify_error' || /\{[A-D]\}/.test(data.prompt);

    // Initialize typing state based on content type. 
    // Disable typing for complex "Error ID" questions (with {A} tags) to prevent UI lockup.
    const [isTyping, setIsTyping] = useState(() => !isErrorId);

    // Reset state when data changes
    useEffect(() => {
        setEliminatedIndices([]);
        setActiveTab('question');
        setIsTyping(!isErrorId);
    }, [data, isErrorId]);

    // Auto-switch to Explanation tab when answered
    useEffect(() => {
        if (isAnswered) {
            const timer = setTimeout(() => setActiveTab('explanation'), 600);
            return () => clearTimeout(timer);
        }
    }, [isAnswered]);

    const toggleElimination = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        if (isAnswered) return;
        setEliminatedIndices(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const selectedText = selectedOptionIndex !== null ? data.choices[selectedOptionIndex] : null;
    const isCorrect = selectedOptionIndex !== null && isCorrectOption(data, selectedOptionIndex);

    // --- RENDERERS ---

    const renderPrompt = (text: string) => {
        // 1. Handle Error Identification (Written Expression)
        if (isErrorId) {
            const parts = text.split(/(\{.\}.*?\{\/.\})/g);

            return (
                <span className="inline-block leading-[3em] py-4">
                    {parts.map((part, i) => {
                        const match = part.match(/^\{([A-D])\}(.*)\{\/[A-D]\}$/);
                        if (match) {
                            const letter = match[1];
                            const content = match[2];
                            const idx = letter.charCodeAt(0) - 65;
                            const isSelected = selectedOptionIndex === idx;

                            // Check if this specific letter or its corresponding choice text is correct
                            const isTheCorrectOne = data.correct_response.includes(letter) ||
                                data.correct_response.includes(data.choices[idx]);

                            // Error styling in text
                            let styleClass = "border-b-2 border-blue-400 font-medium text-slate-800 px-1 transition-colors group-hover:bg-blue-50 group-hover:border-blue-600";
                            if (isAnswered) {
                                if (isTheCorrectOne) styleClass = "bg-green-100 border-b-2 border-green-500 text-green-900 px-1 rounded-sm"; // Real answer
                                else if (isSelected) styleClass = "bg-red-100 border-b-2 border-red-500 text-red-900 px-1 rounded-sm"; // Wrong selection
                            }

                            return (
                                <span
                                    key={i}
                                    onClick={() => !isAnswered && onAnswer(idx)}
                                    className={`inline-block mx-1.5 relative group cursor-pointer ${isAnswered ? '' : 'hover:-translate-y-0.5 transition-transform'}`}
                                >
                                    <span className={`text-[11px] font-black absolute -top-5 left-1/2 -translate-x-1/2 select-none ${isAnswered && isTheCorrectOne ? 'text-green-600 font-bold' :
                                            isAnswered && isSelected ? 'text-red-500 font-bold' : 'text-blue-600/70'
                                        }`}>
                                        {letter}
                                    </span>
                                    <span className={styleClass}>
                                        {content}
                                    </span>
                                </span>
                            );
                        }
                        return <span key={i} className="text-slate-700">{part}</span>;
                    })}
                </span>
            );
        }

        // 2. Fallback for Standard Fill-in-the-blank
        if (isTyping && !isAnswered) {
            return (
                <Typewriter
                    text={text.replace(/_{2,}/g, '_______')}
                    speed={15}
                    onComplete={() => setIsTyping(false)}
                />
            );
        }

        return (
            <div className="font-serif text-lg leading-relaxed text-slate-800 animate-fade-in">
                {text.replace(/_{2,}/g, '_______')}
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto flex flex-col h-full">

            {/* CARD CONTAINER */}
            <div className="bg-white rounded-[24px] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col relative z-10">

                {/* HEADER AREA (Prompt) */}
                <div className="p-6 bg-gradient-to-b from-blue-50/50 to-white border-b border-slate-100 relative">

                    {/* Meta Tags */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                                {data.skill_type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <span>ID: {data.skill_id}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span>CEFR {data.cefr_target}</span>
                            </span>
                        </div>
                        {data.metadata?.source === 'ai' && (
                            <div className="flex items-center text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100 animate-pulse">
                                <Sparkles className="w-3 h-3 mr-1" /> AI Generated
                            </div>
                        )}
                    </div>

                    {/* The Question Prompt */}
                    <div className="min-h-[80px] flex items-center">
                        <div className="font-serif text-lg leading-relaxed text-slate-800 w-full">
                            {renderPrompt(data.prompt)}
                        </div>
                    </div>
                </div>

                {/* TABS HEADER */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1">
                    <button
                        onClick={() => setActiveTab('question')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'question'
                            ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Question
                    </button>
                    <button
                        onClick={() => isAnswered && setActiveTab('explanation')}
                        disabled={!isAnswered}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'explanation'
                            ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5'
                            : !isAnswered
                                ? 'opacity-50 cursor-not-allowed text-slate-300'
                                : 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                            }`}
                    >
                        <HelpCircle className="w-4 h-4" />
                        Explanation
                        {isAnswered && !isCorrect && activeTab !== 'explanation' && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
                        )}
                    </button>
                </div>

                {/* TAB CONTENT AREA */}
                <div className="p-5 bg-white min-h-[300px]">

                    {/* TAB 1: OPTIONS */}
                    <div className={`transition-opacity duration-300 ${activeTab === 'question' ? 'block' : 'hidden'}`}>
                        <div className="grid gap-3">
                            {data.choices.map((choiceText, idx) => {
                                const isSelected = selectedOptionIndex === idx;
                                const isTheCorrectOne = isCorrectOption(data, idx);
                                const isEliminated = eliminatedIndices.includes(idx);
                                const optionLabel = String.fromCharCode(65 + idx);

                                let btnClass = "relative w-full text-left py-2.5 px-3 border rounded-xl transition-all duration-200 group flex items-center";

                                if (isAnswered) {
                                    if (isTheCorrectOne) {
                                        btnClass += " bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500";
                                    } else if (isSelected && !isTheCorrectOne) {
                                        btnClass += " bg-red-50 border-red-500 text-red-900";
                                    } else {
                                        btnClass += " opacity-60 border-slate-100 bg-slate-50 grayscale";
                                    }
                                } else if (isSelected) {
                                    btnClass += " ring-2 ring-blue-500 border-blue-500 bg-blue-50 shadow-md";
                                } else if (isEliminated) {
                                    btnClass += " bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed";
                                } else {
                                    btnClass += " border-slate-200 hover:border-blue-400 hover:bg-slate-50 hover:shadow-sm";
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => !isAnswered && !isEliminated && onAnswer(idx)}
                                        disabled={isAnswered || isEliminated || isTyping}
                                        className={btnClass}
                                    >
                                        <span className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg font-bold text-[10px] mr-3 border transition-colors ${isAnswered && isTheCorrectOne ? 'bg-blue-600 border-blue-600 text-white' :
                                            isAnswered && isSelected ? 'bg-red-500 border-red-500 text-white' :
                                                isEliminated ? 'bg-slate-100 border-slate-200 text-slate-300' :
                                                    'bg-white border-slate-200 text-slate-500 group-hover:border-blue-400 group-hover:text-blue-600'
                                            }`}>
                                            {optionLabel}
                                        </span>
                                        <span className={`text-sm font-medium flex-1 ${isEliminated ? 'line-through decoration-slate-300' : ''}`}>
                                            {choiceText === optionLabel ? `Part ${optionLabel}` : choiceText}
                                        </span>
                                        {!isAnswered && (
                                            <div
                                                onClick={(e) => toggleElimination(e, idx)}
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
                    </div>

                    {/* TAB 2: EXPLANATION */}
                    <div className={`transition-opacity duration-300 flex flex-col h-full ${activeTab === 'explanation' ? 'block' : 'hidden'}`}>

                        {/* Result Header */}
                        <div className={`rounded-xl p-4 mb-4 flex items-center gap-4 border-l-4 shadow-sm ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                            }`}>
                            <div className={`p-2 rounded-full ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {isCorrect ? <CheckCircle className="w-6 h-6" /> : <X className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                    {isCorrect ? 'Correct!' : 'Incorrect'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">Difficulty: {data.difficulty_score}/100</p>
                            </div>
                        </div>

                        {/* Pattern Tip */}
                        {data.metadata?.pattern_tip && (
                            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex gap-3 items-start">
                                <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-[10px] font-bold text-yellow-800 uppercase tracking-wider mb-0.5">Key Strategy</div>
                                    <div className="text-sm text-yellow-900 font-medium italic">"{data.metadata.pattern_tip}"</div>
                                </div>
                            </div>
                        )}

                        {/* Main Explanation */}
                        <div className="prose prose-sm prose-slate max-w-none text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1 overflow-y-auto max-h-[200px] custom-scrollbar">
                            <p className="leading-relaxed">
                                {data.metadata?.explanation || "No detailed explanation available."}
                            </p>
                        </div>

                        {/* Next Button */}
                        <div className="mt-5 pt-3 border-t border-slate-100">
                            <Button onClick={onNext} className="w-full shadow-lg shadow-blue-200/50 py-3.5 text-base">
                                Next Question <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

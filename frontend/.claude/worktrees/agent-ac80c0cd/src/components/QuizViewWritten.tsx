import { CheckCircle, X, Lightbulb, ArrowRight, Sparkles, MessageSquare, BookOpen } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { QuizData } from '../types';

import { Button } from './Button';

// Utility to escape regex special characters
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface QuizViewWrittenProps {
    currentQuestion: QuizData;
    selectedAnswerIndex: number | null;
    isCorrect: boolean;
    showExplanation: boolean;
    onAnswer: (index: number) => void;
    onNext: () => void;
    isLastQuestion?: boolean;
}

export const QuizViewWritten: React.FC<QuizViewWrittenProps> = ({
    currentQuestion,
    selectedAnswerIndex,
    isCorrect,
    showExplanation,
    onAnswer,
    onNext,
    isLastQuestion = false,
}) => {
    const [animateIn, setAnimateIn] = useState(false);
    const [activeTab, setActiveTab] = useState<'options' | 'explanation'>('options');

    // Reset when question changes
    useEffect(() => {
        setAnimateIn(false);
        setActiveTab('options');
        const timer = setTimeout(() => setAnimateIn(true), 50);
        return () => clearTimeout(timer);
    }, [currentQuestion]);

    // Extract choices from prompt tags {A}word{/A} format
    const extractTaggedWords = (text: string): { letter: string; word: string }[] => {
        const regex = /\{([A-D])\}(.*?)\{\/\1\}/g;
        const results: { letter: string; word: string }[] = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            results.push({ letter: match[1], word: match[2].trim() });
        }
        return results;
    };

    // Check if prompt has proper tags
    const hasProperTags = /\{[A-D]\}.*?\{\/[A-D]\}/g.test(currentQuestion.prompt);
    const taggedWords = hasProperTags ? extractTaggedWords(currentQuestion.prompt) : [];

    // Render the sentence with floating labels above underlined words
    const renderTaggedPrompt = (text: string) => {
        // First, proactively clean up LLM hallucinations where the tagged word
        // is duplicated outside the tag: e.g., "have {A}have{/A}" or "{B}been{/B} been".
        let cleanedText = text;

        // Strip any hallucinated extra tags beyond D (E-Z), leaving just their inner text
        cleanedText = cleanedText.replace(/\{([E-Z])\}(.*?)\{\/\1\}/g, '$2');

        const matches = [...cleanedText.matchAll(/\{([A-D])\}(.*?)\{\/\1\}/g)];

        // Process from right to left to avoid indices shifting
        for (let i = matches.length - 1; i >= 0; i--) {
            const match = matches[i];
            const fullTag = match[0];
            const innerWord = match[2].trim();
            const startIdx = match.index!;
            const endIdx = startIdx + fullTag.length;

            // Fast escape if innerWord is empty or too long
            if (!innerWord || innerWord.length > 30) continue;

            // Check if word appears immediately BEFORE the tag
            // e.g. "research {A}research{/A}"
            const beforeStr = cleanedText.substring(0, startIdx);
            const beforeRegex = new RegExp(`\\b${escapeRegExp(innerWord)}\\s+$`, 'i');
            if (beforeRegex.test(beforeStr)) {
                cleanedText = cleanedText.substring(0, startIdx).replace(beforeRegex, '') + cleanedText.substring(startIdx);
                continue; // We fixed one side, move to next tag
            }

            // Check if word appears immediately AFTER the tag
            // e.g. "{B}been{/B} been"
            const afterStr = cleanedText.substring(endIdx);
            const afterRegex = new RegExp(`^\\s+${escapeRegExp(innerWord)}\\b`, 'i');
            if (afterRegex.test(afterStr)) {
                cleanedText = cleanedText.substring(0, endIdx) + cleanedText.substring(endIdx).replace(afterRegex, '');
            }
        }

        const parts = cleanedText.split(/(\{[A-D]\}.*?\{\/[A-D]\})/g);

        return (
            <div className="font-serif text-lg leading-[2.5em] text-slate-800">
                {parts.map((part, i) => {
                    const match = part.match(/^\{([A-D])\}(.*?)\{\/[A-D]\}$/);
                    if (match) {
                        const letter = match[1];
                        const content = match[2];
                        const idx = letter.charCodeAt(0) - 65;
                        const isSelected = selectedAnswerIndex === idx;
                        const isTheCorrectOne = currentQuestion.correct_response.includes(letter) ||
                            currentQuestion.correct_response.includes(currentQuestion.choices[idx]);

                        // Styling based on state
                        let labelClass = "absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold select-none transition-all";
                        let underlineClass = "border-b-2 px-0.5 transition-all";

                        if (showExplanation) {
                            if (isTheCorrectOne) {
                                labelClass += " text-red-600"; // Red for error (correct answer = the error)
                                underlineClass += " border-red-500 text-red-700";
                            } else {
                                labelClass += " text-slate-400";
                                underlineClass += " border-slate-300 text-slate-600";
                            }
                        } else if (isSelected) {
                            labelClass += " text-orange-600";
                            underlineClass += " border-orange-500 bg-orange-50";
                        } else {
                            labelClass += " text-slate-500";
                            underlineClass += " border-slate-400";
                        }

                        return (
                            <span key={i} className="inline-block relative mx-0.5 cursor-pointer group" onClick={() => !showExplanation && onAnswer(idx)}>
                                <span className={labelClass}>{letter}</span>
                                <span className={underlineClass}>{content}</span>
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        );
    };

    // Get the actual choices - either from extracted tags or from choices array
    const displayChoices = taggedWords.length === 4
        ? taggedWords.map(t => t.word)
        : currentQuestion.choices;

    return (
        <div className="max-w-2xl mx-auto flex flex-col h-full">
            <div className={`bg-white rounded-[24px] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col h-full max-h-[calc(100vh-120px)] transition-all duration-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                {/* Header */}
                <div className="p-5 bg-gradient-to-b from-orange-50/50 to-white border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                                Written Expression
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                                ID: {currentQuestion.skill_id}
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-500 italic">
                            Identify the error
                        </span>
                    </div>

                    {/* Question Prompt with Tagged Words */}
                    <div className="py-4">
                        {hasProperTags ? (
                            renderTaggedPrompt(currentQuestion.prompt)
                        ) : (
                            <div className="font-serif text-lg text-slate-700 leading-relaxed">
                                {currentQuestion.prompt}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-white px-4 shrink-0">
                    <button
                        onClick={() => setActiveTab('options')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'options'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Options
                    </button>
                    <button
                        onClick={() => setActiveTab('explanation')}
                        disabled={!showExplanation}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'explanation'
                            ? 'border-blue-500 text-blue-600'
                            : showExplanation
                                ? 'border-transparent text-slate-400 hover:text-slate-600'
                                : 'border-transparent text-slate-300 cursor-not-allowed'
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        Explanation
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">

                    {/* Tab: Options */}
                    {activeTab === 'options' && (
                        <div className="p-5 min-h-full">
                            {/* 2x2 Grid Options */}
                            <div className="grid grid-cols-2 gap-3">
                                {displayChoices.map((choice, idx) => {
                                    const letter = String.fromCharCode(65 + idx);
                                    const isSelected = selectedAnswerIndex === idx;
                                    const isTheCorrectOne = currentQuestion.correct_response.includes(letter) ||
                                        currentQuestion.correct_response.includes(choice);

                                    let btnClass = "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left";

                                    if (showExplanation) {
                                        if (isTheCorrectOne) {
                                            btnClass += " bg-red-50 border-red-300 text-red-800"; // Red = error found
                                        } else if (isSelected) {
                                            btnClass += " bg-slate-100 border-slate-300 text-slate-600";
                                        } else {
                                            btnClass += " bg-white border-slate-200 text-slate-500 opacity-60";
                                        }
                                    } else if (isSelected) {
                                        btnClass += " bg-orange-50 border-orange-400 text-orange-800 ring-2 ring-orange-200";
                                    } else {
                                        btnClass += " bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/50";
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => !showExplanation && onAnswer(idx)}
                                            disabled={showExplanation}
                                            className={btnClass}
                                        >
                                            <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-bold ${isSelected && !showExplanation
                                                ? 'bg-orange-500 text-white'
                                                : showExplanation && isTheCorrectOne
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {letter}
                                            </span>
                                            <span className="font-medium">{choice}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Next / View Explanation button after answering */}
                            {showExplanation && (
                                <div className="mt-6 flex gap-3">
                                    <Button
                                        onClick={() => setActiveTab('explanation')}
                                        variant="outline"
                                        className="flex-1 py-3 text-slate-600"
                                    >
                                        View Explanation
                                    </Button>
                                    <Button onClick={onNext} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white">
                                        {isLastQuestion ? "Finish Quiz" : "Next Question"} <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Explanation */}
                    {activeTab === 'explanation' && showExplanation && (
                        <div className="p-5 min-h-full animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className={`rounded-xl p-4 mb-4 flex items-center gap-4 border-l-4 ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                                }`}>
                                <div className={`p-2 rounded-full ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {isCorrect ? <CheckCircle className="w-6 h-6" /> : <X className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                                        {isCorrect ? 'Correct!' : 'Incorrect'}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        The error is in Part <strong className="text-slate-700">{currentQuestion.correct_response[0]}</strong>
                                    </p>
                                </div>
                            </div>

                            {currentQuestion.metadata?.pattern_tip && (
                                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex gap-3 items-start">
                                    <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[10px] font-bold text-yellow-800 uppercase tracking-wider mb-0.5">Grammar Rule</div>
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
                                <Button onClick={onNext} className="w-full shadow-lg shadow-orange-200/50 py-3.5 text-base bg-orange-600 hover:bg-orange-700">
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

import { X, ChevronRight, ChevronLeft, BookOpen, Award, CheckCircle, Play } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { REVIEWER_TUTORIAL, completeTutorial } from '../../services/qualificationService';
import { Button } from '../Button';
import { useToast } from '../ui/Toast';

interface OnboardingModalProps {
    userId: string;
    onComplete: () => void;
    onSkip: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
    userId,
    onComplete,
    onSkip
}) => {
    const toast = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);
    const tutorial = REVIEWER_TUTORIAL;
    const step = tutorial.steps[currentStep];
    const isLastStep = currentStep === tutorial.steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            handleComplete();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        setCurrentStep(prev => Math.max(0, prev - 1));
    };

    const handleComplete = async () => {
        setIsCompleting(true);
        try {
            const success = await completeTutorial(userId);
            if (success) {
                toast.success('Tutorial completed! You can now review essays.');
                onComplete();
            } else {
                toast.error('Failed to save progress. Please try again.');
            }
        } catch (error) {
            console.error('[Onboarding] Complete failed:', error);
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsCompleting(false);
        }
    };

    const renderStepContent = () => {
        switch (step.type) {
            case 'example':
                return (
                    <div className="space-y-4">
                        {step.example && (
                            <>
                                {/* Essay */}
                                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                                    <div className="text-xs font-bold text-slate-500 mb-2">SAMPLE ESSAY</div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-serif">
                                        {step.example.essay_content}
                                    </div>
                                </div>

                                {/* Sample Review */}
                                <div className="bg-indigo-50 dark:bg-indigo-950 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-3">SAMPLE REVIEW</div>
                                    
                                    {/* Scores */}
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                        {Object.entries(step.example.sample_review.scores).map(([key, value]) => (
                                            <div key={key} className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
                                                <div className="text-xs text-slate-500">{key.charAt(0).toUpperCase()}</div>
                                                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Feedback */}
                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <span className="font-bold text-green-600">Strengths:</span>{' '}
                                            <span className="text-slate-600 dark:text-slate-400">{step.example.sample_review.strengths}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-orange-600">Weaknesses:</span>{' '}
                                            <span className="text-slate-600 dark:text-slate-400">{step.example.sample_review.weaknesses}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Explanation */}
                                <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">💡 EXPLANATION</div>
                                    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                        {step.example.explanation}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                );

            case 'video':
                return (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl aspect-video flex items-center justify-center">
                        <div className="text-center">
                            <Play className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Video content coming soon</p>
                        </div>
                    </div>
                );

            case 'interactive':
                return (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6 text-center">
                        <p className="text-slate-600 dark:text-slate-400">Interactive exercise coming soon</p>
                    </div>
                );

            case 'text':
            default:
                return (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-6">
                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {step.content.split('\n').map((line, idx) => {
                                // Handle bold text
                                const parts = line.split(/\*\*(.*?)\*\*/);
                                return (
                                    <p key={idx} className="mb-2">
                                        {parts.map((part, partIdx) => 
                                            partIdx % 2 === 1 
                                                ? <strong key={partIdx} className="font-bold text-slate-900 dark:text-white">{part}</strong>
                                                : part
                                        )}
                                    </p>
                                );
                            })}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">
                                {tutorial.title}
                            </h3>
                            <p className="text-xs text-slate-500">
                                Step {currentStep + 1} of {tutorial.steps.length}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onSkip}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                        Skip tutorial
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-slate-200 dark:bg-slate-800">
                    <div 
                        className="h-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${((currentStep + 1) / tutorial.steps.length) * 100}%` }}
                    />
                </div>

                {/* Step Title */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                        {step.title}
                    </h4>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {renderStepContent()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                    </Button>

                    <div className="flex gap-1">
                        {tutorial.steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                    idx === currentStep
                                        ? 'bg-indigo-600'
                                        : idx < currentStep
                                            ? 'bg-indigo-300 dark:bg-indigo-700'
                                            : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                            />
                        ))}
                    </div>

                    <Button
                        variant="primary"
                        onClick={handleNext}
                        disabled={isCompleting}
                    >
                        {isLastStep ? (
                            <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Complete
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, PenTool, Award, ChevronRight, CheckCircle2,
    AlertCircle, GraduationCap, ArrowRight, RefreshCw, ChevronDown, Check,
    MoveRight, Info, PlusCircle, LogOut, Share2, MoreHorizontal, Loader2,
    Lightbulb, BookOpen
} from 'lucide-react';
import React, { useState, useEffect, useRef, useMemo } from 'react';

import { useAuth } from '../../hooks/useAuth';
import sessionPersistenceService, { useSessionPersistence } from '../../services/sessionPersistenceService';
import { writingGymService } from '../../services/writingGymService';
import { AppView, WritingExercise } from '../../types';
import { getGuestUserId } from '../../utils/guestUser';
import { parseMarkdownContent, renderParsedContent } from '../../utils/markdownParser';
import { Button } from '../Button';

const STEP_LABELS = ['Topic Sentence', 'Supporting Details', 'Concluding Sentence'];

const STEP_INSTRUCTIONS = [
    'Choose the best topic sentence to introduce the main idea of this paragraph.',
    'Choose the best supporting detail or example to develop the argument.',
    'Choose the best concluding sentence to wrap up the paragraph.',
];

const EXAMPLE_PARAGRAPHS: Record<string, { band7: string; band8: string; band9: string }> = {
    'technology': {
        band7: 'Technology has changed the way people communicate. Social media platforms allow people to connect with friends and family around the world. In conclusion, technology has made communication faster and easier.',
        band8: 'The proliferation of digital technology has fundamentally altered human communication patterns. Platforms such as WhatsApp and Zoom enable instantaneous contact across geographical boundaries, eliminating the delays that once characterized international correspondence. Consequently, technology has compressed both time and distance in meaningful ways.',
        band9: 'The exponential advancement of digital communication technology has irrevocably transformed interpersonal relations on a global scale. Sophisticated platforms now facilitate not merely the transmission of text, but the seamless exchange of nuanced emotional expression through video, audio, and interactive media—capabilities that were inconceivable two decades ago. This technological revolution has, therefore, not simply expedited communication but has qualitatively enriched the depth and immediacy of human connection.',
    },
    'education': {
        band7: 'Education is very important for young people. Schools teach students many subjects like mathematics and science. Therefore, education helps people get better jobs in the future.',
        band8: 'Quality education equips young people with the critical thinking skills and technical knowledge required to thrive in a competitive global economy. Beyond academic content, schools cultivate social competencies—collaboration, communication, and adaptability—that employers consistently rank among the most desirable graduate attributes. Education is therefore an investment that yields dividends not only for individuals but for society as a whole.',
        band9: 'A rigorous, well-resourced education system constitutes the most reliable mechanism through which societies can cultivate the intellectual capital necessary for sustained economic and social progress. Schools that prioritise both subject mastery and metacognitive development produce graduates capable not merely of performing predefined tasks but of innovating, questioning assumptions, and adapting to rapidly evolving professional landscapes. It is this dual emphasis on knowledge and adaptability that distinguishes a truly transformative education from mere instruction.',
    },
    'environment': {
        band7: 'The environment is facing many serious problems today. Pollution from factories and cars is damaging the air and water. As a result, governments must take action to protect nature.',
        band8: 'Contemporary environmental degradation, driven primarily by industrial emissions and unsustainable consumption patterns, poses an existential threat to biodiversity and human health alike. Rising atmospheric carbon concentrations are accelerating climate change, with measurable consequences ranging from glacier retreat to the increased frequency of extreme weather events. It is therefore imperative that governments implement binding carbon reduction targets and transition economies toward renewable energy sources.',
        band9: 'The accelerating deterioration of global ecosystems, precipitated by unchecked industrialisation and the collective failure to internalise environmental externalities in economic decision-making, represents perhaps the defining governance challenge of the twenty-first century. The interconnected crises of climate disruption, biodiversity collapse, and freshwater scarcity do not respect national boundaries, rendering unilateral policy responses fundamentally inadequate. Only through coordinated multilateral frameworks that align economic incentives with ecological sustainability can nations hope to avert the most catastrophic projections outlined in successive IPCC assessments.',
    },
};

export const IELTSParagraphLevel: React.FC<{ onNavigate: (view: AppView) => void }> = ({ onNavigate }) => {
    const { user } = useAuth();
    const userId = user?.id || getGuestUserId();
    const {
        createSession,
        updateSession: updatePersistedSession,
        completeSession: completePersistedSession,
        abandonSession,
        startFresh
    } = useSessionPersistence(userId, 'ielts_paragraph');

    const [status, setStatus] = useState<'loading' | 'playing' | 'summary' | 'recovery_prompt'>('loading');
    const [exercise, setExercise] = useState<WritingExercise | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [builtParagraph, setBuiltParagraph] = useState<string[]>([]);
    const [currentBandScore, setCurrentBandScore] = useState(6.0);
    const [selections, setSelections] = useState<any[]>([]);
    const [isPromptOpen, setIsPromptOpen] = useState(true);
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const [wordCount, setWordCount] = useState(0);
    const [savedSessionData, setSavedSessionData] = useState<any>(null);
    const [isExamplesOpen, setIsExamplesOpen] = useState(false);
    const [cohesionFeedback, setCohesionFeedback] = useState<{
        cohesionScore: number;
        logicalFlow: string;
        topicUnity: string;
        suggestions: string[];
    } | null>(null);
    const [isCohesionLoading, setIsCohesionLoading] = useState(false);

    // Scroll ref for auto-scrolling to new steps
    const stepsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            const recovery = await sessionPersistenceService.getActiveSession(userId, 'ielts_paragraph');
            if (recovery.hasSession && recovery.session) {
                setSavedSessionData(recovery.session);
                setStatus('recovery_prompt');
            } else {
                loadExercise();
            }
        };
        init();
    }, [userId]);

    // Update word count when paragraph changes
    useEffect(() => {
        const text = builtParagraph.join(" ");
        setWordCount(text.trim().split(/\s+/).filter(w => w.length > 0).length);
    }, [builtParagraph]);

    const loadExercise = async () => {
        setStatus('loading');
        setCurrentStepIndex(0);
        setBuiltParagraph([]);
        setCurrentBandScore(6.0);
        setSelections([]);
        setSelectedOptionId(null);
        setIsPromptOpen(true);
        setCohesionFeedback(null);
        setIsExamplesOpen(false);
        try {
            const data = await writingGymService.generateExercise('ielts_paragraph', 'generic');

            // Shuffle options for each step
            if (data?.ielts_data?.steps) {
                data.ielts_data.steps.forEach((step: any) => { // Explicit any to avoid TS issues if type not fully defined
                    if (step.options && Array.isArray(step.options)) {
                        for (let i = step.options.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [step.options[i], step.options[j]] = [step.options[j], step.options[i]];
                        }
                    }
                });
            }

            setExercise(data);
            setStatus('playing');
            createSession({
                stepIndex: 0,
                bandScore: 6.0,
                exerciseData: data,
                builtParagraph: [],
                selections: []
            }).catch(() => { });
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectOption = (option: any) => {
        setSelectedOptionId(option.id);
    };

    const handleConfirmSelection = () => {
        if (!exercise?.ielts_data?.steps || !selectedOptionId) return;

        const currentStep = exercise.ielts_data.steps[currentStepIndex];
        const selectedOption = currentStep.options.find((opt: any) => opt.id === selectedOptionId);

        if (!selectedOption) return;

        // Track new selection
        const newSelections = [...selections, { ...selectedOption, stepType: currentStep.step_type }];
        setSelections(newSelections);

        // Update Paragraph Draft
        const newParagraph = [...builtParagraph, selectedOption.text];
        setBuiltParagraph(newParagraph);

        // Calculate Weighted Average Score
        const totalBand = newSelections.reduce((sum, sel) => sum + sel.band_level, 0);
        const rawAverage = newSelections.length > 0 ? totalBand / newSelections.length : 6.0;
        const newScore = Math.round(rawAverage * 2) / 2;
        setCurrentBandScore(newScore);

        // Auto-collapse prompt
        if (currentStepIndex === 0) setIsPromptOpen(false);

        // Reset selection for next step
        setSelectedOptionId(null);

        if (currentStepIndex < exercise.ielts_data.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
            updatePersistedSession({
                stepIndex: currentStepIndex + 1,
                bandScore: newScore,
                builtParagraph: newParagraph,
                selections: newSelections
            }).catch(() => { });
        } else {
            setStatus('summary');
            completePersistedSession().catch(() => { });
            if (newScore >= 7.5) {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
            }
        }
    };

    const handleResumeSession = () => {
        if (!savedSessionData) return;
        const state = savedSessionData.gameState;
        setExercise(state.exerciseData);
        setCurrentStepIndex(state.stepIndex || 0);
        setBuiltParagraph(state.builtParagraph || []);
        setCurrentBandScore(state.bandScore || 6.0);
        setSelections(state.selections || []);
        setSelectedOptionId(null);
        setStatus('playing');
        setIsPromptOpen(state.stepIndex === 0);
    };

    const handleStartFresh = async () => {
        await startFresh();
        loadExercise();
    };

    const handleGetCohesionFeedback = async () => {
        if (selections.length < 3) return;
        setIsCohesionLoading(true);
        try {
            const topic = exercise?.ielts_data?.task_prompt?.split('\n')[0].replace(/#+\s*/, '') || 'Academic Writing';
            const result = await writingGymService.evaluateParagraphCohesion(
                selections[0]?.text ?? '',
                selections[1]?.text ?? '',
                selections[2]?.text ?? '',
                topic
            );
            setCohesionFeedback(result);
        } finally {
            setIsCohesionLoading(false);
        }
    };

    const matchingExamples = useMemo((): { band7: string; band8: string; band9: string } | null => {
        const prompt = (exercise?.ielts_data?.task_prompt || '').toLowerCase();
        for (const key of Object.keys(EXAMPLE_PARAGRAPHS)) {
            if (prompt.includes(key)) return EXAMPLE_PARAGRAPHS[key];
        }
        return null;
    }, [exercise]);

    if (status === 'loading') return (
        <div className="flex flex-col h-full items-center justify-center bg-slate-50 gap-6">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full" />
            <p className="text-blue-900 font-bold">Consulting Examiner...</p>
        </div>
    );

    if (status === 'recovery_prompt') return (
        <div className="flex flex-col h-full items-center justify-center bg-slate-50 gap-6 p-4 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <RefreshCw className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Resume Exercise?</h2>
            <p className="text-slate-600 max-w-sm">
                You have an unfinished IELTS Paragraph Builder exercise. Would you like to pick up where you left off?
            </p>
            <div className="flex gap-4 mt-4 w-full max-w-sm font-bold">
                <Button variant="secondary" onClick={handleStartFresh} className="flex-1 py-3">Start Fresh</Button>
                <Button onClick={handleResumeSession} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white border-blue-700">Resume</Button>
            </div>
        </div>
    );

    const currentStep = exercise?.ielts_data?.steps[currentStepIndex];
    const progress = ((currentStepIndex) / (exercise?.ielts_data?.steps.length || 1)) * 100;

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => onNavigate(AppView.WRITING_GYM_HUB)} className="-ml-2 p-2 hover:bg-slate-100 rounded-full h-auto w-auto" aria-label="Go back to Writing Gym Hub">
                        <ArrowLeft className="w-6 h-6 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-slate-900 text-base leading-tight">Writing Gym</h1>
                        <p className="text-xs text-slate-500 font-medium">IELTS Task 2 Builder</p>
                    </div>
                </div>

                {status === 'playing' && (
                    <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-full pr-4 pl-1 py-1 shadow-sm" role="status" aria-label={`Current band score: ${currentBandScore.toFixed(1)}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 relative ${currentBandScore >= 7.5 ? 'border-green-400 text-green-700' : currentBandScore >= 6.5 ? 'border-blue-400 text-blue-700' : 'border-amber-400 text-amber-700'}`}>
                            <span className="text-xs font-black">{currentBandScore.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Score</span>
                            <span className={`text-xs font-bold leading-none ${currentBandScore >= 7.5 ? 'text-green-600' : currentBandScore >= 6.5 ? 'text-blue-600' : 'text-amber-600'}`}>
                                {currentBandScore >= 7.5 ? 'Excellent' : currentBandScore >= 6.5 ? 'Good' : 'Average'}
                            </span>
                        </div>
                    </div>
                )}

                {status === 'summary' && (
                    <Button variant="ghost" className="p-2 hover:bg-slate-100 rounded-full">
                        <Share2 className="w-5 h-5 text-slate-600" />
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 custom-scrollbar">
                <div className="max-w-md mx-auto space-y-4">

                    {status === 'playing' && (
                        <>
                            {/* Collapsible Task Prompt */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setIsPromptOpen(!isPromptOpen)}
                                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                                    aria-expanded={isPromptOpen}
                                    aria-label="Toggle task prompt"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide shrink-0">
                                            Task Prompt
                                        </span>
                                        <span className="font-bold text-slate-700 text-sm truncate">
                                            {exercise?.ielts_data?.task_prompt.split('\n')[0].replace(/#+\s*/, '') || "Writing Task"}
                                        </span>
                                    </div>
                                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isPromptOpen ? '-rotate-90' : 'rotate-90'}`} />
                                </button>

                                <AnimatePresence>
                                    {isPromptOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden bg-white"
                                        >
                                            <div className="px-5 pb-5 pt-0">
                                                <div className="h-px w-full bg-slate-100 mb-4" />
                                                <div
                                                    className="text-sm text-slate-600 leading-relaxed"
                                                    dangerouslySetInnerHTML={{
                                                        __html: renderParsedContent(
                                                            parseMarkdownContent(exercise?.ielts_data?.task_prompt || '')
                                                        )
                                                    }}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Paragraph Draft */}
                            <div className="bg-blue-50/80 rounded-2xl border border-blue-100 p-4 transition-all duration-300">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <PenTool className="w-3 h-3 text-blue-500" />
                                        <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider">
                                            Paragraph Draft
                                        </h3>
                                    </div>
                                    <span className="text-[10px] font-mono font-medium text-blue-400 bg-white/50 px-2 py-0.5 rounded-full">
                                        Word Count: {wordCount}
                                    </span>
                                </div>
                                <div className="space-y-1 min-h-[80px]">
                                    {builtParagraph.length === 0 ? (
                                        <p className="text-blue-300 italic text-sm font-medium">
                                            | Your paragraph will appear here as you build it below...
                                        </p>
                                    ) : (
                                        <p className="text-blue-900 text-sm leading-relaxed">
                                            {builtParagraph.join(" ")}
                                            <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse align-middle ml-1" />
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Step Progress Stepper */}
                            <div className="mt-5 mb-1 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
                                <div className="flex items-center justify-between">
                                    {STEP_LABELS.map((label, idx) => {
                                        const isDone = idx < currentStepIndex;
                                        const isActive = idx === currentStepIndex;
                                        return (
                                            <React.Fragment key={idx}>
                                                <div className="flex flex-col items-center gap-1 flex-1">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isDone ? 'bg-green-100 text-green-600' : isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                                                    </div>
                                                    <span className={`text-[10px] font-semibold text-center leading-tight max-w-[72px] ${isDone ? 'text-slate-400' : isActive ? 'text-blue-700' : 'text-slate-300'}`}>
                                                        {label}
                                                    </span>
                                                </div>
                                                {idx < STEP_LABELS.length - 1 && (
                                                    <div className={`h-px flex-shrink-0 w-6 mx-1 mb-4 ${idx < currentStepIndex ? 'bg-green-300' : 'bg-slate-200'}`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step Instruction */}
                            <p className="text-sm text-slate-500 leading-normal mt-3 mb-1 px-1">
                                {STEP_INSTRUCTIONS[currentStepIndex] ?? 'Choose the next part of your paragraph.'}
                            </p>

                            {/* See Examples Panel */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-2">
                                <button
                                    onClick={() => setIsExamplesOpen(!isExamplesOpen)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                                    aria-expanded={isExamplesOpen}
                                    aria-label="Toggle band examples"
                                >
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span className="text-sm font-semibold text-slate-700">See Band 7 / 8 / 9 Examples</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExamplesOpen ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {isExamplesOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100">
                                                {matchingExamples ? (
                                                    (['band9', 'band8', 'band7'] as const).map((band) => (
                                                        <div key={band} className={`rounded-xl p-3 ${band === 'band9' ? 'bg-green-50 border border-green-100' : band === 'band8' ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${band === 'band9' ? 'text-green-600' : band === 'band8' ? 'text-blue-600' : 'text-amber-600'}`}>
                                                                {band === 'band9' ? 'Band 9' : band === 'band8' ? 'Band 8' : 'Band 7'}
                                                            </span>
                                                            <p className="text-xs text-slate-700 leading-relaxed mt-1">{matchingExamples[band]}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic pt-3">No pre-loaded examples for this topic. Try your best!</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Options List */}
                            <div className="space-y-3 pb-8" role="radiogroup" aria-label={`Step ${currentStepIndex + 1} options`}>
                                {currentStep?.options?.map((option: any) => {
                                    const isSelected = selectedOptionId === option.id;
                                    const isHighBand = option.band_level >= 7.5;

                                    return (
                                        <motion.div
                                            key={option.id}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleSelectOption(option)}
                                            role="radio"
                                            aria-checked={isSelected}
                                            aria-label={`Option: ${option.text.substring(0, 50)}...`}
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSelectOption(option)}
                                            className={`
                                                relative p-5 rounded-2xl border-2 transition-all cursor-pointer bg-white group
                                                ${isSelected
                                                    ? 'border-blue-500 shadow-lg shadow-blue-100 ring-1 ring-blue-500 z-10'
                                                    : 'border-slate-100 shadow-sm hover:border-slate-300'
                                                }
                                            `}
                                        >
                                            <div className="flex gap-4 items-start">
                                                {/* Radio Circle */}
                                                <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300 group-hover:border-slate-400'
                                                    }`}>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>

                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium leading-relaxed transition-colors ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                                                        {option.text}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {status === 'summary' && (
                        <div className="text-center pt-4">
                            <div className="mb-2 uppercase tracking-widest text-xs font-bold text-slate-400">Overall Band Score</div>

                            {/* Score Circle */}
                            <div className="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        className="text-slate-100"
                                    />
                                    <circle
                                        cx="96"
                                        cy="96"
                                        r="88"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="transparent"
                                        strokeDasharray={552}
                                        strokeDashoffset={552 - (552 * Math.min(currentBandScore / 9, 1))}
                                        strokeLinecap="round"
                                        className={`${currentBandScore >= 7.5 ? 'text-green-500' : currentBandScore >= 6.5 ? 'text-blue-500' : 'text-amber-500'} transition-all duration-1000 ease-out`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-slate-900">{currentBandScore.toFixed(1)}</span>
                                    {currentBandScore >= 7.5 && <span className="text-green-500 font-bold text-sm bg-green-50 px-2 py-0.5 rounded mt-1">Great Job!</span>}
                                </div>
                            </div>

                            <p className="text-slate-600 text-sm leading-relaxed mb-8 px-4">
                                You are approaching <strong>C1 Proficiency</strong>. Your structure is solid, but vocabulary range could be wider.
                            </p>

                            <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="font-bold text-slate-900 text-lg">Detailed Feedback</h3>
                                <MoreHorizontal className="text-slate-300 w-5 h-5" />
                            </div>

                            <div className="space-y-4 text-left">
                                {selections.map((sel, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
                                            <span className="text-xs font-bold uppercase text-slate-400">Step {idx + 1}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sel.band_level >= 7.5 ? 'bg-green-100 text-green-700' :
                                                sel.band_level >= 6.5 ? 'bg-blue-100 text-blue-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                Band {sel.band_level}
                                            </span>
                                        </div>

                                        <div className="mb-4">
                                            <p className="text-sm font-medium text-slate-800 italic leading-relaxed">
                                                "{sel.text}"
                                            </p>
                                        </div>

                                        <div className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl">
                                            {sel.band_level >= 7.5 ?
                                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> :
                                                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                            }
                                            <p className="text-xs text-slate-600 leading-snug">
                                                {sel.feedback || "Good choice for this context."}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* AI Cohesion Feedback */}
                            <div className="mt-6 text-left">
                                {!cohesionFeedback ? (
                                    <button
                                        onClick={handleGetCohesionFeedback}
                                        disabled={isCohesionLoading}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors shadow-lg shadow-indigo-100"
                                    >
                                        {isCohesionLoading ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating Cohesion...</>
                                        ) : (
                                            <><Lightbulb className="w-4 h-4" /> Get Cohesion Feedback</>
                                        )}
                                    </button>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-4"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase tracking-wide text-indigo-400">AI Cohesion Report</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-2xl font-black ${cohesionFeedback.cohesionScore >= 75 ? 'text-green-600' : cohesionFeedback.cohesionScore >= 55 ? 'text-blue-600' : 'text-amber-600'}`}>
                                                    {cohesionFeedback.cohesionScore}
                                                </span>
                                                <span className="text-xs text-slate-400 font-medium">/100</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 mb-0.5">Logical Flow</p>
                                                <p className="text-sm text-slate-700 leading-relaxed">{cohesionFeedback.logicalFlow}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 mb-0.5">Topic Unity</p>
                                                <p className="text-sm text-slate-700 leading-relaxed">{cohesionFeedback.topicUnity}</p>
                                            </div>
                                            {cohesionFeedback.suggestions.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 mb-1.5">Suggestions</p>
                                                    <ul className="space-y-1.5">
                                                        {cohesionFeedback.suggestions.map((s, i) => (
                                                            <li key={i} className="flex gap-2 items-start text-sm text-slate-700">
                                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="h-24"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                <div className="max-w-md mx-auto flex gap-3">
                    {status === 'playing' ? (
                        <>
                            <Button
                                variant="secondary"
                                className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 border-slate-200 bg-slate-50"
                                aria-label={currentStepIndex > 0 ? 'Go to previous step' : 'Go back to Writing Gym Hub'}
                                onClick={() => {
                                    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
                                    else onNavigate(AppView.WRITING_GYM_HUB);
                                }}
                            >
                                Back
                            </Button>
                            <Button
                                className={`flex-[2] py-3.5 rounded-xl font-bold text-white shadow-lg transition-all ${selectedOptionId
                                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 cursor-pointer opacity-100'
                                    : 'bg-slate-300 cursor-not-allowed opacity-50 shadow-none'
                                    }`}
                                onClick={handleConfirmSelection}
                                disabled={!selectedOptionId}
                                aria-label="Confirm your selection and continue"
                            >
                                Confirm Selection <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </>
                    ) : status === 'summary' ? (
                        <div className="flex flex-col gap-3 w-full">
                            <Button
                                onClick={loadExercise}
                                className="w-full py-4 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200"
                            >
                                <PlusCircle className="w-5 h-5 mr-2" /> Start New Topic
                            </Button>
                            <Button
                                onClick={() => onNavigate(AppView.DASHBOARD)}
                                variant="secondary"
                                className="w-full py-4 rounded-xl font-bold text-slate-500 hover:text-slate-700"
                            >
                                Exit to Dashboard
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>

        </div>
    );
};

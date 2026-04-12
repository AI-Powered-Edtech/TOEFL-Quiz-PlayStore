import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Clock, BookOpen, Headphones, Wrench, FileEdit,
    Loader2, Check, AlertCircle, HelpCircle, Lock, Crown,
    X, Play, Lightbulb, Bot, Eye, Database, GraduationCap,
    MoreHorizontal, Coffee, ChevronRight, Timer, Trophy,
    BarChart3, Target, Zap, ArrowRight
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useFullSimulation } from '../hooks/simulation/useFullSimulation';
import { useSimulationTimer } from '../hooks/simulation/useSimulationTimer';
import { useSubscription } from '../hooks/useSubscription';
import { questionBank, getAllQuestions } from '../services/questionBankService';
import {
    AppView, QuizData, DEFAULT_SIMULATION_CONFIG, MIN_SIMULATION_CONFIG,
    SIMULATION_SECTIONS_ORDER, FullSimulationPhase,
} from '../types';

import PaywallSheet from './PaywallSheet';

// ─── Icon Map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
    BookOpen: <BookOpen className="w-5 h-5" />,
    Headphones: <Headphones className="w-5 h-5" />,
    Wrench: <Wrench className="w-5 h-5" />,
    FileEdit: <FileEdit className="w-5 h-5" />,
};

// ─── Component ───────────────────────────────────────────────────────────────

interface SimulationViewProps {
    onNavigate: (view: AppView) => void;
    onStartQuizWithQuestions?: (questions: QuizData[]) => void;
}

export const SimulationView: React.FC<SimulationViewProps> = ({ onNavigate }) => {
    const { tier, isPaid } = useSubscription();
    const [showPaywall, setShowPaywall] = useState(false);

    const sim = useFullSimulation();

    // Per-section timer
    const onTimeUp = useCallback(() => {
        // Auto-submit with current answers when time runs out
        handleSubmitSection();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const timer = useSimulationTimer(onTimeUp);

    // Track answers for current section
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showExplanation, setShowExplanation] = useState(false);

    // DB availability counts
    const [availableCounts, setAvailableCounts] = useState({
        reading: 0, listening: 0, structure: 0, written: 0
    });

    // Check available questions
    useEffect(() => {
        const check = async () => {
            try {
                const all = await getAllQuestions();
                setAvailableCounts({
                    reading: all.filter(q => q.section === 'reading').length,
                    listening: all.filter(q => q.section === 'listening').length,
                    structure: all.filter(q => q.section === 'structure').length,
                    written: all.filter(q => q.section === 'written').length,
                });
            } catch (e) {
                console.error('Failed to fetch available questions:', e);
            }
        };
        check();
    }, []);

    // Start section timer when entering section_active
    useEffect(() => {
        if (sim.phase === 'section_active' && sim.currentSectionDef) {
            const timerSeconds = sim.currentSectionDef.defaultTimer;
            // Scale timer proportionally to question count
            const defaultCount = sim.currentSectionDef.key === 'reading' ? 50 :
                sim.currentSectionDef.key === 'listening' ? 50 :
                    sim.currentSectionDef.key === 'structure' ? 15 : 25;
            const actualCount = sim.questionsForCurrentSection.length;
            const scaledTimer = Math.round(timerSeconds * (actualCount / Math.max(defaultCount, 1)));
            timer.startTimer(Math.max(scaledTimer, 60)); // minimum 1 minute
            setAnswers({});
            setCurrentQuestionIndex(0);
            setShowExplanation(false);
        }
        return () => {
            if (sim.phase !== 'section_active') timer.stopTimer();
        };
    }, [sim.phase, sim.currentSectionDef, sim.questionsForCurrentSection.length]);

    // Auto-advance from break when next section is ready and break is over
    useEffect(() => {
        if (sim.phase === 'section_break' && sim.breakTimeLeft <= 0 && !sim.isGeneratingNext) {
            sim.skipBreak();
        }
    }, [sim.phase, sim.breakTimeLeft, sim.isGeneratingNext]);

    const handleSubmitSection = useCallback(() => {
        timer.stopTimer();
        sim.submitSectionAnswers(answers, timer.elapsed);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answers, timer, sim]);

    const handleAnswer = useCallback((questionIndex: number, selectedIndex: number) => {
        if (answers[questionIndex] !== undefined) return; // Already answered
        setAnswers(prev => ({ ...prev, [questionIndex]: selectedIndex }));
    }, [answers]);

    const totalQuestions = sim.config.reading + sim.config.listening + sim.config.structure + sim.config.writtenExpression;
    const estimatedMinutes = Math.round(totalQuestions * 0.9);

    // Get source breakdown per section
    const getSourceBreakdown = (dbKey: string, configKey: string) => {
        const requested = (sim.config as any)[configKey] || 0;
        const available = availableCounts[dbKey as keyof typeof availableCounts] || 0;
        const fromBank = Math.min(requested, available);
        const toGenerate = Math.max(0, requested - available);
        return { fromBank, toGenerate };
    };

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE: CONFIG
    // ═══════════════════════════════════════════════════════════════════════
    if (sim.phase === 'config') {
        return (
            <div className="h-full flex flex-col bg-[#f8fafc] relative">
                {/* Header */}
                <div className="bg-[#6b3deb] rounded-b-[2rem] px-5 pt-6 pb-8 shrink-0 relative shadow-md">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => onNavigate(AppView.PRACTICE_HUB)} className="w-10 h-10 flex items-center justify-center text-white">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-[19px] font-bold text-white flex-1 text-center pr-10">Full Simulation</h1>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center text-white shadow-inner">
                            <HelpCircle className="w-6 h-6 mb-1.5 opacity-80" />
                            <div className="text-2xl font-bold">{totalQuestions}</div>
                            <div className="text-[10px] font-bold tracking-widest opacity-80 uppercase mt-0.5">Questions</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-center justify-center text-white shadow-inner">
                            <Clock className="w-6 h-6 mb-1.5 opacity-80" />
                            <div className="text-2xl font-bold">{estimatedMinutes}m</div>
                            <div className="text-[10px] font-bold tracking-widest opacity-80 uppercase mt-0.5">Duration</div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 pb-32">
                    <div className="max-w-2xl mx-auto space-y-5">
                        <div className="flex items-center justify-between pb-1">
                            <h2 className="text-lg font-bold text-slate-900">Configure Sections</h2>
                            <button
                                onClick={() => sim.setConfig({
                                    reading: DEFAULT_SIMULATION_CONFIG.reading,
                                    listening: DEFAULT_SIMULATION_CONFIG.listening,
                                    structure: DEFAULT_SIMULATION_CONFIG.structure,
                                    writtenExpression: DEFAULT_SIMULATION_CONFIG.writtenExpression,
                                })}
                                className="text-[13px] font-semibold text-[#6b3deb]"
                            >Reset Default</button>
                        </div>

                        {/* Section order info */}
                        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100/50 flex items-start gap-3">
                            <Lightbulb className="w-5 h-5 text-blue-600 fill-blue-600/20 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-blue-800 mb-1">IBT Section Order</p>
                                <p className="text-xs text-blue-700">Reading → Listening → Structure → Written Expression. 2-minute break between each section.</p>
                            </div>
                        </div>

                        {SIMULATION_SECTIONS_ORDER.map(section => {
                            const configKey = section.key === 'writtenExpression' ? 'writtenExpression' : section.key;
                            const value = (sim.config as any)[configKey] || 0;
                            const minVal = (MIN_SIMULATION_CONFIG as any)[configKey] || 5;
                            const maxVal = (DEFAULT_SIMULATION_CONFIG as any)[configKey] || 50;
                            const { fromBank, toGenerate } = getSourceBreakdown(section.dbSection, configKey);

                            const trackColorClasses: Record<string, string> = {
                                reading: 'accent-emerald-500',
                                listening: 'accent-pink-600',
                                structure: 'accent-orange-500',
                                writtenExpression: 'accent-amber-500',
                            };
                            const rangeClass = trackColorClasses[section.key] || 'accent-purple-600';

                            return (
                                <div key={section.key} className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 overflow-hidden relative">
                                    <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-30 ${section.bgColor}`} />
                                    <div className="relative">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl ${section.bgColor} flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)]`}>
                                                    <span className={section.color}>{ICON_MAP[section.icon]}</span>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-[17px]">{section.label}</div>
                                                    <div className="text-[13px] text-slate-500 font-medium">{section.subtitle}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="px-2.5 py-1 bg-slate-50 rounded-lg flex items-center gap-1.5 border border-slate-100">
                                                    <Database className="w-3.5 h-3.5 text-slate-500" />
                                                    <span className="text-[10px] font-bold text-slate-500 tracking-wider text-nowrap">{availableCounts[section.dbSection as keyof typeof availableCounts] || 0} IN BANK</span>
                                                </div>
                                                {toGenerate > 0 && (
                                                    <div className="px-2.5 py-1 bg-pink-50 rounded-lg flex items-center gap-1.5 border border-pink-100/50">
                                                        <Bot className="w-3.5 h-3.5 text-pink-600 fill-pink-600/20" />
                                                        <span className="text-[10px] font-bold text-pink-600 tracking-wider">HYBRID</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between mt-5 mb-3">
                                            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">Question Count</div>
                                            <div className={`font-bold text-2xl leading-none ${section.color}`}>{value}</div>
                                        </div>

                                        <input
                                            type="range"
                                            min={minVal}
                                            max={maxVal}
                                            value={value}
                                            onChange={(e) => sim.setConfig({
                                                ...sim.config,
                                                [configKey]: parseInt(e.target.value),
                                            })}
                                            className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer ${rangeClass}`}
                                        />
                                        <div className="flex justify-between items-center mt-3">
                                            <span className="text-[11px] font-bold text-slate-400">{minVal}</span>
                                            <span className="text-[11px] font-bold text-slate-400">{maxVal}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Start Button */}
                <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent">
                    <div className="max-w-2xl mx-auto">
                        {!isPaid ? (
                            <button onClick={() => setShowPaywall(true)}
                                className="w-full py-4 bg-[#6b3deb] text-white font-bold text-[17px] rounded-2xl shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2">
                                <Lock className="w-5 h-5" /> Upgrade untuk Full Simulation
                            </button>
                        ) : (
                            <button onClick={() => sim.startSimulation()}
                                className="w-full py-4 bg-[#6b3deb] text-white font-bold text-[17px] rounded-2xl shadow-xl shadow-purple-500/20 hover:bg-[#5b32cd] transition-all flex items-center justify-center gap-2">
                                Start Simulation <Play className="w-4 h-4 fill-current" />
                            </button>
                        )}
                    </div>
                </div>

                <PaywallSheet isOpen={showPaywall} onClose={() => setShowPaywall(false)} triggeredBy="full_simulation" currentTier={tier} />
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE: LOADING (Generating first section)
    // ═══════════════════════════════════════════════════════════════════════
    if (sim.phase === 'loading') {
        const firstSection = SIMULATION_SECTIONS_ORDER[0];
        return (
            <div className="h-full flex flex-col bg-slate-50">
                <div className="px-5 py-4 flex items-center justify-between bg-white border-b border-slate-100 z-10 sticky top-0">
                    <button onClick={() => sim.resetSimulation()} className="text-slate-800">
                        <X className="w-6 h-6" />
                    </button>
                    <h1 className="text-[17px] font-bold text-slate-900">Preparing Test</h1>
                    <div className="w-6" />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                    <div className="bg-[#4b23a0] relative overflow-hidden rounded-2xl text-center text-white flex flex-col items-center justify-center h-32 mb-8 w-full max-w-md shadow-md">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#3c1082] to-[#6035bb] opacity-90" />
                        <div className="relative z-10 flex flex-col items-center gap-2">
                            <GraduationCap className="w-8 h-8 opacity-90" />
                            <h2 className="font-bold text-lg">TOEFL Full Simulation</h2>
                        </div>
                    </div>

                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Generating {firstSection?.label} Section</h3>
                    <p className="text-sm text-slate-500 max-w-sm">
                        Preparing questions for the first section. Other sections will be generated during break periods.
                    </p>

                    {sim.error && (
                        <div className="mt-6 p-4 bg-red-50 rounded-2xl flex items-start gap-3 max-w-sm text-left">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 font-medium">{sim.error}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE: SECTION ACTIVE (Answering questions)
    // ═══════════════════════════════════════════════════════════════════════
    if (sim.phase === 'section_active' && sim.currentSectionDef) {
        const sectionDef = sim.currentSectionDef;
        const questions = sim.questionsForCurrentSection;
        const currentQ = questions[currentQuestionIndex];
        const answeredCount = Object.keys(answers).length;
        const isAnswered = answers[currentQuestionIndex] !== undefined;
        const selectedIdx = answers[currentQuestionIndex];
        const isCorrect = currentQ && selectedIdx !== undefined
            ? currentQ.choices[selectedIdx] === currentQ.correct_response[0]
            : false;

        return (
            <div className="h-full flex flex-col bg-slate-50">
                {/* Section Header with Timer */}
                <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-20`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${sectionDef.bgColor} flex items-center justify-center`}>
                            <span className={sectionDef.color}>{ICON_MAP[sectionDef.icon]}</span>
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-[15px]">{sectionDef.label}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                                Q{currentQuestionIndex + 1}/{questions.length} • {answeredCount} answered
                            </div>
                        </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1.5 ${timer.timeLeft <= 60 ? 'bg-red-50 text-red-600 animate-pulse' : timer.timeLeft <= 300 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-700'}`}>
                        <Timer className="w-4 h-4" />
                        {timer.formatTime(timer.timeLeft)}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-slate-100">
                    <div
                        className={`h-full transition-all duration-300 ${sectionDef.color.replace('text-', 'bg-')}`}
                        style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                    />
                </div>

                {/* Question Content */}
                <div className="flex-1 overflow-y-auto px-4 py-5 pb-32">
                    {currentQ && (
                        <div className="max-w-2xl mx-auto">
                            {/* Reading stimulus */}
                            {currentQ.stimulus?.text && currentQ.section === 'reading' && (
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4 max-h-[40vh] overflow-y-auto">
                                    <h4 className="font-bold text-slate-800 mb-3 text-sm">Reading Passage</h4>
                                    <p className="text-slate-700 leading-relaxed text-[15px] whitespace-pre-wrap">{currentQ.stimulus.text}</p>
                                </div>
                            )}

                            {/* Difficulty badge */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider ${currentQ.difficulty_score <= 35 ? 'bg-green-50 text-green-600' : currentQ.difficulty_score <= 65 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                                    {currentQ.difficulty_score <= 35 ? 'EASY' : currentQ.difficulty_score <= 65 ? 'MEDIUM' : 'HARD'}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 tracking-wider">
                                    {currentQ.cefr_target}
                                </span>
                            </div>

                            {/* Question prompt */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-5">
                                <p className="text-slate-900 font-medium text-[16px] leading-relaxed whitespace-pre-wrap">
                                    {currentQ.prompt}
                                </p>
                            </div>

                            {/* Choices */}
                            <div className="space-y-3">
                                {currentQ.choices.map((choice, idx) => {
                                    const isSelected = selectedIdx === idx;
                                    const isCorrectChoice = currentQ.correct_response[0] === choice;
                                    let bgClass = 'bg-white border-slate-200 hover:border-slate-300';
                                    let textClass = 'text-slate-800';

                                    if (isAnswered) {
                                        if (isCorrectChoice) {
                                            bgClass = 'bg-green-50 border-green-300';
                                            textClass = 'text-green-800';
                                        } else if (isSelected && !isCorrectChoice) {
                                            bgClass = 'bg-red-50 border-red-300';
                                            textClass = 'text-red-800';
                                        } else {
                                            bgClass = 'bg-slate-50 border-slate-200 opacity-60';
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(currentQuestionIndex, idx)}
                                            disabled={isAnswered}
                                            className={`w-full p-4 rounded-2xl border-2 text-left flex items-start gap-3 transition-all active:scale-[0.98] ${bgClass}`}
                                        >
                                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${isAnswered && isCorrectChoice ? 'bg-green-500 text-white' : isAnswered && isSelected && !isCorrectChoice ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className={`font-medium text-[15px] pt-1 ${textClass}`}>{choice}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation */}
                            {isAnswered && currentQ.metadata?.explanation && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 bg-blue-50 rounded-2xl p-4 border border-blue-100"
                                >
                                    <p className="text-sm text-blue-800 font-medium leading-relaxed">
                                        💡 {currentQ.metadata.explanation}
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Navigation */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent border-t border-slate-200">
                    <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                        <button
                            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="px-4 py-3 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 disabled:opacity-30"
                        >
                            ← Prev
                        </button>

                        <div className="flex-1 text-center">
                            {answeredCount === questions.length ? (
                                <button
                                    onClick={handleSubmitSection}
                                    className="w-full py-3 bg-[#6b3deb] text-white font-bold text-[15px] rounded-xl shadow-lg shadow-purple-500/20"
                                >
                                    Finish Section →
                                </button>
                            ) : (
                                <span className="text-[13px] font-medium text-slate-400">
                                    {questions.length - answeredCount} remaining
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                            disabled={currentQuestionIndex >= questions.length - 1}
                            className="px-4 py-3 rounded-xl font-bold text-sm text-slate-600 bg-white border border-slate-200 disabled:opacity-30"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE: SECTION BREAK (2-minute rest + generation)
    // ═══════════════════════════════════════════════════════════════════════
    if (sim.phase === 'section_break') {
        const completedSection = SIMULATION_SECTIONS_ORDER[sim.currentSectionIndex];
        const nextIndex = sim.currentSectionIndex + 1;
        const nextSection = nextIndex < SIMULATION_SECTIONS_ORDER.length
            ? SIMULATION_SECTIONS_ORDER[nextIndex]
            : null;
        const lastResult = sim.sectionResults[sim.sectionResults.length - 1];

        return (
            <div className="h-full flex flex-col bg-slate-50">
                <div className="px-5 py-4 flex items-center justify-center bg-white border-b border-slate-100">
                    <h1 className="text-[17px] font-bold text-slate-900">Section Break</h1>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6">
                    <div className="max-w-md mx-auto flex flex-col items-center text-center">
                        {/* Section Result Summary */}
                        {lastResult && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl ${completedSection?.bgColor || 'bg-slate-100'} flex items-center justify-center`}>
                                        <Check className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-900">{completedSection?.label} Complete</p>
                                        <p className="text-xs text-slate-500">Section {sim.currentSectionIndex + 1} of {SIMULATION_SECTIONS_ORDER.length}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-green-50 rounded-xl p-3">
                                        <div className="text-2xl font-bold text-green-700">{lastResult.correct}</div>
                                        <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Correct</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <div className="text-2xl font-bold text-slate-700">{lastResult.total}</div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</div>
                                    </div>
                                    <div className="bg-purple-50 rounded-xl p-3">
                                        <div className="text-2xl font-bold text-purple-700">{Math.round(lastResult.accuracy * 100)}%</div>
                                        <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Accuracy</div>
                                    </div>
                                </div>

                                {/* Adaptive difficulty indicator */}
                                <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                                    <Target className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-slate-500 font-medium">
                                        Next section difficulty: <span className={`font-bold ${sim.difficulty === 'easy' ? 'text-green-600' : sim.difficulty === 'hard' ? 'text-red-600' : 'text-amber-600'}`}>
                                            {sim.difficulty.toUpperCase()}
                                        </span>
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {/* Rest Timer */}
                        <div className="mb-6">
                            <Coffee className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                            <h2 className="text-2xl font-bold text-slate-900 mb-1">Take a Break</h2>
                            <p className="text-sm text-slate-500 mb-4">
                                Rest your eyes. The next section will start when you're ready.
                            </p>
                            <div className="text-4xl font-bold text-purple-600 tabular-nums">
                                {Math.floor(sim.breakTimeLeft / 60)}:{(sim.breakTimeLeft % 60).toString().padStart(2, '0')}
                            </div>
                        </div>

                        {/* Next Section Preview */}
                        {nextSection && (
                            <div className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl ${nextSection.bgColor} flex items-center justify-center`}>
                                        <span className={nextSection.color}>{ICON_MAP[nextSection.icon]}</span>
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-bold text-slate-900 text-[15px]">Next: {nextSection.label}</p>
                                        <p className="text-xs text-slate-500">{nextSection.subtitle}</p>
                                    </div>
                                    {sim.isGeneratingNext ? (
                                        <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                                    ) : (
                                        <Check className="w-5 h-5 text-green-500" />
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-2 text-left">
                                    {sim.isGeneratingNext ? 'Generating questions...' : 'Questions ready!'}
                                </p>
                            </div>
                        )}

                        {/* Skip Break Button */}
                        <button
                            onClick={sim.skipBreak}
                            disabled={sim.isGeneratingNext}
                            className="w-full py-4 bg-[#6b3deb] text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {sim.isGeneratingNext ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Preparing Next Section...</>
                            ) : (
                                <>Continue to {nextSection?.label} <ChevronRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE: RESULTS
    // ═══════════════════════════════════════════════════════════════════════
    if (sim.phase === 'results') {
        const totalCorrect = sim.sectionResults.reduce((s, r) => s + r.correct, 0);
        const totalQ = sim.sectionResults.reduce((s, r) => s + r.total, 0);
        const overallAccuracy = totalQ > 0 ? totalCorrect / totalQ : 0;

        return (
            <div className="h-full flex flex-col bg-slate-50">
                <div className="px-5 py-4 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
                    <button onClick={() => sim.resetSimulation()} className="text-slate-800">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-[17px] font-bold text-slate-900">Simulation Results</h1>
                    <div className="w-6" />
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-6 pb-32">
                    <div className="max-w-md mx-auto">
                        {/* Overall Score */}
                        <div className="bg-gradient-to-br from-[#6b3deb] to-[#4b23a0] rounded-2xl p-6 text-white text-center mb-6 shadow-xl shadow-purple-500/20">
                            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-90" />
                            <div className="text-5xl font-bold mb-1">{Math.round(overallAccuracy * 100)}%</div>
                            <div className="text-sm opacity-80 font-medium">{totalCorrect}/{totalQ} Correct</div>
                            <div className="mt-3 text-xs opacity-70">
                                {overallAccuracy >= 0.8 ? 'Excellent Performance! 🌟' :
                                    overallAccuracy >= 0.6 ? 'Good Job! Keep Practicing 💪' :
                                        overallAccuracy >= 0.4 ? 'Room for Improvement 📚' :
                                            'Keep Studying! You\'ll Get There 🎯'}
                            </div>
                        </div>

                        {/* Section Breakdown */}
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">Section Breakdown</h3>
                        <div className="space-y-3 mb-6">
                            {sim.sectionResults.map((result, idx) => {
                                const sectionDef = SIMULATION_SECTIONS_ORDER[idx];
                                return (
                                    <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl ${sectionDef?.bgColor || 'bg-slate-100'} flex items-center justify-center`}>
                                                    <span className={sectionDef?.color || 'text-slate-500'}>{sectionDef ? ICON_MAP[sectionDef.icon] : null}</span>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-[15px]">{result.section}</div>
                                                    <div className="text-[11px] text-slate-500 font-medium">
                                                        Difficulty: {result.difficulty} • {Math.floor(result.timeUsedSeconds / 60)}m {result.timeUsedSeconds % 60}s
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`text-xl font-bold ${result.accuracy >= 0.7 ? 'text-green-600' : result.accuracy >= 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
                                                {Math.round(result.accuracy * 100)}%
                                            </div>
                                        </div>
                                        {/* Accuracy bar */}
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${result.accuracy >= 0.7 ? 'bg-green-500' : result.accuracy >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                style={{ width: `${result.accuracy * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between mt-2 text-[11px] text-slate-400 font-medium">
                                            <span>{result.correct}/{result.total} correct</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={() => sim.resetSimulation()}
                                className="w-full py-4 bg-[#6b3deb] text-white font-bold text-[15px] rounded-2xl shadow-lg shadow-purple-500/20"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => onNavigate(AppView.PRACTICE_HUB)}
                                className="w-full py-3 bg-white text-slate-700 font-bold text-[15px] rounded-2xl border border-slate-200"
                            >
                                Back to Practice Hub
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FALLBACK
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Unknown State</h2>
            {sim.error && <p className="text-sm text-red-600 mb-4">{sim.error}</p>}
            <button onClick={() => sim.resetSimulation()} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold">
                Reset
            </button>
        </div>
    );
};

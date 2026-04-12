import confetti from 'canvas-confetti';
import { AnimatePresence, Variants, motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, Send, Trophy, Star, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { getComplexityLadderSkill } from '../../data/complexityLadderSkills';
import { useAuth } from '../../hooks/useAuth';
import sessionPersistenceService, { useSessionPersistence } from '../../services/sessionPersistenceService';
import { writingGymService } from '../../services/writingGymService';
import { AppView, ComplexityLadderLevel, ComplexityVerificationResult, LadderHistoryItem } from '../../types';
import { getGuestUserId } from '../../utils/guestUser';
import { Button } from '../Button';


import { ComplexityLadderSkillPicker } from './ComplexityLadderSkillPicker';


type Status = 'loading' | 'picker' | 'welcome' | 'generating' | 'playing' | 'verifying' | 'complete' | 'recovery_prompt';

interface Props {
    onNavigate: (view: AppView) => void;
}

// --- Framer Motion variants ---

const cardContainerVariants: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const cardItemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

// --- 3-Card Feedback component ---

interface FeedbackCardsProps {
    result: ComplexityVerificationResult;
    onTryAgain: () => void;
    onNextLevel: () => void;
    isLastLevel: boolean;
}

const FeedbackCards: React.FC<FeedbackCardsProps> = ({ result, onTryAgain, onNextLevel, isLastLevel }) => {
    useEffect(() => {
        if (result.isValid) {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        }
    }, [result.isValid]);

    const structureBody = result.structureAnalysis ?? result.feedback ?? '';
    const correctionsEmpty = !result.corrections || result.corrections.length === 0;
    const modelBody = result.modelSentence ?? 'Keep practicing this structure!';

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            {/* Score badge */}
            {typeof result.score === 'number' && (
                <div className="flex justify-center">
                    <span className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                        Score: {result.score}/100
                    </span>
                </div>
            )}

            <motion.div
                variants={cardContainerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
            >
                {/* Card 1 — Structure Analysis */}
                <motion.div
                    variants={cardItemVariants}
                    className={`rounded-2xl p-4 border ${result.isValid
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        <span className="text-lg leading-none mt-0.5" aria-hidden="true">
                            {result.isValid ? '✅' : '⚠️'}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${result.isValid
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-amber-700 dark:text-amber-400'
                                }`}>
                                Structure Analysis
                            </p>
                            <p className={`text-sm leading-relaxed ${result.isValid
                                ? 'text-green-800 dark:text-green-200'
                                : 'text-amber-800 dark:text-amber-200'
                                }`}>
                                {structureBody}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Card 2 — Corrections */}
                <motion.div
                    variants={cardItemVariants}
                    className={`rounded-2xl p-4 border ${correctionsEmpty
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        <span className="text-lg leading-none mt-0.5" aria-hidden="true">
                            {correctionsEmpty ? '✅' : '⚠️'}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${correctionsEmpty
                                ? 'text-green-700 dark:text-green-400'
                                : 'text-amber-700 dark:text-amber-400'
                                }`}>
                                Corrections
                            </p>
                            {correctionsEmpty ? (
                                <p className="text-sm text-green-800 dark:text-green-200">No corrections — great job!</p>
                            ) : (
                                <ul className="space-y-1">
                                    {result.corrections!.map((c, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" aria-hidden="true" />
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Card 3 — Model Sentence */}
                <motion.div
                    variants={cardItemVariants}
                    className="rounded-2xl p-4 border bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50"
                >
                    <div className="flex items-start gap-3">
                        <span className="text-lg leading-none mt-0.5" aria-hidden="true">💡</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-indigo-700 dark:text-indigo-400">
                                A Better Version
                            </p>
                            <p className="text-sm text-indigo-800 dark:text-indigo-200 italic leading-relaxed">
                                "{modelBody}"
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Action button */}
            <div className="flex justify-center pt-1">
                {result.isValid ? (
                    <Button
                        onClick={onNextLevel}
                        className="px-8 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-200 dark:shadow-green-900/30 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        {isLastLevel ? 'Finish' : 'Next Level'}
                    </Button>
                ) : (
                    <Button
                        onClick={onTryAgain}
                        className="px-8 py-3 rounded-xl bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold flex items-center gap-2 transition-all active:scale-95"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </Button>
                )}
            </div>
        </div>
    );
};

export const ComplexityLadder: React.FC<Props> = ({ onNavigate }) => {
    const { user } = useAuth();
    const userId = user?.id || getGuestUserId();

    // Session persistence
    const {
        createSession,
        updateSession: updatePersistedSession,
        completeSession: completePersistedSession,
        startFresh
    } = useSessionPersistence(userId, 'complexity_ladder');

    // State machine with single status
    const [status, setStatus] = useState<Status>('loading');
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [topic, setTopic] = useState('');
    const [levels, setLevels] = useState<ComplexityLadderLevel[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [verificationResult, setVerificationResult] = useState<ComplexityVerificationResult | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const [history, setHistory] = useState<LadderHistoryItem[]>([]);
    const [completedSkillsCount, setCompletedSkillsCount] = useState(0);
    const [savedSessionData, setSavedSessionData] = useState<unknown>(null);

    // Session recovery on mount
    useEffect(() => {
        const init = async () => {
            const recovery = await sessionPersistenceService.getActiveSession(userId, 'complexity_ladder');
            if (recovery.hasSession && recovery.session) {
                setSavedSessionData(recovery.session);
                setStatus('recovery_prompt');
            } else {
                setStatus('picker');
            }
        };
        init();
    }, [userId]);

    useEffect(() => {
        if (user?.id) {
            loadProgress();
        }
    }, [user?.id]);

    const loadProgress = async () => {
        if (!user?.id) return;
        try {
            // Fetch all completed ladder sessions
            const sessions = await writingGymService.getCompletedLadders(user.id);
            // Count unique skill IDs (topics) that have been mastered (e.g. 3 stars)
            const uniqueSkills = new Set(sessions.map((s: { skill_id: string }) => s.skill_id));
            setCompletedSkillsCount(uniqueSkills.size);
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    };
    const currentLevel = levels[currentIdx];
    const selectedSkill = selectedSkillId ? getComplexityLadderSkill(selectedSkillId) : null;

    // --- ACTIONS ---

    const handleSelectSkill = (skillId: string) => {
        setSelectedSkillId(skillId);
        setStatus('welcome');
    };

    const startGame = async () => {
        // If no topic provided, use a generic one or let the generator pick
        const effectiveTopic = topic.trim() || "General";

        console.log(`[Ladder] Starting generation for: "${effectiveTopic}" Skill: ${selectedSkillId}`);
        setStatus('generating');
        setLevels([]);
        setCurrentIdx(0);
        setHistory([]);
        setVerificationResult(null);
        setHint(null);

        try {
            const ladder = await writingGymService.generateComplexityLadder(effectiveTopic, selectedSkillId || undefined);
            console.log(`[Ladder] Generated ${ladder?.length || 0} levels`);

            // Validate response is an array
            if (!Array.isArray(ladder) || ladder.length === 0) {
                throw new Error('Invalid ladder response');
            }

            setLevels(ladder);
            setStatus('playing');

            // Create persisted session
            createSession({ levels: ladder, topic: effectiveTopic, selectedSkillId, currentIdx: 0, history: [] }).catch(() => { });
        } catch (error) {
            console.error('[Ladder] Generation failed:', error);
            setVerificationResult({ isValid: false, feedback: 'Failed to generate ladder. Try again.' });
            setStatus('welcome');
        }
    };

    const submitAnswer = async () => {
        if (!userInput.trim() || !currentLevel) return;

        setStatus('verifying');
        setVerificationResult(null);

        try {
            const result = await writingGymService.verifyComplexityLevel(
                userInput,
                currentLevel.name,
                currentLevel.instruction,
                topic
            );

            setVerificationResult(result);

            if (result.isValid) {
                // Save to history
                setHistory(prev => [...prev, {
                    levelName: currentLevel.name,
                    instruction: currentLevel.instruction,
                    userSentence: userInput,
                    timestamp: new Date().toISOString()
                }]);
            }

            setStatus('playing');
        } catch (error) {
            console.error('[Ladder] Verification failed:', error);
            setVerificationResult({ isValid: false, feedback: 'Verification failed. Try again.' });
            setStatus('playing');
        }
    };

    const handleTryAgain = () => {
        setUserInput('');
        // Keep feedback visible as reference — do not clear verificationResult
    };

    const handleNextLevel = () => {
        if (currentIdx < levels.length - 1) {
            const nextIdx = currentIdx + 1;
            setCurrentIdx(nextIdx);
            setUserInput('');
            setVerificationResult(null);
            setHint(null);
            setStatus('playing');
            // Persist progress
            updatePersistedSession({ currentIdx: nextIdx, history: [...history, { levelName: currentLevel.name, instruction: currentLevel.instruction, userSentence: userInput, timestamp: new Date().toISOString() }] }).catch(() => { });
        } else {
            // All levels complete
            setStatus('complete');
            saveProgress();
            completePersistedSession().catch(() => { });
        }
    };

    const getHint = async () => {
        if (!currentLevel) return;

        try {
            const hintText = await writingGymService.getLevelHint(currentLevel.name, topic);
            setHint(hintText);
        } catch {
            setHint("Try using conjunctions like 'because', 'although', or 'however'.");
        }
    };

    const saveProgress = async () => {
        if (!user?.id) return;

        try {
            const stars = Math.min(3, Math.floor(history.length / 2) + 1);
            await writingGymService.saveLadderSession(user.id, topic, levels.length, stars, history);
            console.log('[Ladder] Progress saved');
        } catch (error) {
            console.error('[Ladder] Save failed:', error);
        }
    };

    const handleResumeSession = () => {
        if (!savedSessionData) return;
        const gs = (savedSessionData as { gameState: { levels?: ComplexityLadderLevel[]; currentIdx?: number; topic?: string; selectedSkillId?: string; history?: LadderHistoryItem[] } }).gameState;
        if (gs.levels && gs.levels.length > 0) {
            setLevels(gs.levels);
            setCurrentIdx(gs.currentIdx || 0);
            setTopic(gs.topic || '');
            setSelectedSkillId(gs.selectedSkillId || null);
            setHistory(gs.history || []);
            setStatus('playing');
        } else {
            setStatus('picker');
        }
    };

    const handleStartFresh = async () => {
        await startFresh();
        setTopic('');
        setSelectedSkillId(null);
        setStatus('picker');
    };

    // --- RENDER ---

    if (status === 'loading') {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 shrink-0" />
            </div>
        );
    }

    if (status === 'recovery_prompt') {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-slate-50 dark:bg-slate-950 gap-6 p-4 text-center">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-2">
                    <RefreshCw className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Resume Climb?</h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-sm">
                    You have an unfinished Complexity Ladder session. Would you like to pick up where you left off?
                </p>
                <div className="flex gap-4 mt-4 w-full max-w-sm font-bold">
                    <Button variant="outline" onClick={handleStartFresh} className="flex-1 py-3 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">Start Fresh</Button>
                    <Button onClick={handleResumeSession} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">Resume</Button>
                </div>
            </div>
        );
    }

    // Skill Picker Screen
    if (status === 'picker') {
        return (
            <ComplexityLadderSkillPicker
                isOpen={true}
                onClose={() => onNavigate(AppView.WRITING_GYM_HUB)}
                onSelectSkill={handleSelectSkill}
                completedLevels={completedSkillsCount}
            />
        );
    }

    // Welcome Screen
    if (status === 'welcome') {
        return (
            <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                    <Button variant="ghost" size="sm" onClick={() => onNavigate(AppView.WRITING_GYM_HUB)} aria-label="Go back to Writing Gym Hub">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </Button>
                    <span className="font-bold text-slate-800 dark:text-slate-100">Complexity Ladder</span>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto w-full">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                        <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-800">
                            <Trophy className="w-10 h-10 text-indigo-500" />
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {selectedSkill ? selectedSkill.name : 'Level Up'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {selectedSkill ? selectedSkill.description : 'Start simple, finish complex. Build your sentence structure skills one rung at a time.'}
                        </p>
                    </div>

                    {verificationResult && !verificationResult.isValid && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-medium w-full text-center">
                            {verificationResult.feedback}
                        </div>
                    )}

                    <div className="w-full space-y-3">
                        <div className="relative">
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Enter a topic (e.g., Technology)"
                                aria-label="Enter a topic for the complexity ladder"
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium transition-all shadow-sm hover:shadow-md"
                                onKeyDown={(e) => e.key === 'Enter' && startGame()}
                            />
                        </div>

                        <Button
                            onClick={startGame}
                            disabled={!topic.trim()}
                            className="w-full py-6 text-lg rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all active:scale-95"
                        >
                            Start Climb
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setStatus('picker')}
                            className="w-full text-slate-500 dark:text-slate-400"
                        >
                            Change Skill
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Generating Screen
    if (status === 'generating') {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <div className="relative w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg border border-indigo-100 dark:border-indigo-900/50">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Constructing Ladder...</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">AI is generating levels for "{topic}"</p>
                </div>
            </div>
        );
    }

    // Complete Screen
    if (status === 'complete') {
        const stars = Math.min(3, Math.floor(history.length / 2) + 1);

        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 gap-8">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Ladder Conquered!</h2>
                    <p className="text-slate-500 dark:text-slate-400">You've mastered all {levels.length} levels</p>
                </div>

                <div className="flex gap-2">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="relative">
                            <Star className={`w-14 h-14 ${s <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-800 fill-slate-200 dark:fill-slate-800'}`} />
                            {s <= stars && <div className="absolute inset-0 bg-amber-400 blur-lg opacity-30 rounded-full"></div>}
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <Button onClick={() => { setStatus('picker'); setTopic(''); }} className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg">
                        Continue Climbing
                    </Button>
                    <Button variant="outline" onClick={() => onNavigate(AppView.WRITING_GYM_HUB)} className="w-full py-4 rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        Back to Hub
                    </Button>
                </div>
            </div>
        );
    }

    // Playing / Verifying Screen
    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 z-10 sticky top-0">
                <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => setStatus('picker')} className="p-1 -ml-2 h-8 w-8 rounded-full" aria-label="Go back to skill picker">
                            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        </Button>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                {selectedSkill ? selectedSkill.name : `Level ${currentIdx + 1}`}
                            </h2>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{topic}</p>
                        </div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800" role="status" aria-label={`${levels.length - currentIdx} levels remaining`}>
                        {levels.length - currentIdx} Left
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                        style={{ width: `${((currentIdx + 1) / levels.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Level Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="max-w-md mx-auto space-y-4">

                    {currentLevel && (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 leading-tight">
                                    {currentLevel.name}
                                </h3>
                                <div className="text-slate-700 dark:text-slate-200 text-base font-medium leading-relaxed">
                                    {currentLevel.instruction}
                                </div>
                            </div>

                            <div className="relative pl-4 py-1 border-l-2 border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Example</p>
                                <p className="text-slate-600 dark:text-slate-400 italic text-sm">"{currentLevel.example}"</p>
                            </div>

                            {hint && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-amber-100 dark:bg-amber-800/50 p-1.5 rounded-lg shrink-0">
                                            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase">Hint</p>
                                            <p className="text-amber-700 dark:text-amber-400 text-sm">{hint}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3-Card Feedback */}
                            <AnimatePresence>
                                {verificationResult && (
                                    <FeedbackCards
                                        result={verificationResult}
                                        onTryAgain={handleTryAgain}
                                        onNextLevel={handleNextLevel}
                                        isLastLevel={currentIdx >= levels.length - 1}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 pb-6 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] z-20">
                <div className="max-w-md mx-auto space-y-3">
                    <div className="relative">
                        <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Write your sentence here..."
                            aria-label="Write your sentence answer"
                            className="w-full px-4 py-3 pb-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-all text-base shadow-inner"
                            rows={3}
                            disabled={status === 'verifying' || verificationResult?.isValid === true}
                        />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={getHint}
                                disabled={status === 'verifying' || !!hint}
                                className="h-8 w-8 rounded-full p-0 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                title="Get Hint"
                                aria-label="Get a hint for this level"
                            >
                                <Lightbulb className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <Button
                        onClick={submitAnswer}
                        disabled={!userInput.trim() || status === 'verifying' || verificationResult?.isValid === true}
                        className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                    >
                        {status === 'verifying' ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Submit Answer
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
export default ComplexityLadder;

import confetti from 'canvas-confetti';
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import {
    ArrowLeft, Link2,
    Heart, Snowflake, Lightbulb, Split, Play, Map
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { LogicWeaverSkill, LOGIC_WEAVER_SKILLS } from '../../data/logicWeaverSkills';
import { useAuth } from '../../hooks/useAuth';
import { useFreePlanHearts } from '../../hooks/useFreePlanHearts';
import { useSound } from '../../hooks/useSound';
import { useSubscription } from '../../hooks/useSubscription';
import { getNextSkillId } from '../../services/groq/prompts/logicWeaverLevels';
import { oracleService } from '../../services/oracleService';
import { writingGymProgressService } from '../../services/writingGymProgressService';
import { writingGymService } from '../../services/writingGymService';
import { AppView, WritingExercise } from '../../types';
import { calculateScore } from '../../utils/gameUtils';
import { Button } from '../Button';
import { HintSystem } from '../hints/HintSystem';
import PaywallSheet from '../PaywallSheet';
import { Timer } from '../timer/Timer';

import { LogicWeaverSkillPicker } from './LogicWeaverSkillPicker';
import { LogicWeaverSuccessScreen } from './LogicWeaverSuccessScreen';
import { MasonErrorScreen } from './MasonErrorScreen';

interface GameState {
    status: 'loading' | 'playing' | 'success' | 'error';
    lives: number;
    score: number;
    timeRemaining: number;
    maxTime: number;
    combo: number;
    powerUps: {
        fiftyFifty: number;
        freeze: number;
        hint: number;
    };
    streakBonus: number;
}

export const LogicWeaverLevel: React.FC<{ onNavigate: (view: AppView) => void }> = ({ onNavigate }) => {
    // ==================== AUTH & HOOKS ====================
    const { user } = useAuth();
    const sound = useSound();

    // Subscription & Hearts
    const { isPaid, tier } = useSubscription();
    const { decrementHeart, isOutOfHearts } = useFreePlanHearts();
    const [showPaywall, setShowPaywall] = useState(false);

    // ==================== STATE ====================
    const [exercise, setExercise] = useState<WritingExercise | null>(null);
    const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
    const [visibleOptions, setVisibleOptions] = useState<string[]>([]); // For 50/50 power-up
    const [currentSkill, setCurrentSkill] = useState<LogicWeaverSkill | null>(null);

    const [gameState, setGameState] = useState<GameState>({
        status: 'loading',
        lives: 3,
        score: 0,
        timeRemaining: 180,
        maxTime: 180,
        combo: 0,
        powerUps: { fiftyFifty: 2, freeze: 1, hint: 3 },
        streakBonus: 1
    });

    const [isFrozen, setIsFrozen] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);
    const [showGrammarRule, setShowGrammarRule] = useState(false);
    const [showErrorScreen, setShowErrorScreen] = useState(false);
    const [starsEarned, setStarsEarned] = useState<0 | 1 | 2 | 3>(0);
    const [showSkillPicker, setShowSkillPicker] = useState(false);
    const [completedCount, setCompletedCount] = useState(() => {
        const stored = localStorage.getItem('logic_weaver_completed_count');
        return stored ? parseInt(stored, 10) : 0;
    });

    // Fetch progress for skill picker (merge with localStorage) and auto-resume skill
    useEffect(() => {
        if (user) {
            writingGymProgressService.getAllLevelProgress(user.id, 'logic_weaver')
                .then(progress => {
                    const dbCount = progress.filter(p => p.stars_earned > 0).length;
                    const localCount = parseInt(localStorage.getItem('logic_weaver_completed_count') || '0', 10);
                    const count = Math.max(dbCount, localCount);
                    setCompletedCount(count);
                    localStorage.setItem('logic_weaver_completed_count', String(count));

                    // Auto-set current skill if not already set
                    const currentSkillId = localStorage.getItem('logic_weaver_current_skill');
                    if (!currentSkillId && count > 0 && count < LOGIC_WEAVER_SKILLS.length) {
                        // Resume from the next uncompleted skill
                        const nextSkillId = LOGIC_WEAVER_SKILLS[count]?.id;
                        if (nextSkillId) {
                            localStorage.setItem('logic_weaver_current_skill', nextSkillId);
                        }
                    }
                });
        }
    }, [user, showSkillPicker]);

    // ==================== EFFECTS ====================
    useEffect(() => {
        loadNewExercise();
    }, []);

    // Timer
    useEffect(() => {
        if (gameState.status === 'playing' && !isFrozen) {
            const timer = setInterval(() => {
                setGameState(prev => {
                    if (prev.timeRemaining <= 0) {
                        clearInterval(timer);
                        handleTimeOut();
                        return prev;
                    }
                    return { ...prev, timeRemaining: prev.timeRemaining - 1 };
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState.status, isFrozen]);

    // ==================== GAME LOGIC ====================

    const loadNewExercise = async () => {
        if (!isPaid && isOutOfHearts) {
            setShowPaywall(true);
            return;
        }

        setGameState(prev => ({ ...prev, status: 'loading' }));
        setSelectedConnector(null);
        setShowHint(false);
        setIsFrozen(false);
        setShowSuccessScreen(false);
        setShowErrorScreen(false);

        try {
            let skillId = localStorage.getItem('logic_weaver_current_skill');
            if (!skillId) skillId = 'LW01';

            const skillDetails = await import('../../data/logicWeaverSkills').then(m => m.getLogicWeaverSkill(skillId!));
            setCurrentSkill(skillDetails || null);

            const data = await writingGymService.generateExercise('logic_weaver', skillId, 'intermediate', user?.id);

            // Check if fallback was used via a specific heuristic since we stripped error throwing from service 
            // Most fallback exercises don't have explanation dynamically set well
            if (data.explanation === "Explanation will appear here." && data.id) {
                import('react-hot-toast').then(({ toast }) => {
                    toast("Using Offline Training Mode", { icon: "🔌", id: "offline-toast" })
                });
            }

            setExercise(data);

            // Deduplicate connectors by normalized lowercase value to prevent visual duplicates
            const rawOptions: string[] = data.options || data.connectors || [];
            const seen = new Set<string>();
            const dedupedOptions = rawOptions.filter(opt => {
                const key = opt.toLowerCase().trim();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            setVisibleOptions(dedupedOptions);

            setGameState(prev => ({
                ...prev,
                status: 'playing',
                timeRemaining: prev.maxTime,
                combo: prev.status === 'success' ? prev.combo : 0
            }));

            sound.play('start');
        } catch (e: any) {
            console.error(e);
            if (e.name === 'RateLimitError' || e.message?.includes('Rate limit')) {
                import('react-hot-toast').then(({ toast }) => {
                    toast.error('⏱️ Daily AI limit reached! Try again later.', { duration: 4000 });
                });
                setGameState(prev => ({ ...prev, status: 'error' }));
                return;
            }
            // Other extreme UI failures
            setGameState(prev => ({ ...prev, status: 'error' }));
        }
    };

    const handleTimeOut = () => {
        setGameState(prev => ({ ...prev, lives: prev.lives - 1 }));
        sound.play('timeout');

        if (!isPaid) {
            decrementHeart();
        }

        if (gameState.lives <= 1) {
            handleGameOver();
        }
    };

    const handleGameOver = () => {
        setGameState(prev => ({ ...prev, status: 'error' }));
        setShowErrorScreen(true);
        sound.play('error');
    };

    const checkAnswer = (connector: string) => {
        if (!exercise) return;

        setSelectedConnector(connector);

        const correctAnswer = exercise.correct_answer || (exercise as any).correct_connector;
        if (!correctAnswer) {
            console.error('[LogicWeaver] No correct answer found in exercise data', exercise);
            return;
        }
        const isCorrect = connector.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

        if (isCorrect) {
            // Delay slightly to show selection
            setTimeout(() => handleSuccess(connector), 500);
        } else {
            setTimeout(() => handleError(), 500);
        }
    };

    const handleSuccess = async (connector: string) => {
        const timeTaken = gameState.maxTime - gameState.timeRemaining;
        const scoreEarned = calculateScore(gameState.timeRemaining, gameState.combo, gameState.streakBonus, 500);
        const stars = gameState.score + scoreEarned > 2000 ? 3 : gameState.score + scoreEarned > 1000 ? 2 : 1;

        setGameState(prev => ({
            ...prev,
            status: 'success',
            score: prev.score + scoreEarned,
            combo: prev.combo + 1,
            streakBonus: prev.streakBonus + 0.1
        }));

        sound.play('success', gameState.combo);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setShowSuccessScreen(true);

        const currentId = localStorage.getItem('logic_weaver_current_skill') || 'LW01';
        const currentIndex = LOGIC_WEAVER_SKILLS.findIndex(s => s.id === currentId);
        if (currentIndex >= 0) {
            const newCount = Math.max(completedCount, currentIndex + 1);
            setCompletedCount(newCount);
            localStorage.setItem('logic_weaver_completed_count', String(newCount));
        }

        if (user && currentSkill) {
            try {
                await writingGymProgressService.updateProgress(
                    user.id,
                    'logic_weaver',
                    currentSkill.id,
                    { best_score: scoreEarned, best_time_ms: timeTaken * 1000 }
                );

                await writingGymProgressService.saveSession({
                    userId: user.id,
                    level: 'logic_weaver',
                    skillId: currentSkill.id,
                    score: scoreEarned,
                    totalTime: timeTaken * 1000,
                    attempts: 1,
                    wrongMoves: 3 - gameState.lives,
                    starsEarned: stars,
                    exerciseData: {
                        main: exercise?.clauses?.main,
                        subordinate: exercise?.clauses?.subordinate,
                        connector: connector
                    }
                });
            } catch (err) {
                console.error("Failed to save progress", err);
            }
        }

        if (user?.id) {
            oracleService.recalculatePrediction(user.id).catch(err =>
                console.warn('[OracleTrigger] Background recalc failed:', err)
            );
        }
    };

    const handleError = () => {
        setIsShaking(true);
        setTimeout(() => {
            setIsShaking(false);
            setSelectedConnector(null); // Reset selection on error
        }, 500);

        setGameState(prev => ({
            ...prev,
            lives: prev.lives - 1,
            combo: 0,
            streakBonus: 1
        }));

        sound.play('error');

        if (!isPaid) {
            decrementHeart();
        }

        if (gameState.lives <= 1) {
            setTimeout(handleGameOver, 500);
        }
    };

    const handleNextLevel = () => {
        const currentId = localStorage.getItem('logic_weaver_current_skill') || 'LW01';
        const nextId = getNextSkillId(currentId);
        if (nextId) {
            localStorage.setItem('logic_weaver_current_skill', nextId);
            setShowSuccessScreen(false);
            loadNewExercise();
        } else {
            onNavigate(AppView.WRITING_GYM_HUB);
        }
    };

    // ==================== POWER-UPS ====================

    const handleFiftyFifty = () => {
        if (gameState.powerUps.fiftyFifty <= 0 || !exercise) return;

        const correct = exercise.correct_answer || (exercise as any).correct_connector || "";
        const currentOptions = visibleOptions;
        const wrongOptions = currentOptions.filter(opt => opt !== correct);
        const shuffledWrong = [...wrongOptions].sort(() => Math.random() - 0.5);
        const toRemove = shuffledWrong.slice(0, 2);

        setVisibleOptions(prev => prev.filter(opt => !toRemove.includes(opt)));

        setGameState(prev => ({
            ...prev,
            powerUps: { ...prev.powerUps, fiftyFifty: prev.powerUps.fiftyFifty - 1 }
        }));
        sound.play('powerup');
    };

    const handleFreeze = () => {
        if (gameState.powerUps.freeze <= 0 || isFrozen) return;

        setIsFrozen(true);
        setTimeout(() => setIsFrozen(false), 15000);

        setGameState(prev => ({
            ...prev,
            powerUps: { ...prev.powerUps, freeze: prev.powerUps.freeze - 1 }
        }));
        sound.play('powerup');
    };

    const handleHint = () => {
        if (gameState.powerUps.hint <= 0) return;

        setShowHint(true);
        setGameState(prev => ({
            ...prev,
            powerUps: { ...prev.powerUps, hint: prev.powerUps.hint - 1 }
        }));
        sound.play('powerup');
    }

    // ==================== RENDER ====================

    if (gameState.status === 'loading') return <div className="h-full flex items-center justify-center font-bold text-emerald-500 animate-pulse bg-[#F0FDF4] dark:bg-black">Weaving Logic...</div>;

    if (showSuccessScreen) {
        const currentId = localStorage.getItem('logic_weaver_current_skill') || 'LW01';
        const nextId = getNextSkillId(currentId);

        return (
            <div className="h-full relative">
                <LogicWeaverSuccessScreen
                    onNext={loadNewExercise}
                    onReview={() => setShowGrammarRule(true)}
                    onNextLevel={handleNextLevel}
                    onBack={() => onNavigate(AppView.WRITING_GYM_HUB)}
                    hasNextLevel={!!nextId}
                    xpEarned={Math.min(25 + (gameState.combo * 5), 75)}
                    sentence={{
                        main: exercise?.clauses?.main || "",
                        connector: selectedConnector || "",
                        subordinate: exercise?.clauses?.subordinate || ""
                    }}
                />
                {/* Grammar Rule Modal */}
                {showGrammarRule && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <Play className="w-5 h-5 text-emerald-500" /> Grammar Rule
                                </h3>
                                <button
                                    onClick={() => setShowGrammarRule(false)}
                                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            {currentSkill && (
                                <div className="mb-4">
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
                                        {currentSkill.name}
                                    </p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {currentSkill.description}
                                    </p>
                                </div>
                            )}
                            {exercise?.explanation && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-4">
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-1">Why this connector?</p>
                                    <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                                        {exercise.explanation}
                                    </p>
                                </div>
                            )}
                            {!exercise?.explanation && !currentSkill && (
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    No additional grammar rule available for this exercise.
                                </p>
                            )}
                            <button
                                onClick={() => setShowGrammarRule(false)}
                                className="mt-5 w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors"
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (showErrorScreen) {
        return (
            <MasonErrorScreen
                userSentence={exercise?.clauses ? `${exercise.clauses.main} ${selectedConnector} ${exercise.clauses.subordinate}` : ''}
                correctSentence={exercise?.clauses ? `${exercise.clauses.main} ${exercise.correct_answer} ${exercise.clauses.subordinate}` : ''}
                grammarTip={exercise?.explanation}
                onRetry={() => {
                    setGameState(prev => ({ ...prev, score: 0, lives: 3, combo: 0 }));
                    loadNewExercise();
                }}
                onBack={() => onNavigate(AppView.WRITING_GYM_HUB)}
            />
        );
    }

    return (
        <LazyMotion features={domAnimation}>
            <div className="h-[100dvh] flex flex-col bg-[#F0FDF4] dark:bg-black overflow-hidden relative">

                {/* --- Header --- */}
                <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between z-20 gap-3">
                    <button
                        onClick={() => onNavigate(AppView.WRITING_GYM_HUB)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors self-start mt-1"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                    <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
                            <div className="flex items-center gap-2">
                                <span>Logic Linker</span>
                                <button
                                    onClick={() => setShowSkillPicker(true)}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                                >
                                    <Map className="w-4 h-4 text-emerald-500" />
                                </button>
                            </div>
                            <span>{completedCount}/{LOGIC_WEAVER_SKILLS.length} Skills</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden w-full max-w-[180px]">
                            <motion.div
                                className="h-full bg-emerald-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(completedCount / LOGIC_WEAVER_SKILLS.length) * 100}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-4">
                        {[...Array(3)].map((_, i) => (
                            <Heart
                                key={i}
                                className={`w-6 h-6 transition-colors fill-current ${i < gameState.lives ? 'text-red-500' : 'text-slate-300 dark:text-slate-700'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* --- Main Game Area --- */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full relative z-10 overflow-y-auto custom-scrollbar">

                    {/* Vertical Flow Line */}
                    <div className="absolute top-10 bottom-40 left-1/2 w-0.5 bg-slate-200 dark:bg-slate-800 -translate-x-1/2 -z-10" />

                    {/* PREMISE */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 w-full mb-4 relative min-h-[100px] flex items-center justify-center text-center"
                    >
                        <div className="absolute top-0 left-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-br-lg rounded-tl-2xl tracking-wide uppercase">
                            Premise
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-lg leading-snug">
                            {exercise?.clauses ? exercise.clauses.main : "Loading..."}
                        </p>
                    </motion.div>

                    {/* CONNECTOR LINK */}
                    <div className="relative z-10 my-2">
                        <motion.div
                            animate={isShaking ? { x: [-3, 3, -3, 3, 0] } : {}}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 transition-all bg-white dark:bg-slate-800 ${selectedConnector ? 'border-emerald-500 text-emerald-500' : 'border-emerald-400 text-emerald-500 shadow-emerald-200 dark:shadow-emerald-900/20'
                                }`}
                        >
                            <Link2 className="w-6 h-6" strokeWidth={2.5} />
                        </motion.div>
                    </div>

                    {/* CONCLUSION */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 w-full mt-4 mb-8 relative min-h-[100px] flex items-center justify-center text-center"
                    >
                        <div className="absolute top-0 left-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-br-lg rounded-tl-2xl tracking-wide uppercase">
                            Conclusion
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-lg leading-snug">
                            {exercise?.clauses ? exercise.clauses.subordinate : "Loading..."}
                        </p>
                    </motion.div>

                    {/* SELECTION AREA */}
                    <div className="w-full">
                        <h3 className="text-center text-xs font-bold text-slate-400 mb-3 tracking-widest uppercase">Select Connector</h3>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <AnimatePresence>
                                {visibleOptions.map((conn) => (
                                    <motion.button
                                        key={conn}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => checkAnswer(conn)}
                                        className={`
                                            h-16 rounded-xl font-bold text-base transition-all shadow-sm border-2
                                            bg-white dark:bg-slate-900 border-white dark:border-slate-800 text-slate-700 dark:text-slate-300
                                            hover:border-emerald-200 dark:hover:border-emerald-900 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-md
                                        `}
                                    >
                                        <span className="capitalize">{conn}</span>
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                </div>

                {/* --- Footer PowerUps --- */}
                <div className="flex-shrink-0 px-6 py-6 flex items-center justify-center gap-8 z-20">
                    <button
                        onClick={handleFiftyFifty}
                        disabled={gameState.powerUps.fiftyFifty <= 0}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors relative">
                            <Split className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            {gameState.powerUps.fiftyFifty > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{gameState.powerUps.fiftyFifty}</span>}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">50/50</span>
                    </button>

                    <button
                        onClick={handleFreeze}
                        disabled={gameState.powerUps.freeze <= 0 || isFrozen}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors relative ${isFrozen ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                            <Snowflake className="w-5 h-5" />
                            {gameState.powerUps.freeze > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{gameState.powerUps.freeze}</span>}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">FREEZE</span>
                    </button>

                    <button
                        onClick={handleHint}
                        disabled={gameState.powerUps.hint <= 0}
                        className="flex flex-col items-center gap-1 group"
                    >
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors relative">
                            <Lightbulb className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{gameState.powerUps.hint}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">HINT</span>
                    </button>

                    {/* Add Hint System Component hidden but functional if needed, or integrate better with button above. 
                        For now, the button toggles the hint state, but we need to show the actual hint content.
                        Let's reuse the existing hint/translation display logic if possible or simplify.
                    */}
                    {showHint && exercise?.translation && (
                        <div className="absolute bottom-24 left-4 right-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-xl shadow-lg animate-in slide-in-from-bottom-5">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium text-center">
                                {exercise.translation}
                            </p>
                        </div>
                    )}
                </div>

                <LogicWeaverSkillPicker
                    isOpen={showSkillPicker}
                    onClose={() => setShowSkillPicker(false)}
                    onSelectSkill={(skillId) => {
                        localStorage.setItem('logic_weaver_current_skill', skillId);
                        setShowSkillPicker(false);
                        loadNewExercise();
                    }}
                    completedLevels={completedCount}
                />

                {/* HEART PAYWALL MODAL */}
                <PaywallSheet
                    isOpen={showPaywall}
                    onClose={() => setShowPaywall(false)}
                    currentTier={tier}
                    triggeredBy="writing_gym_advanced" // Gated by hearts
                />

            </div>
        </LazyMotion>
    );
};

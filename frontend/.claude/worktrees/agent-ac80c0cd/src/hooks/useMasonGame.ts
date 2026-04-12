import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { getGuestUserId } from '../utils/guestUser';
import { writingGymService } from '../services/writingGymService';
import { masonSessionService } from '../services/masonSessionService';
import { loggingService } from '../services/loggingService';
import { metricsService } from '../services/metricsService';
import { useMasonAnalytics } from './useMasonAnalytics';
import { useSound } from './useSound';
import { MASON_SKILLS } from '../data/masonSkills';
import { getLevelByNumber } from '../data/masonLevels';
import { AppView, WritingExercise } from '../types';
import { MasonItem, MasonGameState } from '../types/mason';
import { calculateScore } from '../utils/gameUtils';
import { masonHaptics } from '../utils/masonHaptics';
import { normalizeSentence } from '../utils/masonUtils';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import confetti from 'canvas-confetti';

export interface UseMasonGameProps {
    initialLevel?: number;
    onNavigate: (view: AppView) => void;
    decrementHeart?: () => void;
    isOutOfHearts?: boolean;
    onPaywall?: () => void;
}

export const useMasonGame = ({ initialLevel, onNavigate, decrementHeart, isOutOfHearts, onPaywall }: UseMasonGameProps) => {
    // ==================== AUTH & USER ====================
    const { user } = useAuth();
    const userId = user?.id || getGuestUserId();
    const sound = useSound();
    // ==================== STATE ====================
    const getSavedLevel = (): number => {
        if (initialLevel) return initialLevel;
        try {
            const universalSaved = localStorage.getItem('mason_progress_level');
            const userSaved = localStorage.getItem(`mason_highest_level_${userId}`);
            const saved = universalSaved || userSaved;
            if (saved) {
                const highestCompleted = parseInt(saved, 10);
                if (!isNaN(highestCompleted) && highestCompleted >= 1 && highestCompleted <= 50) {
                    return Math.min(highestCompleted + 1, 50);
                }
            }
        } catch (e) {
            console.error('[MasonLevel] Failed to read saved progress', e);
        }
        return 1;
    };

    const [currentLevel, setCurrentLevel] = useState<number>(() => getSavedLevel());

    // Derived State
    const levelData = getLevelByNumber(currentLevel);
    const currentSkillId = levelData?.skillId || 'S01';
    const currentSkill = MASON_SKILLS.find(s => s.id === currentSkillId);

    const analytics = useMasonAnalytics(userId, currentSkillId);
    const [exercise, setExercise] = useState<WritingExercise | null>(null);
    const [items, setItems] = useState<MasonItem[]>([]); // Pool Area
    const [placedItems, setPlacedItems] = useState<MasonItem[]>([]); // Target Area

    // UI State
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);
    const [showErrorScreen, setShowErrorScreen] = useState(false);
    const [showSkillMap, setShowSkillMap] = useState(false);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [pendingSession, setPendingSession] = useState<any>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isFrozen, setIsFrozen] = useState(false);

    const [gameState, setGameState] = useState<MasonGameState>({
        status: 'loading',
        currentLevel: currentLevel,
        lives: 3,
        score: 0,
        timeRemaining: 180, // 3 minutes default
        maxTime: 180,
        combo: 0,
        powerUps: {
            reveal: 2,
            freeze: 1,
            shuffle: 3,
            hint: 5
        },
        streakBonus: 1,
        placedItems: [],
        startTime: Date.now()
    });



    // ==================== HANDLERS ====================

    const isLoadingRef = useRef(false);

    const loadNewExercise = useCallback(async (overrides?: { levelNum?: number, skillId?: string, difficulty?: 'normal' | 'hard' }) => {
        if (isOutOfHearts && onPaywall) {
            onPaywall();
            return;
        }

        // Concurrent load guard — prevent parallel API calls
        if (isLoadingRef.current) {
            loggingService.info('MasonLevel', 'Skipping duplicate load (already loading)');
            return;
        }
        isLoadingRef.current = true;

        setGameState(prev => ({ ...prev, status: 'loading' }));
        setShowSuccessScreen(false);
        setShowErrorScreen(false);

        // If overrides specify a new level, update state so header stays in sync
        if (overrides?.levelNum && overrides.levelNum !== currentLevel) {
            setCurrentLevel(overrides.levelNum);
        }

        const effectiveLevel = overrides?.levelNum ?? currentLevel;
        const effectiveSkillId = overrides?.skillId ?? currentSkillId;
        // Map Mason 'normal'/'hard' to 'intermediate'/'advanced' or similar
        const rawDifficulty = overrides?.difficulty ?? currentSkill?.difficulty ?? 'intermediate';
        // Ensure strictly typed difficulty for generator
        const effectiveDifficulty: 'beginner' | 'intermediate' | 'advanced' =
            rawDifficulty === 'normal' ? 'intermediate' :
                rawDifficulty === 'hard' ? 'advanced' :
                    (rawDifficulty as any); // Fallback

        const startTime = Date.now();

        try {
            loggingService.info('MasonLevel', 'Loading exercise', { level: effectiveLevel, skillId: effectiveSkillId });

            const timeoutPromise = new Promise<WritingExercise>((_, reject) =>
                setTimeout(() => reject(new Error('Exercise generation timed out')), 15000)
            );

            const data = await Promise.race([
                writingGymService.generateExercise('mason', effectiveSkillId, effectiveDifficulty),
                timeoutPromise
            ]);

            metricsService.recordTiming('MasonLevel', 'exercise_load', Date.now() - startTime, { level: effectiveLevel });
            setExercise(data);

            // Create session
            const session = await masonSessionService.createSession(
                userId,
                data.id || crypto.randomUUID(),
                effectiveSkillId
            );
            setSessionId(session.sessionId);

            analytics.startTracking(data, gameState.maxTime * 1000);

            if (data.fragments && data.fragments.length > 0) {
                const generatedItems: MasonItem[] = data.fragments.map((fragment, index) => ({
                    id: `brick-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
                    content: fragment,
                    type: /^[.,!?;:]$/.test(fragment) ? 'punctuation' : 'word',
                    role: undefined
                }));
                setItems(generatedItems.sort(() => Math.random() - 0.5));
            } else {
                // Defensive: fragments missing even after service validation
                console.error('[MasonLevel] Exercise loaded but fragments are empty! Exercise data:', data);
                loggingService.error('MasonLevel', 'Exercise has no fragments', { level: effectiveLevel, skillId: effectiveSkillId });
                setGameState(prev => ({ ...prev, status: 'error' }));
                return;
            }

            setPlacedItems([]);
            setGameState(prev => ({
                ...prev,
                status: 'playing',
                timeRemaining: prev.maxTime,
                combo: 0,
                placedItems: [],
                startTime: Date.now()
            }));

            sound.play('start');

        } catch (error) {
            console.error(error);
            loggingService.error('MasonLevel', 'Exercise load failed', { level: effectiveLevel, skillId: effectiveSkillId }, error as Error);
            setGameState(prev => ({ ...prev, status: 'error' }));
        } finally {
            isLoadingRef.current = false;
        }
    }, [currentLevel, currentSkillId, userId, gameState.maxTime, analytics, sound, isOutOfHearts, onPaywall]);

    // Resume Check
    useEffect(() => {
        const checkResume = async () => {
            const activeSession = await masonSessionService.getActiveSession(userId);
            if (activeSession && activeSession.status === 'in_progress') {
                setPendingSession(activeSession);
                setShowResumePrompt(true);
            } else {
                loadNewExercise();
            }
        };
        // Only run on mount
        checkResume();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleResumeSession = async () => {
        if (!pendingSession) return;

        try {
            const session = await masonSessionService.resumeSession(pendingSession.sessionId);
            if (session) {
                setSessionId(session.sessionId);
                // Restore game meta (score, lives, combo, powerUps) but NOT status
                // because we need to load a fresh exercise
                setGameState(prev => ({
                    ...prev,
                    lives: session.gameState.lives,
                    score: session.gameState.score,
                    combo: session.gameState.combo,
                    streakBonus: session.gameState.streakBonus,
                    powerUps: session.gameState.powerUps,
                }));
            }
            setShowResumePrompt(false);
            // Load a fresh exercise for the resumed level
            const resumeLevel = pendingSession.gameState?.currentLevel || currentLevel;
            loadNewExercise({ levelNum: resumeLevel });
        } catch (e) {
            console.error(e);
            setShowResumePrompt(false);
            loadNewExercise();
        }
    };

    const handleStartNew = async () => {
        if (pendingSession) {
            await masonSessionService.completeSession(pendingSession.sessionId, 'abandoned');
        }
        setShowResumePrompt(false);
        loadNewExercise();
    };


    const [showHint, setShowHint] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

    // ==================== INTERACTION HELPERS ====================

    const signalInteraction = useCallback(() => {
        // Reset hint states on interaction
        if (showHint) setShowHint(false);
    }, [showHint]);

    const triggerShake = () => {
        // Visual shake effect - usually handled by UI component based on state, 
        // but we can expose a "shake" trigger if needed.
        // For now we rely on sound/haptics here.
    };

    // ==================== GAME LOGIC ====================

    const lockCorrectWord = useCallback(() => {
        if (!exercise?.fragments || placedItems.length >= exercise.fragments.length) return;

        const nextCorrectFragment = exercise.fragments[placedItems.length];
        const matchingItem = items.find(item => item.content === nextCorrectFragment);

        if (matchingItem) {
            signalInteraction();
            setItems(prev => prev.filter(i => i.id !== matchingItem.id));
            setPlacedItems(prev => [...prev, { ...matchingItem, isLocked: true }]);
            sound.play('powerUp');
            masonHaptics.medium();
        }
    }, [exercise, items, placedItems, signalInteraction, sound]);

    // Idle Hint Effect
    useEffect(() => {
        if (gameState.status !== 'playing' || isFrozen) return;

        // Level 2: Show Hint (Translation) after 10s
        const hintTimer = setTimeout(() => {
            setShowHint(true);
            sound.play('hint');
        }, 10000);

        // Level 3: Auto-Lock after 20s
        const lockTimer = setTimeout(() => {
            lockCorrectWord();
        }, 20000);

        return () => {
            clearTimeout(hintTimer);
            clearTimeout(lockTimer);
        };
    }, [gameState.status, isFrozen, items, placedItems, lockCorrectWord, sound]);

    const handleHint = () => {
        if (gameState.powerUps.hint > 0) {
            setShowExplanation(true);
            setGameState(p => ({ ...p, powerUps: { ...p.powerUps, hint: p.powerUps.hint - 1 } }));
        }
    };


    // ==================== POWER-UPS ====================

    const [revealedItemId, setRevealedItemId] = useState<string | null>(null);

    const handleReveal = () => {
        if (gameState.powerUps.reveal <= 0 || !exercise) return;

        signalInteraction();

        // Find next correct word
        if (!exercise.fragments) return;
        const nextCorrectFragment = exercise.fragments[placedItems.length];

        // Find in pool
        const itemToReveal = items.find(item => item.content === nextCorrectFragment);

        if (itemToReveal) {
            // We need to signal the UI to highlight this item.
            // We can return the ID to highlight, or set a transient state.
            // Let's expose a transient state 'revealedItemId'
            setRevealedItemId(itemToReveal.id);
            sound.play('powerup');
            setTimeout(() => setRevealedItemId(null), 3000);
        }

        setGameState(prev => ({
            ...prev,
            powerUps: { ...prev.powerUps, reveal: prev.powerUps.reveal - 1 }
        }));
    };

    const handleFreeze = () => {
        if (gameState.powerUps.freeze <= 0 || isFrozen) return;

        signalInteraction();
        setIsFrozen(true);
        sound.play('powerup');

        setTimeout(() => {
            setIsFrozen(false);
            sound.play('hint');
        }, 15000);

        setGameState(prev => ({
            ...prev,
            powerUps: { ...prev.powerUps, freeze: prev.powerUps.freeze - 1 }
        }));
    };

    const handleShuffle = () => {
        if (gameState.powerUps.shuffle <= 0) return;

        signalInteraction();
        setItems(prev => [...prev].sort(() => Math.random() - 0.5));
        sound.play('powerup');
        masonHaptics.selection();

        setGameState(prev => ({
            ...prev,
            powerUps: { ...prev.powerUps, shuffle: prev.powerUps.shuffle - 1 }
        }));
    };

    // ==================== DRAG & DROP ====================

    const handleDragEnd = (event: DragEndEvent) => {
        signalInteraction();
        const { active, over } = event;

        if (!over) { sound.play('dropFail'); return; }

        const activeInItems = items.find(i => i.id === active.id);
        const activeInPlaced = placedItems.find(i => i.id === active.id);

        if (activeInItems && over.id === 'target-area') {
            setPlacedItems(prev => [...prev, activeInItems]);
            setItems(prev => prev.filter(i => i.id !== active.id));
            sound.play('dropSuccess');
        } else if (activeInPlaced && over.id === 'pool-area') {
            setItems(prev => [...prev, activeInPlaced]);
            setPlacedItems(prev => prev.filter(i => i.id !== active.id));
            sound.play('dropSuccess');
        } else if (active.id !== over.id) {
            if (activeInItems) {
                setItems(prev => {
                    const oldIdx = prev.findIndex(i => i.id === active.id);
                    const newIdx = prev.findIndex(i => i.id === over.id);
                    return arrayMove(prev, oldIdx, newIdx);
                });
            } else if (activeInPlaced) {
                setPlacedItems(prev => {
                    const oldIdx = prev.findIndex(i => i.id === active.id);
                    const newIdx = prev.findIndex(i => i.id === over.id);
                    return arrayMove(prev, oldIdx, newIdx);
                });
            }
            sound.play('reorder');
        }
    };

    // Tap to move
    const handleItemTap = (item: MasonItem, from: 'pool' | 'target') => {
        signalInteraction();
        sound.play('tap');
        masonHaptics.light();

        if (from === 'pool') {
            setItems(prev => prev.filter(i => i.id !== item.id));
            setPlacedItems(prev => [...prev, item]);
            sound.play('lock');
        } else {
            setPlacedItems(prev => prev.filter(i => i.id !== item.id));
            setItems(prev => [...prev, item]);
            sound.play('reorder');
        }
    };

    // ==================== COMPLETION & ERROR ====================

    const handleSuccess = async () => {
        metricsService.recordCount('MasonLevel', 'session_completed', 1, {
            level: currentLevel,
            finalScore: gameState.score
        });

        const totalScore = calculateScore(gameState.timeRemaining, gameState.combo, gameState.streakBonus, 1000);

        // Update local state first for instant feedback
        setGameState(prev => ({
            ...prev,
            status: 'success',
            score: prev.score + totalScore,
            combo: prev.combo + 1,
            streakBonus: prev.streakBonus + 0.1
        }));

        // Trigger Confetti
        if ((gameState.combo + 1) % 5 === 0) {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        } else {
            confetti({ particleCount: 50, spread: 40, origin: { y: 0.6 } });
        }

        sound.play('success', gameState.combo);
        masonHaptics.success();
        setShowSuccessScreen(true);

        // Async persistence
        if (sessionId) {
            await masonSessionService.completeSession(sessionId, 'completed');
        }

        // Analytics tracking
        analytics.completeTracking(totalScore).catch(console.error);

        // Save progress logic
        try {
            const prevHighest = parseInt(localStorage.getItem('mason_progress_level') || '0', 10);
            if (currentLevel > prevHighest) {
                localStorage.setItem('mason_progress_level', String(currentLevel));
                localStorage.setItem(`mason_highest_level_${userId}`, String(currentLevel));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleError = useCallback(() => {
        metricsService.recordCount('MasonLevel', 'wrong_answer', 1, { level: currentLevel, livesLeft: gameState.lives - 1 });
        sound.play('error');
        masonHaptics.error();

        if (gameState.lives > 1) {
            setGameState(prev => ({
                ...prev,
                lives: prev.lives - 1,
                combo: 0,
                streakBonus: 1
            }));
            analytics.recordAttempt(false);
            if (decrementHeart) {
                decrementHeart(); // Penalize heart
            }
            // Shake effect would happen here in UI
        } else {
            // Game Over
            setGameState(prev => ({ ...prev, status: 'error', lives: 0 }));
            setShowErrorScreen(true);
            sound.play('fail');
            if (decrementHeart) {
                decrementHeart(); // Penalize final heart
            }
            // Cleanup session on game over
            if (sessionId) {
                masonSessionService.abandonSession(sessionId);
            }
        }
    }, [gameState.lives, analytics, sound, sessionId, decrementHeart, currentLevel]);

    const handleTimeOut = useCallback(() => {
        // Time out = immediate game over (all lives lost)
        setGameState(prev => ({ ...prev, status: 'error', lives: 0 }));
        setShowErrorScreen(true);
        sound.play('fail');
        masonHaptics.error();
        if (decrementHeart) {
            decrementHeart();
        }
        // Cleanup session on game over
        if (sessionId) {
            masonSessionService.abandonSession(sessionId);
        }
    }, [decrementHeart, sessionId]);

    const checkAnswer = () => {
        signalInteraction();
        if (!exercise?.target_sentence || placedItems.length === 0) {
            sound.play('error');
            return;
        }

        const currentSentence = normalizeSentence(placedItems.map(i => i.content).join(' '));
        const targetSentence = normalizeSentence(exercise.target_sentence);
        const isCorrect = currentSentence === targetSentence;

        analytics.recordAttempt(isCorrect);

        if (isCorrect) {
            handleSuccess();
        } else {
            handleError();
        }
    };


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
    }, [gameState.status, isFrozen, handleTimeOut]);

    // Auto-Save
    useEffect(() => {
        if (gameState.status !== 'playing' || !sessionId) return;

        const saveTimeout = setTimeout(() => {
            masonSessionService.saveState(sessionId, {
                currentLevel,
                placedItems,
                lives: gameState.lives,
                score: gameState.score,
                combo: gameState.combo,
                status: gameState.status,
                timeRemaining: gameState.timeRemaining,
                maxTime: gameState.maxTime,
                powerUps: gameState.powerUps,
                streakBonus: gameState.streakBonus,
                startTime: gameState.startTime
            }).catch(console.error);
        }, 2000); // 2s debounce

        return () => clearTimeout(saveTimeout);
    }, [
        sessionId, gameState.lives, gameState.score, gameState.combo, gameState.status,
        gameState.timeRemaining, gameState.powerUps, gameState.streakBonus, placedItems, currentLevel, gameState.maxTime, gameState.startTime
    ]);


    // Load exercise when level changes (but skip initial mount — checkResume handles that)
    const loadRef = useRef(loadNewExercise);
    loadRef.current = loadNewExercise;
    const hasMounted = useRef(false);
    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return; // Initial mount handled by checkResume
        }
        loadRef.current();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLevel]);

    return {
        state: {
            currentLevel,
            exercise,
            items,
            placedItems,
            gameState,
            showSuccessScreen,
            showErrorScreen,
            showSkillMap,
            showResumePrompt,
            sessionId,
            pendingSession,
            isFrozen,
            revealedItemId,
            showHint,
            showExplanation
        },
        actions: {
            setCurrentLevel,
            setItems,
            setPlacedItems,
            setGameState,
            setShowSkillMap,
            setShowSuccessScreen,
            setShowErrorScreen,
            setShowExplanation,
            loadNewExercise,
            handleResumeSession,
            handleStartNew,
            handleReveal,
            handleFreeze,
            handleShuffle,
            handleHint,
            handleDragEnd,
            handleItemTap,
            checkAnswer,
            onNavigate // Expose for Try Harder / Next Level buttons
        }
    };
};

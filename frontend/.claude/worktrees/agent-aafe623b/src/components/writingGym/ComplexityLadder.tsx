import { motion } from 'framer-motion';
import { ArrowLeft, Lightbulb, Send, Trophy, Star, CheckCircle2, XCircle, Loader2, RefreshCw, Lock } from 'lucide-react';
import React, { useState } from 'react';
import { useEffect } from 'react';

import { COMPLEXITY_LADDER_SKILLS, getComplexityLadderSkill } from '../../data/complexityLadderSkills';
import { useAuth } from '../../hooks/useAuth';
import sessionPersistenceService, { useSessionPersistence } from '../../services/sessionPersistenceService';
import { writingGymService } from '../../services/writingGymService';
import { AppView, ComplexityLadderLevel, LadderHistoryItem } from '../../types';
import { getGuestUserId } from '../../utils/guestUser';
import { Button } from '../Button';
import { ComplexityLadderSkillPicker, SkillProgress } from './ComplexityLadderSkillPicker';

const TOTAL_LEVELS_PER_SKILL = 5;

/** Load per-skill level progress from localStorage cache */
function loadSkillProgressFromCache(userId: string, skillId: string): SkillProgress {
    try {
        const raw = localStorage.getItem(`complexity_ladder_progress_cache_${userId}_${skillId}`);
        if (raw) return JSON.parse(raw) as SkillProgress;
    } catch {
        // ignore
    }
    return { passedLevels: [], masteryPercentage: 0, bestScores: {} };
}

/** Persist per-skill level progress to localStorage cache */
function saveSkillProgressToCache(userId: string, skillId: string, progress: SkillProgress): void {
    try {
        localStorage.setItem(
            `complexity_ladder_progress_cache_${userId}_${skillId}`,
            JSON.stringify(progress)
        );
    } catch {
        // ignore
    }
}

async function fetchSkillProgress(userId: string, skillId: string): Promise<SkillProgress> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const svc = writingGymService as any;
        if (typeof svc.getComplexitySkillProgress === 'function') {
            return await svc.getComplexitySkillProgress(userId, skillId) as SkillProgress;
        }
    } catch {
        // not yet available
    }
    return loadSkillProgressFromCache(userId, skillId);
}

type Status = 'loading' | 'picker' | 'welcome' | 'generating' | 'playing' | 'verifying' | 'complete' | 'mastered' | 'recovery_prompt';

interface Props {
    onNavigate: (view: AppView) => void;
}

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
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const [history, setHistory] = useState<LadderHistoryItem[]>([]);
    const [completedSkillsCount, setCompletedSkillsCount] = useState(0);
    const [savedSessionData, setSavedSessionData] = useState<unknown>(null);

    // Per-skill progress (5-level lock/unlock)
    const [skillProgress, setSkillProgress] = useState<SkillProgress>({ passedLevels: [], masteryPercentage: 0, bestScores: {} });
    // Toast message for locked level attempts
    const [lockedToast, setLockedToast] = useState<string | null>(null);

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

    // Load per-skill progress whenever a skill is selected
    useEffect(() => {
        if (!selectedSkillId) return;
        fetchSkillProgress(userId, selectedSkillId).then(setSkillProgress);
    }, [selectedSkillId, userId]);

    const loadProgress = async () => {
        if (!user?.id) return;
        try {
            const sessions = await writingGymService.getCompletedLadders(user.id);
            const uniqueSkills = new Set(sessions.map((s: { skill_id: string }) => s.skill_id));
            setCompletedSkillsCount(uniqueSkills.size);
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
    };

    const currentLevel = levels[currentIdx];
    const selectedSkill = selectedSkillId ? getComplexityLadderSkill(selectedSkillId) : null;

    // The next unlocked level index for the selected skill (sequential)
    const nextLevelToPlay = skillProgress.passedLevels.length; // 0-indexed

    // --- ACTIONS ---

    const handleSelectSkill = (skillId: string) => {
        setSelectedSkillId(skillId);
        setStatus('welcome');
    };

    /**
     * Attempt to navigate to a specific skill level (0-indexed).
     * Only sequential unlock: level N requires levels 0..N-1 passed.
     */
    const handleSelectLevel = (levelIdx: number) => {
        const passedCount = skillProgress.passedLevels.length;
        if (levelIdx > passedCount) {
            // Locked
            setLockedToast('Complete the previous level first');
            setTimeout(() => setLockedToast(null), 2500);
            return;
        }
        // Navigate directly to that level within the current game
        setCurrentIdx(levelIdx);
        setUserInput('');
        setFeedback(null);
        setHint(null);
        setStatus('playing');
    };

    const startGame = async () => {
        const effectiveTopic = topic.trim() || 'General';

        console.log(`[Ladder] Starting generation for: "${effectiveTopic}" Skill: ${selectedSkillId}`);
        setStatus('generating');
        setLevels([]);
        setCurrentIdx(nextLevelToPlay);
        setHistory([]);
        setFeedback(null);
        setHint(null);

        try {
            const ladder = await writingGymService.generateComplexityLadder(effectiveTopic, selectedSkillId || undefined);
            console.log(`[Ladder] Generated ${ladder?.length || 0} levels`);

            if (!Array.isArray(ladder) || ladder.length === 0) {
                throw new Error('Invalid ladder response');
            }

            setLevels(ladder);
            setStatus('playing');

            createSession({ levels: ladder, topic: effectiveTopic, selectedSkillId, currentIdx: nextLevelToPlay, history: [] }).catch(() => { });
        } catch (error) {
            console.error('[Ladder] Generation failed:', error);
            setFeedback({ type: 'error', message: 'Failed to generate ladder. Try again.' });
            setStatus('welcome');
        }
    };

    const submitAnswer = async () => {
        if (!userInput.trim() || !currentLevel) return;

        setStatus('verifying');
        setFeedback(null);

        try {
            const result = await writingGymService.verifyComplexityLevel(
                userInput,
                currentLevel.name,
                currentLevel.instruction,
                topic
            );

            if (result.isValid) {
                const newHistoryEntry: LadderHistoryItem = {
                    levelName: currentLevel.name,
                    instruction: currentLevel.instruction,
                    userSentence: userInput,
                    timestamp: new Date().toISOString()
                };
                setHistory(prev => [...prev, newHistoryEntry]);
                setFeedback({ type: 'success', message: result.feedback });

                // Update per-skill level progress
                const newPassedLevels = skillProgress.passedLevels.includes(currentIdx)
                    ? skillProgress.passedLevels
                    : [...skillProgress.passedLevels, currentIdx];
                const updatedProgress: SkillProgress = {
                    ...skillProgress,
                    passedLevels: newPassedLevels,
                    masteryPercentage: Math.round((newPassedLevels.length / TOTAL_LEVELS_PER_SKILL) * 100),
                    bestScores: { ...skillProgress.bestScores, [currentIdx]: 100 }
                };
                setSkillProgress(updatedProgress);
                if (selectedSkillId) {
                    saveSkillProgressToCache(userId, selectedSkillId, updatedProgress);
                }

                // Auto-advance after delay
                setTimeout(() => {
                    if (currentIdx < levels.length - 1) {
                        const nextIdx = currentIdx + 1;
                        setCurrentIdx(nextIdx);
                        setUserInput('');
                        setFeedback(null);
                        setHint(null);
                        setStatus('playing');
                        updatePersistedSession({ currentIdx: nextIdx, history: [...history, newHistoryEntry] }).catch(() => { });
                    } else {
                        // All AI-generated levels complete — check if skill is fully mastered (5/5)
                        const allPassed = newPassedLevels.length >= TOTAL_LEVELS_PER_SKILL;
                        saveProgress();
                        completePersistedSession().catch(() => { });
                        setStatus(allPassed ? 'mastered' : 'complete');
                    }
                }, 1500);
            } else {
                setFeedback({ type: 'error', message: result.feedback });
                setStatus('playing');
            }
        } catch (error) {
            console.error('[Ladder] Verification failed:', error);
            setFeedback({ type: 'error', message: 'Verification failed. Try again.' });
            setStatus('playing');
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
        const gs = (savedSessionData as { gameState: Record<string, unknown> }).gameState;
        if (Array.isArray(gs.levels) && gs.levels.length > 0) {
            setLevels(gs.levels as ComplexityLadderLevel[]);
            setCurrentIdx(typeof gs.currentIdx === 'number' ? gs.currentIdx : 0);
            setTopic(typeof gs.topic === 'string' ? gs.topic : '');
            setSelectedSkillId(typeof gs.selectedSkillId === 'string' ? gs.selectedSkillId : null);
            setHistory(Array.isArray(gs.history) ? gs.history as LadderHistoryItem[] : []);
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

    /** Navigate to next skill after mastery */
    const handleContinueToNextSkill = () => {
        if (!selectedSkillId) {
            setStatus('picker');
            return;
        }
        const currentSkillIndex = COMPLEXITY_LADDER_SKILLS.findIndex(s => s.id === selectedSkillId);
        const nextSkill = COMPLEXITY_LADDER_SKILLS[currentSkillIndex + 1];
        if (nextSkill) {
            setSelectedSkillId(nextSkill.id);
            setTopic('');
            setStatus('welcome');
        } else {
            setStatus('picker');
        }
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
                userId={userId}
            />
        );
    }

    // Mastery Screen — shown after passing all 5 levels for a skill
    if (status === 'mastered') {
        const currentSkillIndex = selectedSkillId
            ? COMPLEXITY_LADDER_SKILLS.findIndex(s => s.id === selectedSkillId)
            : -1;
        const nextSkill = currentSkillIndex >= 0 ? COMPLEXITY_LADDER_SKILLS[currentSkillIndex + 1] : undefined;
        const totalSessions = history.length;

        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 gap-6 overflow-y-auto">
                {/* Celebration animation */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
                    className="text-center space-y-2"
                >
                    <div className="text-5xl mb-2">🎉</div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Skill Mastered!</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        {selectedSkill?.name ?? 'This skill'} — all 5 levels complete
                    </p>
                </motion.div>

                {/* Score summary */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3"
                >
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Summary</h3>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-300">Sessions played</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{totalSessions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-300">Levels passed</span>
                        <span className="text-sm font-bold text-indigo-600">{TOTAL_LEVELS_PER_SKILL}/{TOTAL_LEVELS_PER_SKILL}</span>
                    </div>

                    {/* Best scores per level */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Best Scores</p>
                        <div className="flex gap-1">
                            {Array.from({ length: TOTAL_LEVELS_PER_SKILL }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex-1 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded flex items-center justify-center"
                                >
                                    <Star className="w-3 h-3 text-indigo-500 fill-indigo-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Action buttons */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="flex flex-col gap-3 w-full max-w-xs"
                >
                    {nextSkill && (
                        <Button
                            onClick={handleContinueToNextSkill}
                            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg"
                        >
                            Continue to {nextSkill.name}
                        </Button>
                    )}
                    <Button
                        variant={nextSkill ? 'outline' : undefined}
                        onClick={() => onNavigate(AppView.WRITING_GYM_HUB)}
                        className={`w-full py-4 rounded-xl font-bold ${nextSkill ? 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'}`}
                    >
                        Back to Gym
                    </Button>
                </motion.div>
            </div>
        );
    }

    // Welcome Screen — shows 5-level track with lock/unlock
    if (status === 'welcome') {
        const passedCount = skillProgress.passedLevels.length;

        return (
            <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
                    <Button variant="ghost" size="sm" onClick={() => setStatus('picker')} aria-label="Back to skill picker">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </Button>
                    <span className="font-bold text-slate-800 dark:text-slate-100">Complexity Ladder</span>
                </div>

                {/* Locked toast */}
                {lockedToast && (
                    <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 px-4 py-2 rounded-xl text-sm font-medium text-center">
                        {lockedToast}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6 max-w-md mx-auto w-full space-y-6">
                    {/* Skill hero */}
                    <div className="flex flex-col items-center text-center gap-3 pt-2">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity" />
                            <div className="relative w-20 h-20 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-800">
                                <Trophy className="w-9 h-9 text-indigo-500" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {selectedSkill ? selectedSkill.name : 'Level Up'}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {selectedSkill ? selectedSkill.description : 'Build your sentence structure skills one rung at a time.'}
                            </p>
                        </div>
                    </div>

                    {/* 5-Level Track */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">5 Levels</p>
                        {Array.from({ length: TOTAL_LEVELS_PER_SKILL }).map((_, i) => {
                            const isPassed = skillProgress.passedLevels.includes(i);
                            const isNext = i === passedCount; // next to unlock
                            const isLocked = i > passedCount;

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleSelectLevel(i)}
                                    disabled={isLocked}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                                        isPassed
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                                            : isNext
                                                ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-300 dark:ring-amber-700 hover:bg-amber-100'
                                                : 'bg-slate-50 dark:bg-slate-800/50 opacity-60 cursor-not-allowed'
                                    }`}
                                >
                                    {/* Status icon */}
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                        isPassed
                                            ? 'bg-indigo-500 text-white'
                                            : isNext
                                                ? 'bg-amber-400 text-white'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                    }`}>
                                        {isPassed
                                            ? <CheckCircle2 className="w-4 h-4" />
                                            : isLocked
                                                ? <Lock className="w-3.5 h-3.5" />
                                                : <span className="text-xs font-bold">{i + 1}</span>
                                        }
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${
                                            isPassed ? 'text-indigo-700 dark:text-indigo-300'
                                                : isNext ? 'text-amber-700 dark:text-amber-300'
                                                    : 'text-slate-400'
                                        }`}>
                                            Level {i + 1}
                                        </p>
                                        <p className="text-[10px] text-slate-400 truncate">
                                            {isPassed ? 'Passed — replay for practice' : isNext ? 'Up next' : 'Locked'}
                                        </p>
                                    </div>

                                    {isLocked && <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>

                    {feedback?.type === 'error' && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-medium text-center">
                            {feedback.message}
                        </div>
                    )}

                    {/* Topic input + start */}
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Enter a topic (e.g., Technology)"
                            aria-label="Enter a topic for the complexity ladder"
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium transition-all shadow-sm hover:shadow-md"
                            onKeyDown={(e) => e.key === 'Enter' && startGame()}
                        />
                        <Button
                            onClick={startGame}
                            disabled={!topic.trim()}
                            className="w-full py-5 text-base rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all active:scale-95"
                        >
                            {passedCount > 0 ? `Continue from Level ${passedCount + 1}` : 'Start Climb'}
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
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse" />
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

    // Complete Screen (finished AI levels but not 5/5 skill mastery)
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
                            {s <= stars && <div className="absolute inset-0 bg-amber-400 blur-lg opacity-30 rounded-full" />}
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
                        <Button variant="ghost" size="sm" onClick={() => setStatus('welcome')} className="p-1 -ml-2 h-8 w-8 rounded-full" aria-label="Go back to skill welcome">
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

                            {feedback && (
                                <div className={`rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${feedback.type === 'success'
                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50'
                                    : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50'
                                    }`}>
                                    <div className={`p-1.5 rounded-full shrink-0 ${feedback.type === 'success'
                                        ? 'bg-green-100 dark:bg-green-800/50 text-green-600 dark:text-green-400'
                                        : 'bg-red-100 dark:bg-red-800/50 text-red-600 dark:text-red-400'
                                        }`}>
                                        {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${feedback.type === 'success'
                                            ? 'text-green-800 dark:text-green-200'
                                            : 'text-red-800 dark:text-red-200'
                                            }`}>
                                            {feedback.type === 'success' ? 'Perfect!' : 'Not quite right'}
                                        </p>
                                        <p className={`text-sm mt-0.5 ${feedback.type === 'success'
                                            ? 'text-green-700 dark:text-green-300'
                                            : 'text-red-700 dark:text-red-300'
                                            }`}>
                                            {feedback.message}
                                        </p>
                                    </div>
                                </div>
                            )}
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
                            disabled={status === 'verifying' || feedback?.type === 'success'}
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
                        disabled={!userInput.trim() || status === 'verifying' || feedback?.type === 'success'}
                        className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${feedback?.type === 'success'
                            ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-green-900/30'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30'
                            }`}
                    >
                        {status === 'verifying' ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : feedback?.type === 'success' ? (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Continue
                            </>
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

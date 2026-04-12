import { ArrowLeft, Lightbulb, Send, Trophy, Star, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { useEffect } from 'react';

import { getComplexityLadderSkill } from '../../data/complexityLadderSkills';
import { useAuth } from '../../hooks/useAuth';
import sessionPersistenceService, { useSessionPersistence } from '../../services/sessionPersistenceService';
import { writingGymService } from '../../services/writingGymService';
import { AppView, ComplexityLadderLevel, LadderHistoryItem } from '../../types';
import { getGuestUserId } from '../../utils/guestUser';
import { Button } from '../Button';


import { ComplexityLadderSkillPicker } from './ComplexityLadderSkillPicker';


type Status = 'loading' | 'picker' | 'welcome' | 'generating' | 'playing' | 'verifying' | 'complete' | 'recovery_prompt';

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
    const [savedSessionData, setSavedSessionData] = useState<any>(null);

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
            const uniqueSkills = new Set(sessions.map((s: any) => s.skill_id));
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
        setFeedback(null);
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
                // Save to history
                setHistory(prev => [...prev, {
                    levelName: currentLevel.name,
                    instruction: currentLevel.instruction,
                    userSentence: userInput,
                    timestamp: new Date().toISOString()
                }]);

                setFeedback({ type: 'success', message: result.feedback });

                // Auto-advance after delay
                setTimeout(() => {
                    if (currentIdx < levels.length - 1) {
                        const nextIdx = currentIdx + 1;
                        setCurrentIdx(prev => prev + 1);
                        setUserInput('');
                        setFeedback(null);
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
        const gs = savedSessionData.gameState as any;
        if (gs.levels?.length > 0) {
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

                    {feedback?.type === 'error' && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-medium w-full text-center">
                            {feedback.message}
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

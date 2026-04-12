import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, BookOpen, PenTool, Send, Volume2, RefreshCcw,
    Layout, FileText, CheckCircle2, Clock, Sparkles, Target,
    ChevronRight, Lightbulb, Award, TrendingUp, Loader2, Play, Pause, RotateCcw, RefreshCw, Users
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useAuth } from '../../hooks/useAuth';
import sessionPersistenceService, { useSessionPersistence } from '../../services/sessionPersistenceService';
import { integratedWritingService } from '../../services/integratedWritingService';
import { oracleService } from '../../services/oracleService';
import {
    AppView,
    IntegratedWritingTask as IWTask,
    IntegratedWritingEvaluation
} from '../../types';
import { getGuestUserId } from '../../utils/guestUser';
import { Button } from '../Button';
import { AchievementNotification, useAchievements } from '../peerReview/AchievementNotification';

import { FeedbackCard } from './FeedbackCard';

type Phase = 'recovery_prompt' | 'intro' | 'reading' | 'listening' | 'writing' | 'feedback';

const READING_TIME = 180; // 3 minutes
const LISTENING_TIME = 120; // 2 minutes  
const WRITING_TIME = 1200; // 20 minutes

export const IntegratedWritingTask: React.FC<{ onNavigate: (view: AppView) => void }> = ({ onNavigate }) => {
    const { user } = useAuth();
    const userId = user?.id || getGuestUserId();

    const {
        createSession,
        updateSession: updatePersistedSession,
        completeSession: completePersistedSession,
        startFresh
    } = useSessionPersistence(userId, 'integrated_writing');

    // Phase & Task State
    const [phase, setPhase] = useState<Phase>('intro');
    const [task, setTask] = useState<IWTask | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Timer State
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [phaseDurations, setPhaseDurations] = useState({ reading: 0, listening: 0, writing: 0 });

    // User Input State
    const [userNotes, setUserNotes] = useState('');
    const [essay, setEssay] = useState('');
    const [activeTab, setActiveTab] = useState<'reference' | 'response'>('response');

    // Feedback State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [evaluation, setEvaluation] = useState<IntegratedWritingEvaluation | null>(null);

    // Audio State
    const [audioId, setAudioId] = useState<string | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioError, setAudioError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
    const [showTranscript, setShowTranscript] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Achievement Hook
    const { currentAchievement, showAchievement, closeAchievement } = useAchievements();

    // Draft restore notification
    const [draftRestored, setDraftRestored] = useState(false);
    const [savedSessionData, setSavedSessionData] = useState<any>(null);

    // Load active session from DB on mount
    useEffect(() => {
        const init = async () => {
            const recovery = await sessionPersistenceService.getActiveSession(userId, 'integrated_writing');
            if (recovery.hasSession && recovery.session) {
                setSavedSessionData(recovery.session);
                setPhase('recovery_prompt');
            }
        };
        init();
    }, [userId]);

    // Auto-save essay draft (debounced by 3 seconds)
    useEffect(() => {
        if (phase === 'intro' || phase === 'feedback' || phase === 'recovery_prompt') return;
        if (!essay && !userNotes && phase === 'reading') return; // Don't save empty reading start

        const saveTimer = setTimeout(() => {
            try {
                updatePersistedSession({
                    phase,
                    task,
                    timeRemaining,
                    phaseDurations,
                    userNotes,
                    essay
                }).catch(() => { });
                console.log('[Draft] Auto-saved to DB');
            } catch (e) {
                console.warn('Failed to save draft:', e);
            }
        }, 3000); // Debounce 3 seconds

        return () => clearTimeout(saveTimer);
    }, [essay, userNotes, phase, timeRemaining, task, phaseDurations]);

    const handleResumeSession = () => {
        if (!savedSessionData) return;
        const state = savedSessionData.gameState as any;
        if (state.task) {
            setTask(state.task);
            setPhaseDurations(state.phaseDurations || { reading: 0, listening: 0, writing: 0 });
            setTimeRemaining(state.timeRemaining || 0);
            setUserNotes(state.userNotes || '');
            setEssay(state.essay || '');
            setDraftRestored(true);
            setPhase(state.phase || 'reading');
        } else {
            setPhase('intro');
        }
    };

    const handleStartFresh = async () => {
        await startFresh();
        setPhase('intro');
    };

    // Clear draft after successful submission
    const clearDraft = () => {
        completePersistedSession().catch(() => { });
        console.log('[Draft] Session completed after submission');
    };

    // Timer Effect
    useEffect(() => {
        if (phase === 'intro' || phase === 'feedback' || timeRemaining <= 0) return;

        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Auto-advance when timer ends
                    if (phase === 'reading') {
                        setPhaseDurations(p => ({ ...p, reading: READING_TIME }));
                        setPhase('listening');
                        return LISTENING_TIME;
                    } else if (phase === 'listening') {
                        setPhaseDurations(p => ({ ...p, listening: LISTENING_TIME }));
                        setPhase('writing');
                        return WRITING_TIME;
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [phase, timeRemaining]);

    // Generate Task
    const handleGenerateTask = useCallback(async (category?: string) => {
        setIsGenerating(true);
        try {
            const newTask = await integratedWritingService.generateTask(category as any);
            setTask(newTask);
            setPhase('reading');
            setTimeRemaining(READING_TIME);
        } catch (error) {
            console.error('Failed to generate task:', error);
        } finally {
            setIsGenerating(false);
        }
    }, []);

    // Generate Audio when entering listening phase
    useEffect(() => {
        if (phase === 'listening' && task && !audioId && !isGeneratingAudio && !audioError) {
            generateLectureAudio();
        }
    }, [phase, task]);

    const generateLectureAudio = async () => {
        if (!task) return;
        setIsGeneratingAudio(true);
        setAudioError(false);
        try {
            const id = await integratedWritingService.generateLectureAudio(task.lecture.transcript);
            setAudioId(id);

            // Get audio element and set up event listeners
            const audio = integratedWritingService.getAudio(id);
            if (audio) {
                audioRef.current = audio;
                audio.addEventListener('ended', () => {
                    setIsPlaying(false);
                    setHasPlayedAudio(true);
                    setShowTranscript(true);
                });
            }
        } catch (error: any) {
            console.error('Failed to generate audio:', error);
            // Show transcript fallback on TTS failure
            console.log('[TTS] Audio generation failed - showing transcript fallback');
            setAudioError(true);
            setShowTranscript(true); // Show transcript as fallback
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleReplay = () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        setIsPlaying(true);
    };

    const handleSubmitToPeerReview = async () => {
        if (!task || !essay || essay.split(/\s+/).filter(w => w.length > 0).length < 150) return;

        try {
            const { submitEssay } = await import('../../services/peerReviewService');

            // Format prompt to include lecture summary for peer reviewer context
            const fullPrompt = `${task.category} Task\n\nReading:\n${task.reading_passage.content}\n\nLecture:\n${task.lecture.transcript}`;

            // Type assertion since we know it represents the first task type
            const taskType: "Task 1" | "Task 2" = 'Task 1';

            await submitEssay(userId, essay, fullPrompt, taskType, false);
            alert('Essay submitted to Peer Review! You\'ll receive feedback from the community soon.');
            onNavigate(AppView.PEER_REVIEW);
        } catch (error) {
            console.error('[IntegratedWritingSim] Submit to peer review failed:', error);
            alert('Failed to submit essay. Please try again.');
        }
    };

    // Submit Essay
    const handleSubmit = async () => {
        if (!essay.trim() || !task) return;

        setIsSubmitting(true);
        setPhaseDurations(p => ({ ...p, writing: WRITING_TIME - timeRemaining }));

        try {
            const result = await integratedWritingService.evaluateEssay(
                task.reading_passage.content,
                task.lecture.transcript,
                essay
            );
            setEvaluation(result);

            // Save session
            await integratedWritingService.saveSession({
                user_id: userId,
                task_id: task.id,
                reading_passage: task.reading_passage.content,
                lecture_summary: task.lecture.transcript,
                user_notes: userNotes,
                user_essay: essay,
                word_count: essay.split(/\s+/).filter(w => w.length > 0).length,
                phase_durations: { ...phaseDurations, writing: WRITING_TIME - timeRemaining },
                evaluation: result
            });

            // Check and show achievements
            try {
                const earnedAchievements = await integratedWritingService.checkAchievements(
                    userId,
                    result.overall_score,
                    timeRemaining
                );
                earnedAchievements.forEach(a => showAchievement(a));
            } catch (achievementError) {
                console.warn('Achievement check failed:', achievementError);
            }

            // Clear draft after successful submission
            clearDraft();
            setDraftRestored(false);

            // Trigger Score Oracle recalculation in background
            oracleService.recalculatePrediction(userId).catch(err =>
                console.warn('[OracleTrigger] Background recalc failed:', err)
            );

            setPhase('feedback');
        } catch (e) {
            console.error(e);
            alert('Evaluation failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Retry with new task
    const handleRetry = () => {
        clearDraft();
        setDraftRestored(false);
        setTask(null);
        setEssay('');
        setUserNotes('');
        setEvaluation(null);
        setPhase('intro');
    };

    // Format time display
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Get timer color based on remaining time
    const getTimerColor = () => {
        if (phase === 'reading' && timeRemaining < 30) return 'text-orange-500';
        if (phase === 'listening' && timeRemaining < 20) return 'text-orange-500';
        if (phase === 'writing' && timeRemaining < 120) return 'text-red-500';
        return 'text-indigo-600 dark:text-indigo-400';
    };

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden font-sans">
            {/* Achievement Notification */}
            <AchievementNotification achievement={currentAchievement} onClose={closeAchievement} />
            {/* Header */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 z-20 shadow-sm flex items-center justify-between">
                <Button variant="ghost" onClick={() => onNavigate(AppView.WRITING_GYM_HUB)} className="pl-0 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Go back to Writing Gym Hub">
                    <ArrowLeft className="w-5 h-5 mr-1 text-slate-600 dark:text-slate-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Integrated Writing</span>
                </Button>

                {/* Timer (visible during active phases) */}
                {(phase === 'reading' || phase === 'listening' || phase === 'writing') && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-800 font-mono font-bold ${getTimerColor()}`} role="timer" aria-label={`Time remaining: ${formatTime(timeRemaining)}`}>
                        <Clock className="w-4 h-4" />
                        {formatTime(timeRemaining)}
                    </div>
                )}

                {/* Phase Indicators */}
                {phase !== 'intro' && (
                    <div className="flex gap-1" role="list" aria-label="Task phases">
                        {['reading', 'listening', 'writing'].map((p, idx) => {
                            const isActive = phase === p || (phase === 'feedback' && p === 'writing');
                            const isPast = ['reading', 'listening', 'writing'].indexOf(phase) > idx || phase === 'feedback';
                            return (
                                <div key={p} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md' :
                                    isPast ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                    }`}>
                                    {isPast && !isActive ? <CheckCircle2 className="w-4 h-4" /> : (idx + 1)}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">

                    {/* RECOVERY PROMPT PHASE */}
                    {phase === 'recovery_prompt' && (
                        <motion.div
                            key="recovery"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center"
                        >
                            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mb-6">
                                <RefreshCw className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3">Resume Task?</h2>
                            <p className="text-slate-600 dark:text-slate-400 max-w-sm mb-8">
                                You have an unfinished Integrated Writing task. Would you like to pick up where you left off?
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm font-bold">
                                <Button variant="outline" onClick={handleStartFresh} className="flex-1 py-4 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
                                    Start Fresh
                                </Button>
                                <Button onClick={handleResumeSession} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg rounded-xl border-none">
                                    Resume
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* INTRO PHASE */}
                    {phase === 'intro' && (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full overflow-y-auto p-4 md:p-8"
                        >
                            <div className="max-w-lg mx-auto space-y-6">
                                {/* Hero Card */}
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative z-10">
                                        <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                                            <BookOpen className="w-6 h-6" />
                                        </div>
                                        <h1 className="text-2xl font-bold mb-2">TOEFL Integrated Writing</h1>
                                        <p className="text-indigo-100 text-sm">
                                            Read a passage, listen to a lecture, then summarize how the lecture casts doubt on the reading.
                                        </p>
                                    </div>
                                </div>

                                {/* Task Structure */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Target className="w-5 h-5 text-indigo-500" />
                                        Task Structure
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">Read Passage</p>
                                                <p className="text-xs text-slate-500">3 minutes</p>
                                            </div>
                                            <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">3:00</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                                <Volume2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">Listen to Lecture</p>
                                                <p className="text-xs text-slate-500">~2 minutes</p>
                                            </div>
                                            <span className="text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded">2:00</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                                <PenTool className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-slate-900 dark:text-white text-sm">Write Response</p>
                                                <p className="text-xs text-slate-500">20 minutes, 150-225 words</p>
                                            </div>
                                            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded">20:00</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Start Button */}
                                <Button
                                    onClick={() => handleGenerateTask()}
                                    disabled={isGenerating}
                                    className="w-full py-6 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none font-bold"
                                    aria-label="Start integrated writing practice"
                                >
                                    {isGenerating ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Generating Topic...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Sparkles className="w-5 h-5" />
                                            Start Practice
                                            <ChevronRight className="w-5 h-5" />
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* READING PHASE */}
                    {phase === 'reading' && task && (
                        <motion.div
                            key="reading"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full overflow-y-auto p-4 md:p-8"
                        >
                            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                                <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                                            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{task.reading_passage.title}</h2>
                                            <p className="text-xs text-slate-500">Read carefully. You have 3 minutes.</p>
                                        </div>
                                    </div>
                                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full font-medium">
                                        {task.category}
                                    </span>
                                </div>

                                <div className="prose dark:prose-invert max-w-none text-base leading-relaxed text-slate-700 dark:text-slate-300">
                                    {task.reading_passage.content.split('\n').map((para, i) => (
                                        <p key={i} className="mb-4">{para}</p>
                                    ))}
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <Button
                                        onClick={() => {
                                            setPhaseDurations(p => ({ ...p, reading: READING_TIME - timeRemaining }));
                                            setPhase('listening');
                                            setTimeRemaining(LISTENING_TIME);
                                        }}
                                        size="lg"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                                    >
                                        Continue to Lecture <ChevronRight className="w-5 h-5 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* LISTENING PHASE */}
                    {phase === 'listening' && task && (
                        <motion.div
                            key="listening"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex flex-col p-4 md:p-8 bg-indigo-50/50 dark:bg-indigo-950/10"
                        >
                            <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
                                {/* Loading State */}
                                {isGeneratingAudio && (
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Generating Lecture Audio...</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">Generating audio with Kitten TTS...</p>
                                    </div>
                                )}

                                {/* Error State - Transcript hidden, need to listen again or use notes */}
                                {audioError && !isGeneratingAudio && (
                                    <div className="flex-1 flex flex-col">
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 mb-4">
                                            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-2">Audio Generation Failed</h3>
                                            <p className="text-amber-700 dark:text-amber-300 text-sm mb-2">Unable to generate audio. Please rely on your notes for the writing phase.</p>
                                            <p className="text-amber-600 dark:text-amber-400 text-xs">Tip: You may proceed to writing or try refreshing the page.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Audio Player */}
                                {!isGeneratingAudio && !audioError && audioId && (
                                    <>
                                        {/* Audio Player UI */}
                                        <div className="text-center mb-6">
                                            <div className="relative w-24 h-24 mx-auto mb-4">
                                                {/* Waveform Animation */}
                                                {isPlaying && (
                                                    <div className="absolute inset-0 flex items-center justify-center gap-1">
                                                        {[...Array(5)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="w-1.5 bg-indigo-500 rounded-full animate-pulse"
                                                                style={{
                                                                    height: `${30 + Math.random() * 40}px`,
                                                                    animationDelay: `${i * 0.1}s`,
                                                                    animationDuration: '0.8s'
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Static Icon */}
                                                {!isPlaying && (
                                                    <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/60 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg">
                                                        <Volume2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                                                    </div>
                                                )}
                                            </div>

                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Professor's Lecture</h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                                {isPlaying ? 'Playing...' : hasPlayedAudio ? 'Audio Complete' : 'Click play to start'}
                                            </p>

                                            {/* Audio Controls */}
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    onClick={togglePlay}
                                                    className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg transition-all"
                                                    aria-label={isPlaying ? 'Pause lecture audio' : 'Play lecture audio'}
                                                >
                                                    {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                                                </button>

                                                {hasPlayedAudio && (
                                                    <button
                                                        onClick={handleReplay}
                                                        className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all"
                                                        aria-label="Replay lecture audio"
                                                    >
                                                        <RotateCcw className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Note: Transcript is intentionally hidden during listening phase
                                            to simulate real TOEFL conditions. User can only take notes. */}
                                    </>
                                )}

                                {/* Notes */}
                                {!isGeneratingAudio && (
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 mb-4">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4" />
                                            Your Notes (Optional)
                                        </h4>
                                        <textarea
                                            value={userNotes}
                                            onChange={(e) => setUserNotes(e.target.value)}
                                            placeholder="Jot down key counterpoints..."
                                            aria-label="Your listening notes"
                                            className="w-full h-24 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-sm resize-none border-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}

                                {/* Continue Button */}
                                {!isGeneratingAudio && (
                                    <Button
                                        onClick={() => {
                                            setPhaseDurations(p => ({ ...p, listening: LISTENING_TIME - timeRemaining }));
                                            setPhase('writing');
                                            setTimeRemaining(WRITING_TIME);
                                        }}
                                        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg"
                                    >
                                        Start Writing Response
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* WRITING/FEEDBACK PHASE */}
                    {(phase === 'writing' || phase === 'feedback') && task && (
                        <motion.div
                            key="writing"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex flex-col md:flex-row"
                        >
                            {/* Mobile Tab Selector */}
                            <div className="md:hidden flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                <button
                                    onClick={() => setActiveTab('response')}
                                    className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'response'
                                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <PenTool className="w-4 h-4" /> Your Response
                                </button>
                                <button
                                    onClick={() => setActiveTab('reference')}
                                    className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'reference'
                                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Layout className="w-4 h-4" /> Reference
                                </button>
                            </div>

                            {/* Reference Pane */}
                            <div className={`md:w-5/12 lg:w-1/3 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar ${activeTab === 'reference' ? 'block' : 'hidden md:block'
                                }`}>
                                <div className="p-6 space-y-6">
                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide mb-3">
                                            <BookOpen className="w-4 h-4 text-blue-500" /> Reading Passage
                                        </h4>
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl text-slate-700 dark:text-slate-300 text-sm leading-relaxed border border-slate-200 dark:border-slate-800">
                                            {task.reading_passage.content.substring(0, 500)}...
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide mb-3">
                                            <Volume2 className="w-4 h-4 text-purple-500" /> Lecture Points
                                        </h4>
                                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl text-slate-700 dark:text-slate-300 text-sm leading-relaxed border border-slate-200 dark:border-slate-800">
                                            {task.lecture.transcript.substring(0, 400)}...
                                        </div>
                                    </div>

                                    {userNotes && (
                                        <div>
                                            <h4 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide mb-3">
                                                <Lightbulb className="w-4 h-4 text-amber-500" /> Your Notes
                                            </h4>
                                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-amber-900 dark:text-amber-200 text-sm border border-amber-100 dark:border-amber-800">
                                                {userNotes}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide mb-3">
                                            <FileText className="w-4 h-4 text-indigo-500" /> Task
                                        </h4>
                                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-indigo-900 dark:text-indigo-200 text-sm border border-indigo-100 dark:border-indigo-800">
                                            Summarize the points made in the lecture, being sure to explain how they cast doubt on specific points made in the reading passage.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Writing/Feedback Pane */}
                            <div className={`flex-1 bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden ${activeTab === 'response' ? 'block' : 'hidden md:flex'
                                }`}>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
                                    <div className="max-w-3xl mx-auto h-full flex flex-col">
                                        {phase === 'writing' ? (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-xl text-slate-900 dark:text-white">Your Essay</h3>
                                                        {draftRestored && (
                                                            <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full animate-pulse">
                                                                ✓ Draft restored
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold ${essay.split(/\s+/).filter(w => w.length > 0).length < 150
                                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        }`}>
                                                        {essay.split(/\s+/).filter(w => w.length > 0).length} / 225 words
                                                    </span>
                                                </div>

                                                <textarea
                                                    value={essay}
                                                    onChange={(e) => setEssay(e.target.value)}
                                                    placeholder="The lecture casts doubt on the reading passage by presenting three counterarguments..."
                                                    aria-label="Write your integrated writing essay"
                                                    className="flex-1 w-full p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-[#FBFBFD] dark:bg-black focus:outline-none focus:border-indigo-500 resize-none text-base leading-loose text-slate-800 dark:text-slate-200 placeholder:text-slate-300 mb-4"
                                                />

                                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                                    <div className="text-xs text-slate-500 flex gap-2">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Tip:</span>
                                                        Use "In contrast", "However", "The professor argues" to show opposition.
                                                    </div>
                                                    <Button
                                                        onClick={handleSubmit}
                                                        disabled={isSubmitting || essay.split(/\s+/).filter(w => w.length > 0).length < 50}
                                                        className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold shadow-lg transition-all ${isSubmitting
                                                            ? 'bg-slate-200 text-slate-400 dark:bg-slate-800'
                                                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white'
                                                            }`}
                                                    >
                                                        {isSubmitting ? (
                                                            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</span>
                                                        ) : (
                                                            <span className="flex items-center gap-2">Submit Essay <Send className="w-4 h-4" /></span>
                                                        )}
                                                    </Button>
                                                </div>
                                            </>
                                        ) : evaluation && (
                                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
                                                {/* Success Header */}
                                                <div className="text-center py-4">
                                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                                                        <CheckCircle2 className="w-8 h-8" />
                                                    </div>
                                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Essay Submitted!</h2>
                                                    <p className="text-slate-500">Here is your TOEFL-style evaluation.</p>
                                                </div>

                                                {/* Overall Score */}
                                                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center">
                                                    <Award className="w-10 h-10 mx-auto mb-2 opacity-80" />
                                                    <div className="text-5xl font-bold mb-1">{evaluation.overall_score}</div>
                                                    <div className="text-indigo-200 text-sm">out of 5</div>
                                                </div>

                                                {/* Score Breakdown */}
                                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">Score Breakdown</h4>
                                                    {[
                                                        { label: 'Task Development', value: evaluation.task_development, color: 'bg-blue-500' },
                                                        { label: 'Organization', value: evaluation.organization, color: 'bg-purple-500' },
                                                        { label: 'Language Use', value: evaluation.language_use, color: 'bg-emerald-500' }
                                                    ].map(item => (
                                                        <div key={item.label}>
                                                            <div className="flex justify-between text-sm mb-1">
                                                                <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                                                                <span className="font-bold text-slate-900 dark:text-white">{item.value}/5</span>
                                                            </div>
                                                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${(item.value / 5) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Strengths */}
                                                {evaluation.strengths.length > 0 && (
                                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 border border-green-100 dark:border-green-800">
                                                        <h4 className="font-bold text-green-800 dark:text-green-300 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                                                            <TrendingUp className="w-4 h-4" /> Strengths
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {evaluation.strengths.map((s, i) => (
                                                                <li key={i} className="text-green-700 dark:text-green-400 text-sm flex items-start gap-2">
                                                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                    {s}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Improvements */}
                                                {evaluation.improvements.length > 0 && (
                                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-100 dark:border-amber-800">
                                                        <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                                                            <Lightbulb className="w-4 h-4" /> Suggested Improvements
                                                        </h4>
                                                        <div className="space-y-4">
                                                            {evaluation.improvements.slice(0, 3).map((imp, i) => (
                                                                <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
                                                                    <div className="text-sm">
                                                                        <span className="text-red-500 line-through">{imp.original}</span>
                                                                        <span className="mx-2 text-slate-400">→</span>
                                                                        <span className="text-green-600 font-medium">{imp.improved}</span>
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 mt-2">{imp.explanation}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Sample Response */}
                                                {task.sample_response && (
                                                    <details className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                                                        <summary className="p-4 cursor-pointer font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
                                                            <span className="flex items-center gap-2">
                                                                <FileText className="w-4 h-4 text-indigo-500" />
                                                                View Model Response
                                                            </span>
                                                        </summary>
                                                        <div className="px-4 pb-4">
                                                            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                                {task.sample_response}
                                                            </div>
                                                        </div>
                                                    </details>
                                                )}

                                                {/* Actions */}
                                                <div className="flex flex-col sm:flex-row gap-3">
                                                    <Button
                                                        onClick={handleSubmitToPeerReview}
                                                        disabled={essay.split(/\s+/).filter(w => w.length > 0).length < 150}
                                                        className="flex-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:hover:bg-amber-900/40"
                                                    >
                                                        <Users className="w-4 h-4 mr-2" />
                                                        Get Peer Feedback
                                                    </Button>
                                                    <Button
                                                        onClick={handleRetry}
                                                        variant="outline"
                                                        className="flex-1 border-slate-300 dark:border-slate-700"
                                                    >
                                                        <RefreshCcw className="w-4 h-4 mr-2" />
                                                        New Topic
                                                    </Button>
                                                    <Button
                                                        onClick={() => onNavigate(AppView.WRITING_GYM_HUB)}
                                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                                    >
                                                        Back to Writing Gym
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

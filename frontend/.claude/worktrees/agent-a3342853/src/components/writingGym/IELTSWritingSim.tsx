import DOMPurify from 'dompurify';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Monitor, Maximize2, Minimize2, AlertTriangle,
    FileText, PenTool, LayoutTemplate, Send, Award, Zap, Clock,
    BarChart3, Thermometer, GitCommit, Globe, CheckCircle, MessageSquare, Edit3, Bot, Users, X,
    Undo2, Redo2, Copy, ChevronDown, ChevronUp, AlignLeft
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { essayMetricsService } from '../../services/essayMetricsService';
import { writingGymService } from '../../services/writingGymService';
import { AppView, IELTSWritingTask, IELTSAssessment, ChatMessage } from '../../types';
import { getUserId } from '../../utils/guestId';
import { useOfflineDetection } from '../../hooks/useOfflineDetection';
import { Button } from '../Button';
import { useToast, ToastContainer } from '../ui/Toast';
import { OfflineBanner } from '../ui/OfflineBanner';
import { RecoveryModal } from './ieltsWritingSim/RecoveryModal';
import { SimLanding } from './ieltsWritingSim/SimLanding';
import { SimExamView } from './ieltsWritingSim/SimExamView';
import { SimFeedbackView } from './ieltsWritingSim/SimFeedbackView';
import { TaskType, SimActiveTab, FeedbackTabType, TimerState } from './ieltsWritingSim/types';

// --- Timer State Persistence ---
const TIMER_STATE_KEY = 'ielts_sim_timer_state';

const saveTimerState = (state: TimerState) => {
    try {
        localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('[TimerState] Failed to save:', e);
    }
};

const loadTimerState = (): TimerState | null => {
    try {
        const raw = localStorage.getItem(TIMER_STATE_KEY);
        if (!raw) return null;

        const state = JSON.parse(raw) as TimerState;

        // Calculate elapsed time since last save
        const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        const remaining = state.timeLeft - elapsed;

        // Check if timer has expired
        if (remaining <= 0) {
            localStorage.removeItem(TIMER_STATE_KEY);
            return null;
        }

        return { ...state, timeLeft: remaining };
    } catch (e) {
        console.error('[TimerState] Failed to load:', e);
        return null;
    }
};

const clearTimerState = () => {
    try {
        localStorage.removeItem(TIMER_STATE_KEY);
    } catch (e) {
        console.error('[TimerState] Failed to clear:', e);
    }
};

export const IELTSWritingSim: React.FC<{ onNavigate: (view: AppView) => void; onBack: () => void; }> = ({ onNavigate, onBack }) => {
    const toast = useToast();
    // Phase 4: Real connectivity detection
    const { isOffline, justReconnected } = useOfflineDetection();
    const [task, setTask] = useState<IELTSWritingTask | null>(null);
    const [editorContent, setEditorContent] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [assessment, setAssessment] = useState<IELTSAssessment | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [infractions, setInfractions] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [taskType, setTaskType] = useState<TaskType>('Task 2');
    const [activeTab, setActiveTab] = useState<SimActiveTab>('question');
    const [feedbackTab, setFeedbackTab] = useState<FeedbackTabType>('score');
    const [showTimerWarning, setShowTimerWarning] = useState(false);
    const [expandedStructure, setExpandedStructure] = useState<number | null>(0);

    // Phase 2B: Recovery modal state (replaces window.confirm)
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [recoveryData, setRecoveryData] = useState<{ minutesLeft: number; wordCount: number } | null>(null);
    const pendingRecoveryRef = useRef<{ draft: string; timer: ReturnType<typeof loadTimerState> } | null>(null);

    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Timer Ref
    const timerRef = useRef<any>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Track timer start time for persistence
    const timerStartTimeRef = useRef<number>(0);
    const totalTimeRef = useRef<number>(0);

    // Phase 2C: Debounce ref for auto-save
    const autoSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Lockdown Mechanics ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && task && !assessment) {
                setInfractions(prev => prev + 1);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [task, assessment]);

    // Timer with persistence
    useEffect(() => {
        if (task && timeLeft > 0 && !assessment) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    const newTime = Math.max(0, prev - 1);
                    if (newTime === 300) { // 5 minutes exactly
                        setShowTimerWarning(true);
                        setTimeout(() => setShowTimerWarning(false), 5000);
                    }

                    // Persist timer state every 10 seconds
                    if (newTime % 10 === 0 && timerStartTimeRef.current > 0) {
                        saveTimerState({
                            taskType,
                            timeLeft: newTime,
                            totalTime: totalTimeRef.current,
                            startedAt: timerStartTimeRef.current,
                            infractions,
                            prompt: task?.prompt
                        });
                    }

                    return newTime;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [task, timeLeft, assessment, taskType, infractions]);

    // Scroll chat to bottom
    useEffect(() => {
        if (feedbackTab === 'tutor') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, feedbackTab]);

    // --- Auto-Save Mechanics ---
    const AUTO_SAVE_KEY = 'ielts_sim_draft';

    // Helpers to resume or discard from the recovery modal
    const handleRecoveryResume = useCallback(() => {
        const pending = pendingRecoveryRef.current;
        if (!pending || !pending.timer) return;
        const { draft, timer } = pending;

        const cleanDraft = DOMPurify.sanitize(draft);
        setEditorContent(cleanDraft);
        if (editorRef.current) editorRef.current.innerHTML = cleanDraft;
        const words = cleanDraft.trim().split(/\s+/).filter(Boolean).length;
        setWordCount(words);

        setTaskType(timer.taskType);
        setTimeLeft(timer.timeLeft);
        setInfractions(timer.infractions);
        totalTimeRef.current = timer.totalTime;
        timerStartTimeRef.current = timer.startedAt;

        if (timer.prompt) {
            setTask({
                type: timer.taskType,
                prompt: timer.prompt,
                time_limit: timer.totalTime
            });
            setActiveTab('question');
            setAssessment(null);
            setChatHistory([]);
            setIsLoading(false);
        } else {
            loadTask(timer.taskType, true);
        }
        setShowRecoveryModal(false);
        pendingRecoveryRef.current = null;
    }, []);

    const handleRecoveryDiscard = useCallback(() => {
        localStorage.removeItem(AUTO_SAVE_KEY);
        clearTimerState();
        setShowRecoveryModal(false);
        pendingRecoveryRef.current = null;
    }, []);

    // Load draft and show recovery modal on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(AUTO_SAVE_KEY);
        const savedTimer = loadTimerState();

        // Recovery scenario: both draft and timer exist → show modal
        if (savedDraft && savedTimer) {
            const minutesLeft = Math.floor(savedTimer.timeLeft / 60);
            const words = savedDraft.trim().split(/\s+/).filter(Boolean).length;
            pendingRecoveryRef.current = { draft: savedDraft, timer: savedTimer };
            setRecoveryData({ minutesLeft, wordCount: words });
            setShowRecoveryModal(true);
        } else if (savedDraft) {
            // Only draft, no timer — silently restore
            const cleanDraft = DOMPurify.sanitize(savedDraft);
            setEditorContent(cleanDraft);
            if (editorRef.current) editorRef.current.innerHTML = cleanDraft;
            const words = cleanDraft.trim().split(/\s+/).filter(Boolean).length;
            setWordCount(words);
        }
    }, []);

    // Save draft on change with 500ms debounce (Phase 2C)
    useEffect(() => {
        if (!editorContent) return;
        if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
        autoSaveDebounceRef.current = setTimeout(() => {
            localStorage.setItem(AUTO_SAVE_KEY, editorContent);
        }, 500);
        return () => {
            if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
        };
    }, [editorContent]);

    const loadTask = async (type: 'Task 1' | 'Task 2', isRecovery = false) => {
        setIsLoading(true);

        if (!isRecovery) {
            setEditorContent('');
            setWordCount(0);
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
            }
            localStorage.removeItem(AUTO_SAVE_KEY);
        }

        setTask(null);
        setAssessment(null);
        setInfractions(0);
        setChatHistory([]);
        setTaskType(type);
        setActiveTab('question');

        try {
            const data = await writingGymService.generateWritingTask(type);
            setTask(data);

            // Check for existing timer state
            const savedTimer = loadTimerState();
            if (savedTimer && savedTimer.taskType === type) {
                // Resume timer from saved state
                setTimeLeft(savedTimer.timeLeft);
                setInfractions(savedTimer.infractions);
                totalTimeRef.current = savedTimer.totalTime;
                timerStartTimeRef.current = savedTimer.startedAt;
                console.log(`[TimerState] Resumed timer with ${Math.floor(savedTimer.timeLeft / 60)} minutes remaining`);
            } else {
                // Start fresh timer
                const totalTime = data.time_limit || (type === 'Task 1' ? 1200 : 2400);
                setTimeLeft(totalTime);
                totalTimeRef.current = totalTime;
                timerStartTimeRef.current = Date.now();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!task || !editorContent.trim()) return;
        const minWords = taskType === 'Task 1' ? 150 : 250;
        if (wordCount < minWords) {
            toast.warning(`Your essay is ${wordCount} words (minimum: ${minWords}). Score will be penalized.`);
        }
        setIsSubmitting(true);
        try {
            // Phase 2A: Sanitize before sending to AI
            const rawText = editorRef.current?.innerText || editorContent.replace(/<[^>]+>/g, ' ');
            const plainText = DOMPurify.sanitize(rawText, { ALLOWED_TAGS: [] }); // Strip all HTML
            const result = await writingGymService.evaluateEssay(task.prompt, plainText, taskType);
            setAssessment(result);
            localStorage.removeItem(AUTO_SAVE_KEY);
            clearTimerState();
            setFeedbackTab('score');

            // Record metrics for analytics
            const timeSpent = totalTimeRef.current - timeLeft;
            try {
                const userId = getUserId();
                await essayMetricsService.recordMetric({
                    user_id: userId,
                    task_type: taskType,
                    word_count: wordCount,
                    band_score: result.band_score,
                    breakdown: result.breakdown,
                    time_spent_seconds: timeSpent,
                    infractions,
                });
            } catch (metricError) {
                console.warn('[IELTSWritingSim] Failed to record metrics:', metricError);
            }

            // Initial Tutor Message
            setChatHistory([{
                id: 'init',
                role: 'model',
                text: `I've analyzed your essay! You scored a Band ${result.band_score}. Feel free to ask me questions about your mistakes or how to improve specific sentences.`,
                timestamp: Date.now()
            }]);

            if (document.fullscreenElement) document.exitFullscreen();
        } catch (e) {
            console.error(e);
            // Phase 2B: Replace alert() with toast
            toast.error('Failed to evaluate your essay. Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevise = () => {
        // Fire-and-forget analytics — revise flow started
        writingGymService.logAnalyticsEvent(getUserId(), 'revise_flow_started', {
            task_type: taskType,
            original_band_score: assessment?.band_score,
        });
        setAssessment(null); // Clear assessment to go back to editor
        setActiveTab('answer'); // Switch to editor tab
        setFeedbackTab('score');
        setChatHistory([]);
        // Note: editorContent and task are preserved in state
    };

    const handleSubmitToPeerReview = async () => {
        if (!task || !editorContent || wordCount < 150) return;

        try {
            const { submitEssay } = await import('../../services/peerReviewService');
            const { getUserId } = await import('../../utils/guestId');
            const userId = getUserId(); // Always returns a userId (auth or guest)

            const plainText = editorRef.current?.innerText || editorContent.replace(/<[^>]+>/g, ' ');
            await submitEssay(userId, plainText, task.prompt, taskType, false);
            toast.success('Essay submitted to Peer Review! You\'ll receive feedback from the community soon.');
            localStorage.setItem('peerReviewInitialTab', 'my-submissions');
            onNavigate(AppView.PEER_REVIEW);
        } catch (error) {
            console.error('[IELTSWritingSim] Submit to peer review failed:', error);
            toast.error('Failed to submit essay. Please try again.');
        }
    };

    const handleChatSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim() || !task || !assessment) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: chatInput,
            timestamp: Date.now()
        };

        setChatHistory(prev => [...prev, userMsg]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            const responseText = await writingGymService.chatWithExaminer(
                chatHistory,
                { prompt: task.prompt, essay: editorContent, feedback: assessment.feedback },
                userMsg.text
            );

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText,
                timestamp: Date.now()
            };
            setChatHistory(prev => [...prev, botMsg]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setEditorContent(text);
        // Simple word count regex
        const count = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        setWordCount(count);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    const insertTemplate = (text: string) => {
        setEditorContent(prev => prev + (prev ? "\n\n" : "") + text);
        setShowTemplateMenu(false);
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCEFRColor = (level: string | undefined) => {
        if (!level) return 'text-slate-800 dark:text-slate-200';
        switch (level) {
            case 'C2': return 'text-amber-600 bg-amber-50 font-bold';
            case 'C1': return 'text-purple-600 bg-purple-50 font-bold';
            case 'B2': return 'text-blue-600 bg-blue-50';
            default: return 'text-slate-700 dark:text-slate-300';
        }
    };

    const handleBackToMenu = () => {
        setAssessment(null);
        setTask(null);
        setEditorContent('');
        setWordCount(0);
        if (editorRef.current) {
            editorRef.current.innerHTML = '';
        }
        localStorage.removeItem(AUTO_SAVE_KEY);
        clearTimerState();
    };

    // Feedback View Component
    if (assessment) {
        return (
            <SimFeedbackView
                assessment={assessment}
                task={task}
                taskType={taskType}
                feedbackTab={feedbackTab}
                chatHistory={chatHistory}
                chatInput={chatInput}
                isChatLoading={isChatLoading}
                chatEndRef={chatEndRef}
                wordCount={wordCount}
                setFeedbackTab={setFeedbackTab}
                setChatInput={setChatInput}
                handleChatSubmit={handleChatSubmit}
                onBackToMenu={handleBackToMenu}
                onStartNew={handleBackToMenu}
                onRevise={handleRevise}
                onSubmitToPeerReview={handleSubmitToPeerReview}
            />
        );
    }

    return (
        <div className={`h-[100dvh] flex flex-col bg-[#EEF2FC] dark:bg-slate-950 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>

            {/* Alerts */}
            <AnimatePresence>
                {/* Infraction Alert */}
                {infractions > 0 && (
                    <motion.div
                        role="alert"
                        aria-live="assertive"
                        initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
                        className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-100 border border-red-300 text-red-800 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 z-50 pointer-events-none w-max max-w-[90%]"
                    >
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <span className="font-bold text-sm">Focus Alert:</span> <span className="text-sm">Tab switching detected ({infractions})</span>
                    </motion.div>
                )}
                {/* 5 Minute Warning */}
                {showTimerWarning && (
                    <motion.div
                        role="alert"
                        aria-live="assertive"
                        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-2 z-50 pointer-events-none"
                    >
                        <Clock className="w-12 h-12 animate-bounce" />
                        <span className="font-black text-2xl">5 MINUTES LEFT</span>
                        <span className="text-red-100">Wrap up your conclusion!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {!task && (
                <SimLanding
                    taskType={taskType}
                    setTaskType={setTaskType}
                    isLoading={isLoading}
                    onStart={(t) => loadTask(t, false)}
                    onBack={onBack}
                />
            )}

            {task && (
                <SimExamView
                    task={task}
                    taskType={taskType}
                    timeLeft={timeLeft}
                    wordCount={wordCount}
                    isSubmitting={isSubmitting}
                    activeTab={activeTab}
                    expandedStructure={expandedStructure}
                    editorContent={editorContent}
                    editorRef={editorRef}
                    isLoading={isLoading}
                    setActiveTab={setActiveTab}
                    setExpandedStructure={setExpandedStructure}
                    setEditorContent={setEditorContent}
                    setWordCount={setWordCount}
                    onSubmit={handleSubmit}
                />
            )}

            {/* Phase 4: Offline Banner */}
            <OfflineBanner
                isOffline={isOffline}
                justReconnected={justReconnected}
                offlineMessage="You're offline. Essay auto-saves locally."
            />

            {/* Recovery Modal (replaces window.confirm) */}
            {recoveryData && (
                <RecoveryModal
                    isOpen={showRecoveryModal}
                    taskType={pendingRecoveryRef.current?.timer?.taskType ?? 'Task 2'}
                    minutesLeft={recoveryData.minutesLeft}
                    wordCount={recoveryData.wordCount}
                    onResume={handleRecoveryResume}
                    onDiscard={handleRecoveryDiscard}
                />
            )}

            {/* Toast Notifications */}
            <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
        </div>
    );
};

import { WifiOff } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { AppRouter } from './components/AppRouter';
import { MobileTabBar } from './components/MobileTabBar';
import { ToastContainer, useToast } from './components/ui/Toast';
import { useAuth } from './hooks/useAuth';
import { useNetworkState } from './hooks/useNetworkState';
import { useTheme } from './hooks/useTheme';
import { useNotifications } from './hooks/useNotifications';
import { generateQuizUnified } from './services/aiProvider';
import { TokenLimitError } from './services/errors';
import { saveQuizResult, calculateUserProgress } from './services/historyService';
import { pushNotificationService } from './services/pushNotificationService';
import { saveQuizReport } from './services/reportService';
import { markQuestionsAsAnswered } from './services/userQuestionHistoryService';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from './stores/useAuthStore';
import { trackGuestLogin, trackOAuthLoginSuccess } from './utils/authAnalytics';
import { useNavigationStore } from './stores/useNavigationStore';
import { useQuizStore } from './stores/useQuizStore';
import { AppView, SectionType } from './types';

const OfflineIndicator = () => {
    const { isOnline } = useNetworkState();

    if (isOnline) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-[10px] md:text-sm font-semibold flex items-center justify-center gap-2 py-1.5 md:py-2 z-[9999] shadow-md animate-slide-down">
            <WifiOff className="w-3 h-3 md:w-4 md:h-4" />
            <span>You are offline. Progress will be saved locally and synced later.</span>
        </div>
    );
};

const App: React.FC = () => {
    // TEMPORARY TOKEN INJECT FOR QA
    const tempToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI4ODI5NzczOC1iY2UzLTRkYjctYWVjMC1iYTdlZDQxNTUyYmYiLCJyb2xlIjoidXNlciIsInRva2VuX3R5cGUiOiJhY2Nlc3MiLCJleHAiOjE3NzYwNTA2MTIsImlhdCI6MTc3NjA0OTcxMn0.aCoZ7reVZUXMInNSBnx2uuYWvIvZZ1Y3rbC17myRvBo';
    if (localStorage.getItem('access_token') !== tempToken) {
        localStorage.setItem('access_token', tempToken);
        window.location.reload();
    }

    useTheme();
    const { user, isAuthenticated, loading, login, register, logout, updateProfile } = useAuth();
    const { unreadCount } = useNotifications(user?.id);
    const [isAppInitialLoading, setIsAppInitialLoading] = useState(true);

    const { currentView, setCurrentView, gymBackTarget } = useNavigationStore();
    const { setAuthState } = useAuthStore();
    const quiz = useQuizStore();

    useEffect(() => {
        setAuthState({ user, isAuthenticated, unreadCount });
        
        if (!user && !isAuthenticated) {
            trackGuestLogin();
        }
    }, [user, isAuthenticated, unreadCount]);

    useEffect(() => {
        setTimeout(() => setIsAppInitialLoading(false), 800);

        let backListener: any = null;
        if (Capacitor.isNativePlatform()) {
            backListener = CapacitorApp.addListener('backButton', () => {
                const { currentView: prevView, gymBackTarget, setCurrentView } = useNavigationStore.getState();
                const rootViews = [
                    AppView.DASHBOARD,
                    AppView.PRACTICE_HUB,
                    AppView.SOCIAL_HUB,
                    AppView.MORE_HUB,
                    AppView.BLOG
                ];

                if (rootViews.includes(prevView)) {
                    CapacitorApp.exitApp();
                } else if (prevView === AppView.QUIZ || prevView === AppView.REPORT || prevView === AppView.SIMULATION) {
                    setCurrentView(AppView.DASHBOARD);
                } else if (prevView === AppView.ANALYTICS || prevView === AppView.ERROR_JAIL || prevView === AppView.LEADERBOARD) {
                    setCurrentView(AppView.MORE_HUB);
                } else if (prevView === AppView.BLOG_POST) {
                    setCurrentView(AppView.BLOG);
                } else if (prevView === AppView.WRITING_GYM) {
                    setCurrentView(gymBackTarget);
                } else if (prevView === AppView.WRITING || prevView === AppView.WRITING_GYM_TASK_1 || prevView === AppView.WRITING_GYM_TASK_2) {
                    setCurrentView(AppView.PRACTICE_HUB);
                } else if (prevView === AppView.CEFR_SIMULATION) {
                    setCurrentView(AppView.PRACTICE_HUB);
                } else if (prevView === AppView.WRITING_GYM_LEVEL_1) {
                    setCurrentView(AppView.DASHBOARD);
                } else if (prevView === AppView.SKILL_MODULE_READER) {
                    setCurrentView(AppView.DASHBOARD);
                } else {
                    setCurrentView(AppView.DASHBOARD);
                }
            });
        }

        return () => {
            CapacitorApp.removeAllListeners();
            if (backListener) backListener.remove();
        };
    }, []);

    const [currentSkillId, setCurrentSkillId] = useState<number>(0);
    const [currentSection, setCurrentSection] = useState<SectionType>('STRUCTURE');
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        const path = window.location.pathname;
        if (path.startsWith('/share/')) {
            const id = path.split('/share/')[1];
            if (id) {
                useNavigationStore.getState().setSharedReportId(id);
                setCurrentView(AppView.REPORT);
            }
            window.history.replaceState({}, document.title, "/");
        }

        if (path.startsWith('/auth/callback')) {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            if (code && state) {
                const handleOAuthCallback = async () => {
                    try {
                        const result = await import('./services/auth').then(m => 
                            m.default.handleOAuthCallback(code, state)
                        );
                        if (result.ok) {
                            const profile = await import('./services/auth').then(m => m.default.getProfile());
                            setAuthState({ user: profile, isAuthenticated: true });
                        }
                    } catch (err) {
                        console.error('[App] OAuth callback error:', err);
                    }
                    window.history.replaceState({}, document.title, "/");
                };
                handleOAuthCallback();
            }
        }
    }, []);

    const logsEndRef = useRef<HTMLDivElement>(null!);
    const { toasts, removeToast, error: showError, success: showSuccess } = useToast();

    useEffect(() => {
        const loadProgress = async () => {
            if (!user || !isAuthenticated) return;
            try {
                const stats = await calculateUserProgress();
                if (stats) {
                    setAuthState({ progress: stats });
                }
            } catch (err) {
                console.warn('[App] Failed to load progress:', err);
            }
        };
        loadProgress();
    }, [user, isAuthenticated]);

    useEffect(() => {
        if (user && isAuthenticated) {
            pushNotificationService.initialize();
        }
    }, [user, isAuthenticated]);

    const handleStartSkill = async (skillIdOrTopic: string | number, sectionVal?: SectionType) => {
        console.log(`[App] start skill: ${skillIdOrTopic} section: ${sectionVal}`);
        const quizStore = useQuizStore.getState();
        quizStore.setStatus('generating');

        try {
            const topicToUse = typeof skillIdOrTopic === 'string' ? skillIdOrTopic : `Skill ${skillIdOrTopic}`;
            const sect = sectionVal || 'STRUCTURE';

            let numericSkillId: number | undefined = undefined;
            if (typeof skillIdOrTopic === 'number') {
                numericSkillId = skillIdOrTopic;
            } else if (typeof skillIdOrTopic === 'string') {
                const match = skillIdOrTopic.match(/(?:Skill\s*)?(\d+)|S(\d+)/i);
                if (match) numericSkillId = parseInt(match[1] || match[2], 10);
            }

            if (numericSkillId) setCurrentSkillId(numericSkillId);
            setCurrentSection(sect);

            quizStore.setTopic(topicToUse);
            setCurrentView(AppView.QUIZ);

            const questions = await generateQuizUnified(topicToUse, sect, 5, numericSkillId);

            if (questions.length === 0) {
                quizStore.setStatus('idle');
                setCurrentView(AppView.DASHBOARD);
                showError('Failed to generate questions. Please try again.');
                return;
            }

            quizStore.startQuiz(questions);

        } catch (error) {
            console.error('[App] Failed to start skill:', error);
            useQuizStore.getState().setStatus('idle');
            setCurrentView(AppView.DASHBOARD);
            if (error instanceof TokenLimitError) {
                showError(`Token limit reached. Please upgrade your plan or wait for token reset.`);
            } else {
                showError(error instanceof Error ? error.message : 'Error starting quiz. Please try again.');
            }
        }
    };

    useEffect(() => {
        const saveResultOnFinish = async () => {
            const { status, queue, answers, score, topic } = useQuizStore.getState();
            if (status === 'finished' && queue.length > 0) {
                const correctCount = queue.reduce((acc, q, idx) => {
                    const choiceIdx = answers[idx];
                    return choiceIdx !== undefined && q.correct_response.includes(q.choices[choiceIdx]) ? acc + 1 : acc;
                }, 0);

                const sectionFromQuestion = queue[0]?.section || currentSection.toLowerCase();

                await saveQuizResult({
                    id: crypto.randomUUID(),
                    userName: user?.full_name || 'Guest',
                    date: new Date().toISOString(),
                    topic,
                    skillId: queue[0]?.skill_id || currentSkillId,
                    section: sectionFromQuestion,
                    score,
                    correctCount,
                    totalQuestions: queue.length,
                    xpEarned: correctCount * 5
                }, user?.id);

                if (user?.id) {
                    const entries = queue
                        .map((q, idx) => {
                            const choiceIdx = answers[idx];
                            if (choiceIdx === undefined) return null;
                            const questionId = q.id || crypto.randomUUID();
                            const isCorrect = q.correct_response.includes(q.choices[choiceIdx]);
                            return {
                                questionId,
                                section: (q.section || sectionFromQuestion).toLowerCase(),
                                isCorrect,
                                questionSnapshot: { ...q }
                            };
                        })
                        .filter((e): e is NonNullable<typeof e> => e !== null);

                    if (entries.length > 0) {
                        try {
                            await markQuestionsAsAnswered(user.id, entries);
                        } catch (err) {
                            console.warn('[App] Failed to save question history:', err);
                        }
                    }
                }

                const newStats = await calculateUserProgress();
                if (newStats) setAuthState({ progress: newStats });
            }
        };

        saveResultOnFinish();
    }, [quiz.status]);

    const handleShareResult = async () => {
        setIsSharing(true);
        try {
            const { queue, answers, score, topic } = useQuizStore.getState();
            const correctCount = queue.reduce((acc, q, idx) => {
                const choiceIdx = answers[idx];
                return choiceIdx !== undefined && q.correct_response.includes(q.choices[choiceIdx]) ? acc + 1 : acc;
            }, 0);

            const answersArray = Object.entries(answers).map(([idxStr, choiceIdx]) => {
                const idx = parseInt(idxStr);
                const q = queue[idx];
                return {
                    questionIndex: idx,
                    selectedChoiceIndex: choiceIdx,
                    isCorrect: q ? q.correct_response.includes(q.choices[choiceIdx]) : false
                };
            });

            const reportId = await saveQuizReport({
                topic,
                score,
                total: queue.length,
                correct: correctCount,
                answers: answersArray,
                studentName: user?.full_name || 'Guest User',
                userId: user?.id
            });

            if (!reportId) throw new Error("Failed to save report");

            const shareUrl = `${window.location.origin}/share/${reportId}`;
            await navigator.clipboard.writeText(shareUrl);
            showSuccess('Result link copied to clipboard!');

        } catch (error) {
            console.error("Share failed:", error);
            showError('Failed to share results');
        } finally {
            setIsSharing(false);
        }
    };

    if (!window.location.search.includes('benchmark=true') && (loading || isAppInitialLoading)) {
        return (
            <div className="h-screen w-full bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-white font-bold opacity-70 animate-pulse">Initializing Protocol...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] bg-[#F5F5FA] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans w-full relative flex flex-col overflow-hidden">
            <button id="debug-tts-benchmark" style={{ display: 'none' }} onClick={() => setCurrentView(AppView.TTS_BENCHMARK)}>
                Benchmark
            </button>

            <OfflineIndicator />

            <div className={`flex-1 relative overflow-hidden transition-all duration-300 ${isSharing ? 'blur-md pointer-events-none' : ''}`}>
                <AppRouter
                    handleStartSkill={handleStartSkill}
                    handleShareResult={handleShareResult}
                    isSharing={isSharing}
                    logsEndRef={logsEndRef}
                />
            </div>

            {[
                AppView.DASHBOARD,
                AppView.PRACTICE_HUB,
                AppView.SOCIAL_HUB,
                AppView.MORE_HUB,
                AppView.BLOG,
                AppView.TTS_BENCHMARK,
            ].includes(currentView) && (
                    <MobileTabBar
                        currentView={currentView}
                        onNavigate={setCurrentView}
                        unreadNotifications={unreadCount}
                    />
                )}

            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    );
};

export default App;

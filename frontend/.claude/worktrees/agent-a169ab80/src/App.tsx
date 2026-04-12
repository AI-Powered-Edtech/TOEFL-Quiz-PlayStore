import React, { useState, useEffect, useRef } from 'react';
import { AppView, UserProgress, SectionType, QuizResult } from './types';
import { generateQuizUnified } from './services/aiProvider';
import { TokenLimitError } from './services/errors';
import { saveQuizResult, calculateUserProgress } from './services/historyService';
import { saveQuizReport } from './services/reportService';
import { markQuestionsAsAnswered } from './services/userQuestionHistoryService';
import { AppRouter } from './components/AppRouter';
import { usePhase0Quiz } from './hooks/usePhase0Quiz';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { ToastContainer, useToast } from './components/ui/Toast';
import { MobileTabBar } from './components/MobileTabBar';
import { useNetworkState } from './hooks/useNetworkState';
import { Loader2, Sparkles, WifiOff } from 'lucide-react';
import { pushNotificationService } from './services/pushNotificationService';
// Offline Indicator Component
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
    // Auth & User
    const { user, isAuthenticated, loading, signInWithGoogle, signOut, updateProfile } = useAuth();
    const { unreadCount } = useNotifications(user?.id);
    const [progress, setProgress] = useState<UserProgress | null>(null);

    // Navigation state
    const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
    const [isAppInitialLoading, setIsAppInitialLoading] = useState(true);

    useEffect(() => {
        // App loading sequence
        setTimeout(() => setIsAppInitialLoading(false), 800);
    }, []);

    // App loading state checked at the bottom to avoid hook violation
    const [topic, setTopic] = useState<string>('');
    const [selectedLesson, setSelectedLesson] = useState<any>(null); // MicroLesson type
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [selectedSkillCategory, setSelectedSkillCategory] = useState<SectionType | null>(null);
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null); // For Skill Modules
    const [gymBackTarget, setGymBackTarget] = useState<AppView>(AppView.DASHBOARD);

    // Track current quiz skill ID and section for proper result saving
    const [currentSkillId, setCurrentSkillId] = useState<number>(0);
    const [currentSection, setCurrentSection] = useState<SectionType>('STRUCTURE');

    // Quiz Hook
    const {
        queue, index, currentData, answers, score, status, setStatus,
        startQuiz, answer, next, prev, jump, marked, toggleMark
    } = usePhase0Quiz();

    // Sharing State
    const [isSharing, setIsSharing] = useState(false);
    const [sharedReportId, setSharedReportId] = useState<string | null>(null);

    // Initial Path Parsing for Sharing
    useEffect(() => {
        const path = window.location.pathname;
        if (path.startsWith('/share/')) {
            const id = path.split('/share/')[1];
            if (id) {
                setSharedReportId(id);
                setCurrentView(AppView.REPORT);
            }
            // Clean URL cosmetically without reloading
            window.history.replaceState({}, document.title, "/");
        }
    }, []);

    // Logging
    const logsEndRef = useRef<HTMLDivElement>(null!);
    const genLog: string[] = [];

    // Toast (Local UI state for this component if needed, though AppRouter might handle most)
    const { toasts, removeToast, error: showError, success: showSuccess } = useToast();

    // Load initial progress
    useEffect(() => {
        const loadProgress = async () => {
            const stats = await calculateUserProgress();
            setProgress(stats);
        };
        loadProgress();
    }, [user]);

    // Handle Push Notifications Lifecycle
    useEffect(() => {
        if (user && isAuthenticated) {
            // Only runs in native capacitor contexts, safe to call here
            pushNotificationService.initialize();
        } else if (!loading && !isAuthenticated) {
            // Clear token on logout
            pushNotificationService.clearToken();
        }
    }, [user, isAuthenticated, loading]);

    // Handlers
    const handleStartSkill = async (skillIdOrTopic: string | number, sectionVal?: SectionType) => {
        console.log(`[App] print start skill: ${skillIdOrTopic} section: ${sectionVal}`);
        setStatus('generating');

        try {
            // Determine inputs
            const topicToUse = typeof skillIdOrTopic === 'string' ? skillIdOrTopic : `Skill ${skillIdOrTopic}`;
            const sect = sectionVal || 'STRUCTURE';

            // Extract numeric skill ID for skillIdOverride
            let numericSkillId: number | undefined = undefined;
            if (typeof skillIdOrTopic === 'number') {
                numericSkillId = skillIdOrTopic;
            } else if (typeof skillIdOrTopic === 'string') {
                // Extract number from strings like "Skill 16: Invert with Place Expressions" or "S16"
                const match = skillIdOrTopic.match(/(?:Skill\s*)?(\d+)|S(\d+)/i);
                if (match) {
                    numericSkillId = parseInt(match[1] || match[2], 10);
                }
            }

            // Store skill ID and section for result saving
            if (numericSkillId) {
                setCurrentSkillId(numericSkillId);
            }
            setCurrentSection(sect);

            // Navigate to Quiz view immediately to show loading state
            setTopic(topicToUse);
            setCurrentView(AppView.QUIZ);

            // Generate questions
            const questions = await generateQuizUnified(
                topicToUse,
                sect,
                5, // Default count
                numericSkillId
            );

            if (questions.length === 0) {
                setStatus('idle');
                setCurrentView(AppView.DASHBOARD); // Return to dashboard on failure
                showError('Failed to generate questions. Please try again.');
                return;
            }

            // Start quiz with generated questions
            startQuiz(questions);

        } catch (error) {
            console.error('[App] Failed to start skill:', error);
            setStatus('idle');
            setCurrentView(AppView.DASHBOARD);
            if (error instanceof TokenLimitError) {
                showError(`Token limit reached (${error.tokensUsed}/${error.tokensLimit}). Please upgrade your plan or wait for token reset.`);
            } else {
                showError(error instanceof Error ? error.message : 'Error starting quiz. Please try again.');
            }
        }
    };

    // Save quiz result when quiz finishes
    useEffect(() => {
        const saveResultOnFinish = async () => {
            if (status === 'finished' && queue.length > 0) {
                // Calculate correct answers
                const correctCount = queue.reduce((acc, q, idx) => {
                    const choiceIdx = answers[idx];
                    if (choiceIdx !== undefined && q.correct_response.includes(q.choices[choiceIdx])) {
                        return acc + 1;
                    }
                    return acc;
                }, 0);

                // Get skill_id from first question if available
                const skillIdFromQuestion = queue[0]?.skill_id || currentSkillId;
                const sectionFromQuestion = queue[0]?.section || currentSection.toLowerCase();

                console.log(`[App] Saving quiz result: skillId=${skillIdFromQuestion}, section=${sectionFromQuestion}`);

                // Save to history
                await saveQuizResult({
                    userName: user?.user_metadata?.full_name || 'Guest',
                    date: new Date().toISOString(),
                    topic: topic,
                    skillId: skillIdFromQuestion,
                    section: sectionFromQuestion,
                    score: score,
                    correctCount: correctCount,
                    totalQuestions: queue.length,
                    xpEarned: correctCount * 5
                }, user?.id);

                // Save per-question history for Error Jail
                console.log(`[App][ErrorJail] user?.id=${user?.id}, queue.length=${queue.length}, answersKeys=${Object.keys(answers).join(',')}`);
                if (user?.id) {
                    const entries = queue
                        .map((q, idx) => {
                            const choiceIdx = answers[idx];
                            if (choiceIdx === undefined) {
                                console.log(`[App][ErrorJail] Skipping q[${idx}]: no answer`);
                                return null;
                            }
                            const questionId = q.id || crypto.randomUUID();
                            const isCorrect = q.correct_response.includes(q.choices[choiceIdx]);
                            const rawSection = (q.section || sectionFromQuestion).toLowerCase();
                            console.log(`[App][ErrorJail] q[${idx}] id=${questionId}, section=${rawSection}, isCorrect=${isCorrect}`);
                            return {
                                questionId: questionId,
                                section: rawSection,
                                isCorrect,
                                questionSnapshot: {
                                    id: questionId,
                                    skill_id: q.skill_id,
                                    section: q.section,
                                    interaction: q.interaction,
                                    stimulus: q.stimulus,
                                    prompt: q.prompt,
                                    choices: q.choices,
                                    correct_response: q.correct_response,
                                    cefr_target: q.cefr_target,
                                    difficulty_score: q.difficulty_score,
                                    metadata: q.metadata
                                }
                            };
                        })
                        .filter((e): e is NonNullable<typeof e> => e !== null);

                    console.log(`[App][ErrorJail] entries.length=${entries.length}`);
                    if (entries.length > 0) {
                        try {
                            await markQuestionsAsAnswered(user.id, entries);
                            console.log(`[App] Saved ${entries.length} question history entries for Error Jail`);
                        } catch (err) {
                            console.warn('[App] Failed to save question history (Error Jail):', err);
                        }
                    }
                } else {
                    console.warn('[App][ErrorJail] Skipped: user not authenticated');
                }

                // Update progress
                const newStats = await calculateUserProgress();
                setProgress(newStats);
            }
        };

        saveResultOnFinish();
    }, [status]);

    const handleShareResult = async () => {
        setIsSharing(true);
        try {
            // 1. Save Report
            // Calculate correct answers
            const correctCount = queue.reduce((acc, q, idx) => {
                const choiceIdx = answers[idx];
                if (choiceIdx !== undefined && q.correct_response.includes(q.choices[choiceIdx])) {
                    return acc + 1;
                }
                return acc;
            }, 0);

            // Convert answers map to array for report
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
                topic: topic,
                score: score,
                total: queue.length,
                correct: correctCount,
                answers: answersArray,
                studentName: user?.user_metadata?.full_name || 'Guest User',
                userId: user?.id
            });

            if (!reportId) throw new Error("Failed to save report");

            // 2. Generate Link
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

    // Block render until Auth determines exact state
    if (loading || isAppInitialLoading) {
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
        <div className="h-[100dvh] bg-[#F5F5FA] text-slate-800 font-sans w-full relative flex flex-col overflow-hidden">

            {/* Global Offline Indicator */}
            <OfflineIndicator />

            <div className={`flex-1 relative overflow-hidden transition-all duration-300 ${isSharing ? 'blur-md pointer-events-none' : ''}`}>
                <AppRouter
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    user={user}
                    progress={progress || {
                        completedSkills: 0, totalSkills: 60, streak: 0, level: 1, xp: 0,
                        currentStreak: 0, totalQuizzes: 0, totalCorrect: 0, unlockedBadges: []
                    }}
                    isAuthenticated={isAuthenticated}
                    signInWithGoogle={signInWithGoogle}
                    signOut={signOut}
                    updateProfile={updateProfile}
                    unreadCount={unreadCount}
                    topic={topic}
                    setTopic={setTopic}
                    status={status}
                    index={index}
                    queue={queue}
                    currentData={currentData}
                    answers={answers}
                    score={score}
                    marked={marked}
                    genLog={genLog}
                    logsEndRef={logsEndRef}
                    startQuiz={startQuiz}
                    answer={answer}
                    next={next}
                    prev={prev}
                    jump={jump}
                    toggleMark={toggleMark}
                    handleStartSkill={handleStartSkill}
                    isSharing={isSharing}
                    handleShareResult={handleShareResult}
                    gymBackTarget={gymBackTarget}
                    setGymBackTarget={setGymBackTarget}
                    selectedLesson={selectedLesson}
                    setSelectedLesson={setSelectedLesson}
                    selectedPostId={selectedPostId}
                    setSelectedPostId={setSelectedPostId}
                    selectedSkillCategory={selectedSkillCategory}
                    setSelectedSkillCategory={setSelectedSkillCategory}
                    selectedSkillId={selectedSkillId}
                    setSelectedSkillId={setSelectedSkillId}
                    sharedReportId={sharedReportId}
                />
            </div>

            {[
                AppView.DASHBOARD,
                AppView.PRACTICE_HUB,
                AppView.SOCIAL_HUB,
                AppView.MORE_HUB,
                AppView.BLOG,
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

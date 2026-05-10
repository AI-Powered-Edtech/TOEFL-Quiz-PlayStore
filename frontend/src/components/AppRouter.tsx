import { ArrowLeft, ShieldCheck, Share2, Loader2, AlertTriangle } from 'lucide-react';
import React from 'react';

import { getRoutes, isRouteAvailable } from '../config/routes';
import { quizService } from '../services/quiz';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useQuizStore } from '../stores/useQuizStore';
import { AppView, CanonicalQuestionV1, SectionType } from '../types';
import { isCorrectOption } from '../utils/quizCorrectness';

import { ErrorBoundary } from './ErrorBoundary';
import { QuizCard } from './QuizCard';
import { QuizNavigator } from './QuizNavigator';
import { QuizViewListening } from './QuizViewListening';
import { QuizViewReading } from './QuizViewReading';
import { QuizViewStructure } from './QuizViewStructure';
import { QuizViewWritten } from './QuizViewWritten';

const LoadingFallback = () => (
    <div className="flex flex-col items-center justify-center h-full w-full min-h-[50vh]">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 flex items-center justify-center relative overflow-hidden mb-4 animate-in zoom-in-95 duration-300">
            <div className="absolute inset-0 bg-blue-50/50 animate-pulse" />
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin relative z-10" />
        </div>
        <p className="text-sm font-bold text-slate-500 animate-pulse">Loading View...</p>
    </div>
);

interface AppRouterProps {
    handleStartSkill: (topic: string | number, section?: SectionType) => void;
    handleShareResult: () => void;
    isSharing: boolean;
    logsEndRef: React.RefObject<HTMLDivElement>;
}

export const AppRouter: React.FC<AppRouterProps> = ({
    handleStartSkill, handleShareResult, isSharing, logsEndRef
}) => {
    // Read all state from Zustand stores
    const {
        currentView, setCurrentView,
        gymBackTarget, setGymBackTarget,
        selectedLesson, setSelectedLesson,
        selectedPostId, setSelectedPostId,
        selectedSkillCategory, setSelectedSkillCategory,
        selectedSkillId, setSelectedSkillId,
        sharedReportId
    } = useNavigationStore();

    const {
        user, progress, isAuthenticated, signInWithGoogle, signOut, updateProfile, unreadCount
    } = useAuthStore();

    const {
        topic, status, queue, index, answers, draftAnswers, score, marked,
        startQuiz, answer, next, prev, jump, toggleMark, setTopic
    } = useQuizStore();

    const currentData = queue[index];
    const [showLeaveQuizConfirm, setShowLeaveQuizConfirm] = React.useState(false);
    const questionStartedAtRef = React.useRef(Date.now());
    const recordedAnswerKeysRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        questionStartedAtRef.current = Date.now();
    }, [index, currentData?.id]);

    React.useEffect(() => {
        if (!currentData || answers[index] === undefined) return;

        const answerKey = `${currentData.id || index}:${answers[index]}`;
        if (recordedAnswerKeysRef.current.has(answerKey)) return;
        recordedAnswerKeysRef.current.add(answerKey);

        const responseTimeMs = Math.max(0, Date.now() - questionStartedAtRef.current);
        quizService.recordAnswer({
            correct: isCorrectOption(currentData, answers[index]),
            section: currentData.section || 'structure',
            skill_id: String(currentData.skill_id),
            response_time_ms: responseTimeMs,
        }).catch((err) => {
            console.warn('[AppRouter] Failed to record adaptive answer metric:', err);
        });
    }, [answers, currentData, index]);

    // Helper to group reading questions (logic moved from App.tsx can be utility, but keeping here for now or passing down)
    const groupReadingQuestionsByPassage = (questions: CanonicalQuestionV1[]): CanonicalQuestionV1[] => {
        const readingQuestions = questions.filter(q => q.section === 'reading');
        const otherQuestions = questions.filter(q => q.section !== 'reading');
        if (readingQuestions.length === 0) return questions;
        const passageMap = new Map<string, CanonicalQuestionV1[]>();
        readingQuestions.forEach(q => {
            const passageText = q.stimulus?.text || '';
            if (!passageMap.has(passageText)) passageMap.set(passageText, []);
            passageMap.get(passageText)!.push(q);
        });
        const groupedReading = Array.from(passageMap.values()).flat();
        return [...groupedReading, ...otherQuestions];
    };

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Student";

    React.useEffect(() => {
        if (!isRouteAvailable(currentView)) {
            setCurrentView(AppView.DASHBOARD);
        }
    }, [currentView, setCurrentView]);

    const routes = getRoutes({
        handleStartSkill,
        setGymBackTarget,
        setCurrentView,
        progress,
        displayName,
        isAuthenticated,
        unreadCount,
        user,
        setTopic,
        startQuiz,
        groupReadingQuestionsByPassage,
        setSelectedLesson,
        signOut,
        signInWithGoogle,
        updateProfile,
        gymBackTarget,
        selectedLesson,
        selectedPostId,
        setSelectedPostId,
        selectedSkillCategory,
        setSelectedSkillCategory,
        selectedSkillId,
        setSelectedSkillId,
        sharedReportId
    });

    const renderView = () => {
        // Special Case: QUIZ View is complex and handles its own deep routing (Reading, Listening, etc.)
        // We keep it inline for performance and complexity reasons
        if (currentView === AppView.QUIZ) {
            return (
                <div className="flex flex-col h-full bg-[#F5F7FA]">
                    {/* Header */}
                    <div className="px-4 py-4 flex items-center justify-between bg-white border-b border-slate-200 shrink-0 shadow-sm z-20">
                        <button aria-label="Leave quiz" onClick={() => setShowLeaveQuizConfirm(true)}><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
                        <span className="font-bold text-sm text-slate-700">{topic || 'Skill Practice'}</span>
                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                            {status === 'generating' ? 'AI' : `${index + 1}/${queue.length}`}
                        </div>
                    </div>

                    <main className="flex-1 p-4 overflow-y-auto relative pb-24">
                        {showLeaveQuizConfirm && (
                            <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="leave-quiz-title">
                                <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100">
                                    <h3 id="leave-quiz-title" className="text-lg font-bold text-slate-900 mb-2">Leave this quiz?</h3>
                                    <p className="text-sm text-slate-500 mb-5">Your current session is saved locally when possible, but leaving now may interrupt your flow.</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setShowLeaveQuizConfirm(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Continue</button>
                                        <button onClick={() => { setShowLeaveQuizConfirm(false); setCurrentView(AppView.DASHBOARD); }} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Leave</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STREAMING GENERATION ANIMATION */}
                        {status === 'generating' && (
                            <div className="absolute inset-0 z-30 bg-[#F5F7FA] flex flex-col items-center justify-center p-6">
                                {/* Animated circles background */}
                                <div className="relative w-32 h-32 mb-8">
                                    <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping opacity-20" />
                                    <div className="absolute inset-2 rounded-full border-4 border-blue-200 animate-ping opacity-30" style={{ animationDelay: '0.3s' }} />
                                    <div className="absolute inset-4 rounded-full border-4 border-blue-300 animate-ping opacity-40" style={{ animationDelay: '0.6s' }} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 animate-pulse">
                                            <Loader2 className="w-10 h-10 text-white animate-spin" />
                                        </div>
                                    </div>
                                </div>

                                {/* Status text */}
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Building Your Quiz</h3>
                                <p className="text-sm text-slate-400 mb-6 text-center max-w-xs">AI is crafting personalized questions just for you</p>
                            </div>
                        )}

                        {/* QUIZ CONTENT ROUTER */}
                        {(status === 'playing' || status === 'answered') && currentData ? (
                            (() => {
                                const isAnswered = answers[index] !== undefined;
                                const selectedIdx = answers[index] ?? draftAnswers[index] ?? null;
                                const isCorrectAnswer = selectedIdx !== null && isCorrectOption(currentData, selectedIdx);

                                // 1. Reading Section
                                if (currentData.section === 'reading') {
                                    return (
                                        <QuizViewReading
                                            currentQuestion={currentData}
                                            selectedAnswerIndex={selectedIdx}
                                            isCorrect={isCorrectAnswer}
                                            showExplanation={isAnswered}
                                            onAnswer={answer}
                                            onNext={next}
                                            isLastQuestion={index === queue.length - 1}
                                        />
                                    );
                                }
                                // 2. Listening Section
                                if (currentData.section === 'listening') {
                                    // Compute next listening transcript for pre-caching
                                    const nextListeningQ = queue.slice(index + 1).find(q => q.section === 'listening');
                                    const nextTx = nextListeningQ?.stimulus?.text || undefined;

                                    return (
                                        <QuizViewListening
                                            currentQuestion={currentData}
                                            selectedAnswerIndex={selectedIdx}
                                            isCorrect={isCorrectAnswer}
                                            showExplanation={isAnswered}
                                            onAnswer={answer}
                                            onNext={next}
                                            isLastQuestion={index === queue.length - 1}
                                            nextTranscript={nextTx}
                                        />
                                    );
                                }
                                // 3. Written Section (Identify Error)
                                const isWrittenExpression =
                                    (currentData.skill_id >= 20 && currentData.skill_id <= 60) ||
                                    currentData.section === 'written' ||
                                    currentData.interaction === 'identify_error' ||
                                    (currentData.prompt && currentData.prompt.includes('{A}'));

                                if (isWrittenExpression) {
                                    return (
                                        <QuizViewWritten
                                            currentQuestion={currentData}
                                            selectedAnswerIndex={selectedIdx}
                                            isCorrect={isCorrectAnswer}
                                            showExplanation={isAnswered}
                                            onAnswer={answer}
                                            onNext={next}
                                            isLastQuestion={index === queue.length - 1}
                                        />
                                    );
                                }
                                // 4. Structure Section
                                if (currentData.section === 'structure') {
                                    return (
                                        <QuizViewStructure
                                            currentQuestion={currentData}
                                            selectedAnswerIndex={selectedIdx}
                                            isCorrect={isCorrectAnswer}
                                            showExplanation={isAnswered}
                                            onAnswer={answer}
                                            onNext={next}
                                            isLastQuestion={index === queue.length - 1}
                                        />
                                    );
                                }
                                // 5. Fallback
                                return (
                                    <QuizCard
                                        data={currentData}
                                        onAnswer={answer}
                                        onNext={next}
                                        isAnswered={isAnswered}
                                        selectedOptionIndex={selectedIdx}
                                    />
                                );
                            })()
                        ) : status !== 'generating' && status !== 'finished' && (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                Loading Question...
                            </div>
                        )}

                        {status === 'finished' && (
                            <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in-95 duration-300">
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <ShieldCheck className="w-12 h-12 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2 text-slate-800">Session Complete</h2>
                                <p className="mb-8 text-slate-500">You scored <strong className="text-slate-900">{score}</strong> out of {queue.length}</p>

                                <div className="flex flex-col w-full max-w-xs gap-3">
                                    <button
                                        onClick={handleShareResult}
                                        disabled={isSharing}
                                        className="bg-[#25D366] hover:bg-[#128C7E] text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-green-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                                        {isSharing ? "Creating Link..." : "Copy Share Link"}
                                    </button>

                                    <button onClick={() => setCurrentView(AppView.ERROR_JAIL)} className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-6 py-3.5 rounded-xl font-bold transition-all mt-2">
                                        Review Mistakes
                                    </button>

                                    <button onClick={() => setCurrentView(AppView.DASHBOARD)} className="bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Return Home</button>
                                    <button
                                        onClick={() => {
                                            const baseQ = currentData || queue[0];
                                            const isWrittenExpression = !!baseQ && (
                                                (baseQ.skill_id >= 20 && baseQ.skill_id <= 60) ||
                                                baseQ.section === 'written' ||
                                                baseQ.interaction === 'identify_error' ||
                                                (baseQ.prompt && baseQ.prompt.includes('{A}'))
                                            );
                                            const sect = baseQ?.section === 'reading'
                                                ? 'READING'
                                                : (baseQ?.section === 'listening'
                                                    ? 'LISTENING'
                                                    : (isWrittenExpression ? 'WRITTEN' : 'STRUCTURE'));
                                            handleStartSkill(topic, sect);
                                        }}
                                        className="bg-white text-slate-600 border border-slate-200 px-6 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-all"
                                    >
                                        Retry Similar
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>

                    {/* QUIZ NAVIGATOR */}
                    {(status === 'playing' || status === 'answered') && (
                        <QuizNavigator
                            totalQuestions={queue.length}
                            currentIndex={index}
                            answers={answers}
                            draftAnswers={draftAnswers}
                            markedIndices={marked}
                            onJump={jump}
                            onMarkToggle={toggleMark}
                            onNext={next}
                            onPrev={prev}
                        />
                    )}
                </div>
            );
        }

        const route = routes.find(r => r.view === currentView);

        if (route) {
            const Component = route.component;
            return <Component {...route.props} />;
        }

        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Feature unavailable in this release</h2>
                <p className="text-slate-500 mb-1">This area is disabled for production until it passes QA.</p>
                <p className="text-xs text-slate-400 mb-6 font-mono">{currentView}</p>
                <div className="flex flex-col w-full max-w-xs gap-3">
                    <button onClick={() => setCurrentView(AppView.PRACTICE_HUB)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Browse Practice</button>
                    <button onClick={() => setCurrentView(AppView.DASHBOARD)} className="bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all">Return Home</button>
                </div>
            </div>
        );
    };

    return (
        <React.Suspense fallback={<LoadingFallback />}>
            {/* key resets error boundary state on every view change — no stuck error screens */}
            <ErrorBoundary
                key={currentView}
                onRetry={() => setCurrentView(AppView.DASHBOARD)}
                onGoHome={() => setCurrentView(AppView.DASHBOARD)}
            >
                <div className="w-full h-full flex flex-col">
                    {renderView()}
                </div>
            </ErrorBoundary>
        </React.Suspense>
    );
};

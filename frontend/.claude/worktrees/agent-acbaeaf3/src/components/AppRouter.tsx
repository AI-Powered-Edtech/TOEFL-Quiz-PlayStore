import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AppView, UserProgress, SectionType, CanonicalQuestionV1 } from '../types';
import { QuizCard } from './QuizCard';
import { QuizViewReading } from './QuizViewReading';
import { QuizViewListening } from './QuizViewListening';
import { QuizViewStructure } from './QuizViewStructure';
import { QuizViewWritten } from './QuizViewWritten';
import { getRoutes } from '../config/routes';
import { QuizNavigator } from './QuizNavigator';
import { Typewriter } from './Typewriter';
import { ArrowLeft, ShieldCheck, Share2, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- LAZY LOADED COMPONENTS ---

// Core & Utility Views
const PdfUploadView = React.lazy(() => import('./PdfUploadView').then(m => ({ default: m.PdfUploadView })));
const ErrorJailView = React.lazy(() => import('./ErrorJailView').then(m => ({ default: m.ErrorJailView })));
const BankView = React.lazy(() => import('./BankView').then(m => ({ default: m.BankView })));
const MoreHub = React.lazy(() => import('./MoreHub').then(m => ({ default: m.MoreHub })));
const PracticeHubView = React.lazy(() => import('./PracticeHub').then(m => ({ default: m.PracticeHubView })));
const SimulationView = React.lazy(() => import('./SimulationView').then(m => ({ default: m.SimulationView })));
const CefrSimulationView = React.lazy(() => import('./CefrSimulationView').then(m => ({ default: m.CefrSimulationView })));

const Profile = React.lazy(() => import('./Profile').then(m => ({ default: m.Profile })));
const SocialHub = React.lazy(() => import('./SocialHub').then(m => ({ default: m.SocialHub })));
const Settings = React.lazy(() => import('./Settings').then(m => ({ default: m.Settings })));
const LearningPath = React.lazy(() => import('./LearningPath').then(m => ({ default: m.LearningPath })));
const NotificationCenter = React.lazy(() => import('./NotificationCenter').then(m => ({ default: m.NotificationCenter })));

// Writing Gym Components
const WritingGymHub = React.lazy(() => import('./writingGym/WritingGymHub').then(m => ({ default: m.WritingGymHub })));
const MasonLevel = React.lazy(() => import('./writingGym/MasonLevel').then(m => ({ default: m.MasonLevel })));
const LogicWeaverLevel = React.lazy(() => import('./writingGym/LogicWeaverLevel').then(m => ({ default: m.LogicWeaverLevel })));
const IELTSParagraphLevel = React.lazy(() => import('./writingGym/IELTSParagraphLevel').then(m => ({ default: m.IELTSParagraphLevel })));
const IntegratedWritingTask = React.lazy(() => import('./writingGym/IntegratedWritingTask').then(m => ({ default: m.IntegratedWritingTask })));
const AcademicDiscussionTask = React.lazy(() => import('./writingGym/AcademicDiscussionTask').then(m => ({ default: m.AcademicDiscussionTask })));

// Lazy Loaded Components
const IELTSWritingSim = React.lazy(() => import('./writingGym/IELTSWritingSim').then(module => ({ default: module.IELTSWritingSim })));
const ModelEssayLibrary = React.lazy(() => import('./writingGym/ModelEssayLibrary').then(module => ({ default: module.ModelEssayLibrary })));
const Band9LibraryHub = React.lazy(() => import('./writingGym/band9Library/Band9LibraryHub').then(module => ({ default: module.Band9LibraryHub })));
const EssayDojoHub = React.lazy(() => import('./writingGym/EssayDojoHub').then(module => ({ default: module.EssayDojoHub })));
const ComplexityLadder = React.lazy(() => import('./writingGym/ComplexityLadder').then(module => ({ default: module.ComplexityLadder })));
const PeerReviewHub = React.lazy(() => import('./peerReview/PeerReviewHub').then(module => ({ default: module.PeerReviewHub })));
const DevilsAdvocateLevel = React.lazy(() => import('./writingGym/DevilsAdvocateLevel').then(module => ({ default: module.DevilsAdvocateLevel })));
const MasonLeaderboard = React.lazy(() => import('./writingGym/MasonLeaderboard').then(module => ({ default: module.MasonLeaderboard })));

const ScoreOracleView = React.lazy(() => import('./ScoreOracleView').then(module => ({ default: module.ScoreOracleView })));
const ReportView = React.lazy(() => import('./ReportView').then(module => ({ default: module.ReportView })));

const SkillModuleList = React.lazy(() => import('./modules/SkillModuleList').then(m => ({ default: m.SkillModuleList })));
const SkillModuleReader = React.lazy(() => import('./modules/SkillModuleReader').then(m => ({ default: m.SkillModuleReader })));

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
    currentView: AppView;
    setCurrentView: (view: AppView) => void;
    user: any;
    progress: UserProgress;
    isAuthenticated: boolean;
    signInWithGoogle: () => void;
    signOut: () => void;
    updateProfile: (updates: any) => Promise<any>;
    unreadCount: number;

    // Quiz State
    topic: string;
    setTopic: (topic: string) => void;
    status: 'idle' | 'generating' | 'playing' | 'answered' | 'finished';
    index: number;
    queue: CanonicalQuestionV1[];
    currentData: CanonicalQuestionV1;
    answers: Record<number, number>;
    score: number;
    marked: number[];
    genLog: string[];
    logsEndRef: React.RefObject<HTMLDivElement>;

    // Quiz Handlers
    startQuiz: (questions: CanonicalQuestionV1[]) => void;
    answer: (optionIndex: number) => void;
    next: () => void;
    prev: () => void;
    jump: (index: number) => void;
    toggleMark: () => void;
    handleStartSkill: (topic: string, section?: SectionType) => void;

    // Sharing
    isSharing: boolean;
    handleShareResult: () => void;

    // Navigation State
    gymBackTarget: AppView;
    setGymBackTarget: (view: AppView) => void;
    selectedLesson: any | null;
    setSelectedLesson: (lesson: any | null) => void;
    selectedPostId: string | null;
    setSelectedPostId: (postId: string | null) => void;
    selectedSkillCategory: SectionType | null;
    setSelectedSkillCategory: (category: SectionType | null) => void;
    selectedSkillId: string | null;
    setSelectedSkillId: (skillId: string | null) => void;
    sharedReportId?: string | null;
}

export const AppRouter: React.FC<AppRouterProps> = ({
    currentView, setCurrentView,
    user, progress, isAuthenticated, signInWithGoogle, signOut, updateProfile, unreadCount,
    topic, setTopic, status, index, queue, currentData, answers, score, marked, genLog, logsEndRef,
    startQuiz, answer, next, prev, jump, toggleMark, handleStartSkill,
    isSharing, handleShareResult,
    gymBackTarget, setGymBackTarget, selectedLesson, setSelectedLesson,
    selectedPostId, setSelectedPostId, selectedSkillCategory, setSelectedSkillCategory,
    selectedSkillId, setSelectedSkillId, sharedReportId
}) => {

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
    const displayEmail = user?.email || "Guest Account";

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
                        <button onClick={() => setCurrentView(AppView.DASHBOARD)}><ArrowLeft className="w-5 h-5 text-slate-500" /></button>
                        <span className="font-bold text-sm text-slate-700">{topic || 'Skill Practice'}</span>
                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                            {status === 'generating' ? 'AI' : `${index + 1}/${queue.length}`}
                        </div>
                    </div>

                    <main className="flex-1 p-4 overflow-y-auto relative pb-24">
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

                                {/* Progress messages */}
                                <div className="w-full max-w-xs space-y-2">
                                    {genLog.slice(-3).map((log, i, arr) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${i === arr.length - 1
                                                ? 'bg-blue-50 border border-blue-100'
                                                : 'bg-slate-50 opacity-50'
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === arr.length - 1
                                                ? 'bg-blue-500 animate-pulse'
                                                : 'bg-green-400'
                                                }`} />
                                            <span className={`text-xs font-medium truncate ${i === arr.length - 1 ? 'text-blue-700' : 'text-slate-500'
                                                }`}>
                                                {i === arr.length - 1 ? (
                                                    <Typewriter text={log} speed={15} showCursor={false} className="text-blue-700 font-medium" />
                                                ) : log}
                                            </span>
                                        </div>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>
                            </div>
                        )}

                        {/* QUIZ CONTENT ROUTER */}
                        {(status === 'playing' || status === 'answered') && currentData ? (
                            (() => {
                                const isAnswered = status === 'answered' || answers[index] !== undefined;
                                const selectedIdx = answers[index] ?? null;
                                const isCorrectAnswer = selectedIdx !== null && currentData.correct_response.includes(currentData.choices[selectedIdx]);

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
                                        {isSharing ? "Creating Link..." : "Share Result to WhatsApp"}
                                    </button>

                                    <button onClick={() => setCurrentView(AppView.ERROR_JAIL)} className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-6 py-3.5 rounded-xl font-bold transition-all mt-2">
                                        Review Mistakes
                                    </button>

                                    <button onClick={() => setCurrentView(AppView.DASHBOARD)} className="bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Return Home</button>
                                    <button onClick={() => handleStartSkill(topic, currentData?.section === 'reading' ? 'READING' : (currentData?.section === 'listening' ? 'LISTENING' : 'STRUCTURE'))} className="bg-white text-slate-600 border border-slate-200 px-6 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-all">Retry Similar</button>
                                </div>
                            </div>
                        )}
                    </main>

                    {/* QUIZ NAVIGATOR */}
                    {(status === 'playing' || status === 'answered') && (
                        <QuizNavigator
                            totalQuestions={queue.length}
                            currentIndex={index}
                            answers={Object.keys(answers).reduce((acc, key) => ({ ...acc, [key]: 'answered' }), {})}
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
            return (
                <React.Suspense fallback={<LoadingFallback />}>
                    <ErrorBoundary>
                        <Component {...route.props} />
                    </ErrorBoundary>
                </React.Suspense>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Under Construction</h2>
                <p className="text-slate-500 mb-6">This feature ({currentView}) is coming soon.</p>
                <button onClick={() => setCurrentView(AppView.DASHBOARD)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Return Home</button>
            </div>
        );
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={currentView}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.02, y: -10 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="w-full h-full flex flex-col"
            >
                {renderView()}
            </motion.div>
        </AnimatePresence>
    );
};

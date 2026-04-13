import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Flame, Shield, Swords, AlertTriangle, CheckCircle, RefreshCw, Send, Brain, Gavel, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { trackDevilsAdvocateEvent } from '../../services/analytics/devilsAdvocateAnalytics';
import { devilsAdvocateService } from '../../services/devilsAdvocateService';
import { oracleService } from '../../services/oracleService';
import { AppView, AdvocateChallenge, AdvocateDefenseResult } from '../../types';

import { Button } from './Button';

// Validation constants
const MAX_ARGUMENT_LENGTH = 5000;
const MIN_ARGUMENT_LENGTH = 20;
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Session state type for localStorage
interface SessionState {
    step: 'input' | 'analyzing' | 'challenge' | 'evaluating' | 'result';
    userArgument: string;
    challenge: AdvocateChallenge | null;
    userDefense: string;
    result: AdvocateDefenseResult | null;
    activeTab: 'challenge' | 'defense';
    sessionId: string | null;
    timestamp: number;
}

// Progress Indicator Component
const StepIndicator: React.FC<{ current: number }> = ({ current }) => (
    <div className="flex items-center justify-center gap-3">
        {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center gap-2">
                <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all duration-300 ${stepNum === current
                        ? 'bg-rose-600 text-white scale-110 shadow-lg shadow-rose-900/50'
                        : stepNum < current
                            ? 'bg-rose-900/50 text-rose-400'
                            : 'bg-slate-800 text-slate-600'
                        }`}
                >
                    {stepNum}
                </div>
                {stepNum < 3 && (
                    <div
                        className={`h-0.5 w-8 md:w-12 transition-all duration-300 ${stepNum < current ? 'bg-rose-600' : 'bg-slate-800'
                            }`}
                    />
                )}
            </div>
        ))}
    </div>
);

export const DevilsAdvocateLevel: React.FC<{ onNavigate: (view: AppView) => void }> = ({ onNavigate }) => {
    const { user } = useAuth();
    const [step, setStep] = useState<'input' | 'analyzing' | 'challenge' | 'evaluating' | 'result'>('input');
    const [userArgument, setUserArgument] = useState('');
    const [challenge, setChallenge] = useState<AdvocateChallenge | null>(null);
    const [userDefense, setUserDefense] = useState('');
    const [result, setResult] = useState<AdvocateDefenseResult | null>(null);
    const [activeTab, setActiveTab] = useState<'challenge' | 'defense'>('challenge');
    const [error, setError] = useState<string | null>(null);
    const [showResumePrompt, setShowResumePrompt] = useState(false);

    // Session tracking
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [startTime] = useState(Date.now());

    // LocalStorage persistence
    const [savedSession, setSavedSession, clearSavedSession] = useLocalStorage<SessionState | null>(
        'devils-advocate-session',
        null
    );

    // Check for saved session on mount
    useEffect(() => {
        if (savedSession && savedSession.timestamp) {
            const isRecent = Date.now() - savedSession.timestamp < SESSION_EXPIRY_MS;
            if (isRecent && savedSession.step !== 'result') {
                setShowResumePrompt(true);
            } else {
                // Clear expired session
                clearSavedSession();
            }
        }
    }, []);

    // Auto-save session state
    useEffect(() => {
        if (step !== 'input' && step !== 'result') {
            setSavedSession({
                step,
                userArgument,
                challenge,
                userDefense,
                result,
                activeTab,
                sessionId,
                timestamp: Date.now(),
            });
        } else if (step === 'result') {
            // Clear session when completed
            clearSavedSession();
        }
    }, [step, userArgument, challenge, userDefense, result, activeTab, sessionId]);

    // Resume session handler
    const handleResumeSession = () => {
        if (savedSession) {
            // Restore all state in correct order
            setUserArgument(savedSession.userArgument);
            setChallenge(savedSession.challenge);
            setUserDefense(savedSession.userDefense);
            setResult(savedSession.result);
            setActiveTab(savedSession.activeTab);
            setSessionId(savedSession.sessionId);

            // Set step last to ensure all data is ready
            // If step was 'analyzing', skip to 'challenge' since we have the data
            if (savedSession.step === 'analyzing' && savedSession.challenge) {
                setStep('challenge');
            } else if (savedSession.step === 'evaluating' && savedSession.result) {
                setStep('result');
            } else {
                setStep(savedSession.step);
            }
        }
        setShowResumePrompt(false);
    };

    // Start fresh handler
    const handleStartFresh = () => {
        clearSavedSession();
        setShowResumePrompt(false);
    };

    // Helper function to get current step number for progress indicator
    const getStepNumber = (): number => {
        if (step === 'input') return 1;
        if (step === 'analyzing' || step === 'challenge') return 2;
        if (step === 'evaluating' || step === 'result') return 3;
        return 1;
    };

    const handleChallenge = async () => {
        const trimmed = userArgument.trim();

        // Input validation
        if (!trimmed) {
            setError('Please enter an argument');
            return;
        }
        if (trimmed.length < MIN_ARGUMENT_LENGTH) {
            setError(`Argument too short. Minimum ${MIN_ARGUMENT_LENGTH} characters required.`);
            return;
        }
        
        // Ensure it's not just gibberish by checking word count
        if (trimmed.split(/\s+/).filter(w => w.length > 0).length < 3) {
            setError(`Argument must contain at least 3 words.`);
            return;
        }

        if (userArgument.length > MAX_ARGUMENT_LENGTH) {
            setError(`Argument too long. Maximum ${MAX_ARGUMENT_LENGTH} characters allowed.`);
            return;
        }

        setError(null);
        setStep('analyzing');
        try {
            const data = await devilsAdvocateService.generateChallenge(userArgument, user?.id);
            
            if (!data || !data.counter_point) {
                throw new Error("AI returned an invalid format. Please try rephrasing your argument.");
            }
            
            setChallenge(data);

            // Save initial session to database
            try {
                const id = await devilsAdvocateService.saveSession(user?.id || null, {
                    user_argument: userArgument,
                    detected_claim: data.detected_claim,
                    counter_point: data.counter_point,
                    logical_fallacy_check: data.logical_fallacy_check,
                    suggested_starters: data.suggested_starters,
                } as any);
                setSessionId(id);
            } catch (dbError) {
                console.warn('Failed to save session to database:', dbError);
                // Continue anyway - session tracking is optional
            }

            // Track analytics
            await trackDevilsAdvocateEvent('challenge_generated', {
                argumentLength: userArgument.length,
            });

            setStep('challenge');
            setActiveTab('challenge');
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error && e.message.includes('Rate limit')
                ? e.message
                : e instanceof Error && e.message.includes('format')
                    ? e.message
                : e instanceof Error && e.message.includes('API')
                    ? 'AI service temporarily unavailable. Please try again.'
                    : 'Failed to generate challenge. Please check your connection and try again.';
            setError(errorMessage);
            setStep('input'); // Reset on error
        }
    };

    const handleDefense = async () => {
        if (!userDefense.trim() || !challenge) return;

        setError(null);
        setStep('evaluating');
        try {
            const data = await devilsAdvocateService.evaluateDefense(
                challenge.detected_claim,
                challenge.counter_point,
                userDefense
            );
            setResult(data);

            // Update session with results
            if (sessionId) {
                try {
                    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
                    await devilsAdvocateService.updateSession(sessionId, {
                        user_defense: userDefense,
                        is_successful: data.is_successful,
                        score: data.score,
                        feedback: data.feedback,
                        improved_version: data.improved_version,
                        completed_at: new Date().toISOString(),
                        time_spent_seconds: timeSpent,
                    } as any);
                } catch (dbError) {
                    console.warn('Failed to update session:', dbError);
                }
            }

            // Track analytics - defense submission
            await trackDevilsAdvocateEvent('defense_submitted', {
                defenseLength: userDefense.length,
                score: data.score,
                isSuccessful: data.is_successful,
            });

            // Track analytics - session completion
            const timeSpent = Math.floor((Date.now() - startTime) / 1000);
            await trackDevilsAdvocateEvent('session_completed', {
                timeSpentSeconds: timeSpent,
                score: data.score,
                isSuccessful: data.is_successful,
            });

            // Trigger Score Oracle recalculation in background
            if (user?.id) {
                oracleService.recalculatePrediction(user.id).catch(err =>
                    console.warn('[OracleTrigger] Background recalc failed:', err)
                );
            }

            setStep('result');
        } catch (e) {
            console.error(e);
            const errorMessage = e instanceof Error && e.message.includes('timeout')
                ? 'Request timed out. Please try again.'
                : 'Failed to evaluate defense. Please try again.';
            setError(errorMessage);
            setStep('challenge');
        }
    };

    const insertStarter = (text: string) => {
        setUserDefense(prev => prev + (prev ? " " : "") + text);
    };

    const reset = () => {
        setStep('input');
        setUserArgument('');
        setChallenge(null);
        setUserDefense('');
        setResult(null);
        setSessionId(null);
        setError(null);
        clearSavedSession(); // Clear localStorage
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden font-sans" role="main" aria-label="Devil's Advocate Challenge">
            {/* Live Region for Screen Readers */}
            <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {step === 'analyzing' && 'Analyzing your argument and generating counter-point'}
                {step === 'evaluating' && 'Evaluating your defense'}
                {step === 'result' && result && `Defense ${result.is_successful ? 'successful' : 'unsuccessful'}. Score: ${result.score} out of 100`}
            </div>

            {/* Dark Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg z-10 shrink-0">
                <Button variant="ghost" onClick={() => onNavigate(AppView.MORE_HUB)} className="text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Exit to More Hub">
                    <ArrowLeft className="w-5 h-5 mr-2" aria-hidden="true" /> Exit
                </Button>
                <div className="flex items-center gap-2 font-black text-rose-500 tracking-wider uppercase">
                    <Flame className="w-5 h-5" aria-hidden="true" /> The Inquisitor
                </div>
            </div>

            {/* Resume Session Prompt - Mobile Optimized */}
            <AnimatePresence>
                {showResumePrompt && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={handleStartFresh}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl"
                            role="dialog"
                            aria-labelledby="resume-title"
                            aria-describedby="resume-description"
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className="bg-indigo-900/30 p-3 rounded-xl">
                                    <RefreshCw className="w-6 h-6 text-indigo-400" aria-hidden="true" />
                                </div>
                                <div className="flex-1">
                                    <h3 id="resume-title" className="text-xl font-bold text-white mb-2">Continue Your Debate?</h3>
                                    <p id="resume-description" className="text-slate-400 text-sm">
                                        You have an unfinished debate session. Would you like to continue where you left off?
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={handleResumeSession}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white border-none w-full"
                                    size="lg"
                                    aria-label="Resume your previous debate session"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" /> Resume Session
                                </Button>
                                <Button
                                    onClick={handleStartFresh}
                                    variant="ghost"
                                    className="text-slate-400 hover:text-white hover:bg-slate-800 w-full"
                                    aria-label="Start a new debate session"
                                >
                                    <X className="w-4 h-4 mr-2" aria-hidden="true" /> Start Fresh
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress Indicator */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <StepIndicator current={getStepNumber()} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
                <div className="max-w-4xl w-full h-full flex flex-col">

                    {/* Error Display */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="max-w-xl mx-auto mb-6 w-full"
                            >
                                <div className="bg-rose-900/30 border border-rose-800 rounded-2xl p-4 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-rose-200 mb-1">Error</h4>
                                        <p className="text-sm text-rose-300">{error}</p>
                                    </div>
                                    <button
                                        onClick={() => setError(null)}
                                        className="text-rose-400 hover:text-rose-300 transition-colors text-xl leading-none"
                                        aria-label="Dismiss error"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* STEP 1: INPUT */}
                    {step === 'input' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center text-center space-y-8 mt-10"
                        >
                            <div className="w-24 h-24 bg-rose-900/30 rounded-full flex items-center justify-center border-4 border-rose-900/50">
                                <Swords className="w-12 h-12 text-rose-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white mb-2">Enter the Arena</h1>
                                <p className="text-slate-400 max-w-md mx-auto" id="argument-help">
                                    State a strong opinion or argument. The AI Inquisitor will find its weakest point and challenge you.
                                </p>
                            </div>

                            <div className="w-full max-w-xl bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl">
                                <textarea
                                    className="w-full h-32 bg-transparent text-lg text-white placeholder:text-slate-600 outline-none resize-none mb-2"
                                    placeholder="e.g., Remote work is actually more productive than office work because..."
                                    value={userArgument}
                                    onChange={(e) => setUserArgument(e.target.value)}
                                    maxLength={MAX_ARGUMENT_LENGTH}
                                    aria-label="Enter your argument"
                                    aria-describedby="argument-help char-count"
                                    aria-invalid={error ? 'true' : 'false'}
                                />
                                <div id="char-count" className="flex justify-between items-center text-xs mb-4">
                                    <span className="text-slate-500">Minimum {MIN_ARGUMENT_LENGTH} characters</span>
                                    <span className={userArgument.length > MAX_ARGUMENT_LENGTH ? 'text-rose-400 font-bold' : 'text-slate-500'} aria-live="polite">
                                        {userArgument.length} / {MAX_ARGUMENT_LENGTH}
                                    </span>
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleChallenge}
                                        disabled={
                                            !userArgument.trim() ||
                                            userArgument.trim().length < MIN_ARGUMENT_LENGTH ||
                                            userArgument.length > MAX_ARGUMENT_LENGTH
                                        }
                                        className="bg-rose-600 hover:bg-rose-500 text-white border-none shadow-lg shadow-rose-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        size="lg"
                                        aria-label="Generate AI counter-argument for your claim"
                                    >
                                        Summon Inquisitor <Flame className="ml-2 w-4 h-4" aria-hidden="true" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* LOADING STATES */}
                    {(step === 'analyzing' || step === 'evaluating') && (
                        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-20 h-20 rounded-full bg-rose-600 blur-xl absolute"
                            />
                            <div className="relative z-10 w-20 h-20 bg-slate-900 rounded-full border-4 border-rose-500 flex items-center justify-center">
                                <Brain className="w-10 h-10 text-rose-500" />
                            </div>
                            <p className="text-rose-200 font-bold tracking-widest uppercase animate-pulse">
                                {step === 'analyzing' ? 'Detecting Fallacies...' : 'Judging Your Defense...'}
                            </p>
                        </div>
                    )}

                    {/* STEP 2: THE CHALLENGE (TABBED VIEW) */}
                    {step === 'challenge' && challenge && (
                        <div className="flex flex-col h-full max-w-lg mx-auto w-full">
                            {/* Tabs */}
                            <div className="flex p-1 bg-slate-900 rounded-xl mb-6 border border-slate-800 shrink-0" role="tablist" aria-label="Challenge and Defense">
                                <button
                                    onClick={() => setActiveTab('challenge')}
                                    role="tab"
                                    aria-selected={activeTab === 'challenge'}
                                    aria-controls="challenge-panel"
                                    id="challenge-tab"
                                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'challenge' ? 'bg-rose-900/30 text-rose-400 border border-rose-900/50 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Gavel className="w-4 h-4" aria-hidden="true" /> The Inquisitor
                                </button>
                                <button
                                    onClick={() => setActiveTab('defense')}
                                    role="tab"
                                    aria-selected={activeTab === 'defense'}
                                    aria-controls="defense-panel"
                                    id="defense-tab"
                                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'defense' ? 'bg-indigo-900/30 text-indigo-400 border border-indigo-900/50 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Shield className="w-4 h-4" aria-hidden="true" /> Your Defense
                                </button>
                            </div>

                            <div className="flex-1 relative overflow-y-auto custom-scrollbar px-1">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'challenge' ? (
                                        <motion.div
                                            key="challenge"
                                            role="tabpanel"
                                            id="challenge-panel"
                                            aria-labelledby="challenge-tab"
                                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                            className="bg-rose-950/20 border border-rose-900/50 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-xl h-fit"
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                                <Gavel className="w-32 h-32 text-rose-500" aria-hidden="true" />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-900/50">AI</div>
                                                    <div>
                                                        <h3 className="font-bold text-rose-200">The Inquisitor</h3>
                                                        <p className="text-xs text-rose-400 uppercase tracking-wide">Counter-Argument</p>
                                                    </div>
                                                </div>

                                                <div className="mb-6 space-y-4">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">You claimed:</p>
                                                        <div className="border-l-2 border-slate-700 pl-3 italic text-slate-400 text-sm">
                                                            "{userArgument}"
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-rose-900/30 to-rose-950/30 p-6 rounded-2xl border border-rose-800/50 shadow-inner">
                                                        <p className="text-lg md:text-xl font-serif leading-relaxed text-white">
                                                            "{challenge.counter_point}"
                                                        </p>
                                                    </div>
                                                </div>

                                                {challenge.logical_fallacy_check !== "None" && (
                                                    <div className="flex items-center gap-2 text-rose-300 text-sm font-bold bg-rose-900/40 px-4 py-2 rounded-lg border border-rose-800/50">
                                                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                                                        Detected Fallacy: {challenge.logical_fallacy_check}
                                                    </div>
                                                )}

                                                <div className="mt-8 flex justify-center">
                                                    <Button onClick={() => setActiveTab('defense')} className="bg-rose-600 hover:bg-rose-500 text-white border-none shadow-lg shadow-rose-900/20 w-full" aria-label="Switch to defense tab to write your rebuttal">
                                                        Defend Yourself <Shield className="w-4 h-4 ml-2" aria-hidden="true" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="defense"
                                            role="tabpanel"
                                            id="defense-panel"
                                            aria-labelledby="defense-tab"
                                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex flex-col gap-4 h-full"
                                        >
                                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex-1 flex flex-col">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <Shield className="w-6 h-6 text-indigo-500" />
                                                    <h3 className="font-bold text-white">Your Defense</h3>
                                                </div>

                                                <p className="text-sm text-slate-400 mb-3">Use these concession starters:</p>
                                                <div className="flex flex-col gap-2 mb-4">
                                                    {challenge.suggested_starters.map((starter, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => insertStarter(starter)}
                                                            className="text-sm text-left bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-200 border border-indigo-800/50 px-4 py-3 rounded-xl transition-all active:scale-95"
                                                        >
                                                            + {starter}
                                                        </button>
                                                    ))}
                                                </div>

                                                <textarea
                                                    className="flex-1 bg-slate-950 rounded-xl p-4 text-slate-200 resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4 border border-slate-800 min-h-[150px]"
                                                    placeholder="Acknowledge the point, but defend your stance..."
                                                    value={userDefense}
                                                    onChange={(e) => setUserDefense(e.target.value)}
                                                    aria-label="Write your defense"
                                                    aria-describedby="defense-help"
                                                />
                                                <p id="defense-help" className="sr-only">
                                                    Acknowledge the counter-argument and defend your original position with new evidence or reasoning.
                                                </p>

                                                <Button
                                                    fullWidth
                                                    onClick={handleDefense}
                                                    disabled={!userDefense.trim()}
                                                    className="bg-indigo-600 hover:bg-indigo-500 border-none text-white py-4"
                                                    aria-label="Submit your defense for evaluation"
                                                >
                                                    Submit Rebuttal <Send className="w-4 h-4 ml-2" aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: RESULT */}
                    {step === 'result' && result && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl mx-auto shadow-2xl mt-4"
                        >
                            <div className="text-center mb-8">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.is_successful ? 'bg-green-500/20 text-green-500' : 'bg-rose-500/20 text-rose-500'}`}>
                                    {result.is_successful ? <CheckCircle className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                                </div>
                                <h2 className="text-3xl font-black text-white mb-2">
                                    {result.is_successful ? "Defense Successful" : "Argument Crumbled"}
                                </h2>
                                <div className="inline-block px-4 py-1 rounded-full bg-slate-800 text-slate-400 font-mono text-sm">
                                    Logic Score: <span className={result.score > 70 ? "text-green-400" : "text-rose-400"}>{result.score}/100</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Feedback</h4>
                                    <p className="text-slate-300 leading-relaxed">{result.feedback}</p>
                                </div>

                                <div className="bg-indigo-900/20 p-6 rounded-2xl border border-indigo-900/50">
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2">AI Improved Version (C2 Level)</h4>
                                    <p className="text-indigo-100 italic leading-relaxed">"{result.improved_version}"</p>
                                </div>

                                <Button fullWidth onClick={reset} variant="secondary" className="mt-4">
                                    <RefreshCw className="w-4 h-4 mr-2" /> Spar Again
                                </Button>
                            </div>
                        </motion.div>
                    )}

                </div>
            </div>
        </div>
    );
};

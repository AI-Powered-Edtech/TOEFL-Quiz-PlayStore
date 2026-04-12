import React, { useEffect } from 'react';
import { ArrowLeft, Loader2, Award, BookOpen, Headphones, PenTool, Mic, AlertCircle, Trophy, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppView } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import PaywallSheet from './PaywallSheet';
import { useTestTimer } from '../hooks/cefr/useTestTimer';
import { useSpeechRecognition } from '../hooks/cefr/useSpeechRecognition';
import { useCefrTest } from '../hooks/cefr/useCefrTest';
import { Button, AudioPlayer, QuestionList, SectionHeader } from './cefr/components';
import { Phase } from './cefr/types';
import { CefrResultsView } from './cefr/CefrResultsView';
import { callGroq } from '../services/groq/client';
import { getCefrLevel, gradeReading, gradeListening, type CefrTestResults } from '../utils/cefrScoringUtils';
import { generateGradingPrompt } from '../data/cefrPrompts';

interface CefrSimulationViewProps {
    onNavigate: (view: AppView) => void;
}

export const CefrSimulationView: React.FC<CefrSimulationViewProps> = ({ onNavigate }) => {
    const { tier, isPaid } = useSubscription();

    // Core Test State Hook
    const {
        phase, setPhase,
        loadingMsg, setLoadingMsg,
        errorMsg, setErrorMsg,
        showPaywall, setShowPaywall,
        showFreeChoiceModal, setShowFreeChoiceModal,
        freeMode, setFreeMode,
        readingData, listeningData, writingData, speakingData,
        readingAnswers, setReadingAnswers,
        listeningAnswers, setListeningAnswers,
        writingAnswers, setWritingAnswers,
        results, setResults,
        currentPart, setCurrentPart,
        testSetIdRef,
        startTest, startFreeTest,
        finishSection, saveResultsToDb, saveTestSetToDb
    } = useCefrTest(isPaid, (s) => startTimer(s));

    // Speech Recognition Hook
    const {
        isRecording,
        speakingTranscripts,
        setSpeakingTranscripts,
        toggleRecording
    } = useSpeechRecognition();

    const handleTimeUp = () => {
        if (phase === 'reading') {
            if (freeMode) finishSection('writing_intro', performGrading);
            else finishSection('listening_intro');
        }
        else if (phase === 'listening') finishSection('writing_intro');
        else if (phase === 'writing') {
            if (freeMode) finishSection('grading', performGrading);
            else finishSection('speaking_intro');
        }
        else if (phase === 'speaking') finishSection('grading', performGrading);
    };

    // Timer Hook
    const { timeLeft, startTimer, stopTimer, formatTime } = useTestTimer(handleTimeUp);

    // Grading Logic — uses extracted utils from cefrScoringUtils

    const performGrading = async () => {
        setPhase('grading');
        setLoadingMsg('Grading your performance...');
        try {
            const readingResult = gradeReading(readingData, readingAnswers);
            const listeningResult = gradeListening(listeningData, listeningAnswers);

            const analyzeText = (text: string) => {
                const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
                const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
                return { wordCount: words.length, sentenceCount: sentences.length, paragraphCount: paragraphs.length };
            };

            const writingMeta: Record<string, any> = {};
            for (const [key, val] of Object.entries(writingAnswers)) {
                const text = (val || '').trim();
                writingMeta[key] = text.length > 0 ? analyzeText(text) : { wordCount: 0, sentenceCount: 0, paragraphCount: 0 };
            }
            const speakingMeta: Record<string, any> = {};
            for (const [key, val] of Object.entries(speakingTranscripts)) {
                const text = (val || '').trim();
                speakingMeta[key] = text.length > 0 ? analyzeText(text) : { wordCount: 0, sentenceCount: 0, paragraphCount: 0 };
            }

            const totalWritingWords = Object.values(writingMeta).reduce((acc, curr) => acc + curr.wordCount, 0);
            const totalSpeakingWords = Object.values(speakingMeta).reduce((acc, curr) => acc + curr.wordCount, 0);

            let writingScore = 0;
            let speakingScore = 0;
            let aiGrades: any = null;

            if (totalWritingWords > 0 || totalSpeakingWords > 0) {
                // Use the full grading prompt with rubric, calibration examples, and forced justification
                const prompt = generateGradingPrompt(
                    writingData,
                    writingAnswers,
                    writingMeta,
                    speakingTranscripts,
                    speakingMeta,
                    readingResult.correct,
                    readingResult.total,
                    listeningResult.correct,
                    listeningResult.total
                );
                try {
                    const content = await callGroq(
                        [{ role: "system", content: "You are a strict, calibrated CEFR English examiner. Return ONLY valid JSON." },
                        { role: "user", content: prompt }],
                        0.2,
                        { jsonMode: true }
                    );
                    aiGrades = JSON.parse(content || '{}');
                } catch (e) {
                    console.error("AI Grading failed", e);
                }
            }

            if (aiGrades?.writingAnalysis) {
                const wa = aiGrades.writingAnalysis;
                writingScore = Math.round(((wa.grammar_vocabulary || 0) + (wa.coherence_cohesion || 0) + (wa.task_response || 0)) / 3);
            }
            if (aiGrades?.speakingAnalysis) {
                const sa = aiGrades.speakingAnalysis;
                speakingScore = Math.round(((sa.grammar_vocabulary || 0) + (sa.coherence_cohesion || 0) + (sa.task_response || 0)) / 3);
            }

            // Use AI-provided scores if available
            if (aiGrades?.writingScore && !aiGrades?.writingAnalysis) {
                writingScore = aiGrades.writingScore;
            }
            if (aiGrades?.speakingScore && !aiGrades?.speakingAnalysis) {
                speakingScore = aiGrades.speakingScore;
            }

            if (totalWritingWords < 5) writingScore = 0;
            if (totalSpeakingWords < 5) speakingScore = 0;

            let overallScore: number;
            if (freeMode) {
                overallScore = Math.round((readingResult.score * 0.5) + (writingScore * 0.5));
            } else {
                overallScore = Math.round((readingResult.score * 0.25) + (listeningResult.score * 0.25) + (writingScore * 0.25) + (speakingScore * 0.25));
            }

            const grades: CefrTestResults = {
                readingScore: readingResult.score,
                listeningScore: freeMode ? null : listeningResult.score,
                writingScore,
                speakingScore: freeMode ? null : speakingScore,
                overallScore,
                cefrLevel: getCefrLevel(overallScore),
                isPartial: freeMode,
                feedback: {
                    reading: aiGrades?.feedback?.reading || `You got ${readingResult.correct}/${readingResult.total} correct.`,
                    listening: freeMode ? 'Upgrade to Basic for Listening section access.' : (aiGrades?.feedback?.listening || `You got ${listeningResult.correct}/${listeningResult.total} correct.`),
                    writing: aiGrades?.feedback?.writing || 'No feedback available.',
                    speaking: freeMode ? 'Upgrade to Basic for Speaking section access.' : (aiGrades?.feedback?.speaking || 'No feedback available.'),
                },
            };

            setResults(grades);
            await saveResultsToDb(grades);
            if (!testSetIdRef.current) await saveTestSetToDb();
            setPhase('results');
        } catch (e) {
            setErrorMsg("Grading failed. Please try again.");
            setPhase('intro');
        }
    };

    // UI Renders
    if (phase === 'intro') {
        return (
            <div className="min-h-full bg-slate-50 flex flex-col pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),24px)]">
                <div className="px-5 py-4 flex items-center gap-3">
                    <button onClick={() => onNavigate(AppView.PRACTICE_HUB)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 touch-manipulation">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">Practice Hub</h1>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto w-full">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Award className="w-12 h-12" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">CEFR Full Test</h1>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        {isPaid
                            ? 'A complete 4-skill assessment (Reading, Listening, Writing, Speaking) powered by AI. Takes approximately 90 minutes.'
                            : 'Tes CEFR lengkap. Free user bisa ambil Reading & Writing saja, atau upgrade untuk 4 skill penuh.'
                        }
                    </p>

                    {errorMsg && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-start gap-2 text-left"><AlertCircle className="shrink-0 w-5 h-5" />{errorMsg}</div>}

                    <div className="w-full space-y-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
                        <div className="flex items-center gap-3 text-left"><BookOpen className="w-5 h-5 text-blue-500" /> <div><p className="font-bold text-sm text-slate-800">Reading</p><p className="text-xs text-slate-500">20 mins • Grammar & Comprehension</p></div></div>
                        <div className={`flex items-center gap-3 text-left ${!isPaid ? 'opacity-40' : ''}`}><Headphones className="w-5 h-5 text-purple-500" /> <div><p className="font-bold text-sm text-slate-800">Listening {!isPaid && <span className="text-[10px] text-amber-600 ml-1">🔒 Basic+</span>}</p><p className="text-xs text-slate-500">20 mins • Dialogues & Monologues</p></div></div>
                        <div className="flex items-center gap-3 text-left"><PenTool className="w-5 h-5 text-orange-500" /> <div><p className="font-bold text-sm text-slate-800">Writing</p><p className="text-xs text-slate-500">30 mins • Emails & Essays</p></div></div>
                        <div className={`flex items-center gap-3 text-left ${!isPaid ? 'opacity-40' : ''}`}><Mic className="w-5 h-5 text-red-500" /> <div><p className="font-bold text-sm text-slate-800">Speaking {!isPaid && <span className="text-[10px] text-amber-600 ml-1">🔒 Basic+</span>}</p><p className="text-xs text-slate-500">15 mins • Prompts & Discussion</p></div></div>
                    </div>

                    <Button onClick={startTest} className="w-full h-14 text-lg">Start Assessment</Button>

                    <AnimatePresence>
                        {showFreeChoiceModal && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-end justify-center"
                                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                                onClick={() => setShowFreeChoiceModal(false)}
                            >
                                <motion.div
                                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                    className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-[max(env(safe-area-inset-bottom),24px)]"
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
                                    <div className="text-center mb-5">
                                        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3"><Award className="w-8 h-8" /></div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-1">Mode Tes</h3>
                                        <p className="text-sm text-slate-500">Pilih cara kamu mengambil tes CEFR</p>
                                    </div>
                                    <button onClick={() => { setShowFreeChoiceModal(false); setShowPaywall(true); }} className="w-full mb-3 p-4 rounded-2xl border-2 border-blue-500 bg-blue-50 text-left active:scale-[0.98] transition-transform">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center flex-shrink-0"><Trophy className="w-5 h-5" /></div>
                                            <div><p className="font-bold text-blue-700 text-sm">4 Skill Penuh</p><p className="text-xs text-blue-600">Reading, Listening, Writing, Speaking — upgrade ke Basic</p></div>
                                        </div>
                                    </button>
                                    <button onClick={startFreeTest} className="w-full p-4 rounded-2xl border border-slate-200 bg-white text-left active:scale-[0.98] transition-transform">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0"><BookOpen className="w-5 h-5" /></div>
                                            <div><p className="font-bold text-slate-700 text-sm">Reading & Writing Saja</p><p className="text-xs text-slate-500">Tetap gratis — skip Listening & Speaking</p></div>
                                        </div>
                                    </button>
                                    <button onClick={() => setShowFreeChoiceModal(false)} className="w-full mt-4 py-3 text-sm text-slate-400 font-medium">Batal</button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <PaywallSheet isOpen={showPaywall} onClose={() => setShowPaywall(false)} triggeredBy="cefr_test" currentTier={tier} />
            </div>
        );
    }

    if (phase === 'loading' || phase === 'grading') {
        return (
            <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center pb-[max(env(safe-area-inset-bottom),24px)]">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">{phase === 'loading' ? 'Preparing Test' : 'Analyzing Performance'}</h2>
                <p className="text-slate-500 max-w-sm">{loadingMsg}</p>
            </div>
        );
    }

    if (phase === 'reading' && readingData) {
        return (
            <div className="h-full flex flex-col bg-slate-50 pb-[max(env(safe-area-inset-bottom),24px)]">
                <SectionHeader
                    title="Reading"
                    timeLeft={formatTime(timeLeft)}
                    onNext={() => {
                        if (currentPart < 3) setCurrentPart(p => p + 1);
                        else finishSection(freeMode ? 'writing_intro' : 'listening_intro', performGrading);
                    }}
                    currentPart={currentPart}
                    totalParts={3}
                />
                <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 custom-scrollbar">
                    <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-6">
                        {(currentPart === 2 || currentPart === 3) && (
                            <div className="lg:w-1/2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-y-auto max-h-[50vh] lg:max-h-[calc(100vh-140px)] custom-scrollbar">
                                <h3 className="font-bold text-slate-800 mb-4 text-lg">Reading Passage</h3>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{currentPart === 2 ? readingData.part2.passage : readingData.part3.passage}</p>
                            </div>
                        )}
                        <div className={`${(currentPart === 2 || currentPart === 3) ? 'lg:w-1/2' : 'w-full max-w-2xl mx-auto'}`}>
                            <QuestionList
                                questions={currentPart === 1 ? readingData.part1 : currentPart === 2 ? readingData.part2.questions : readingData.part3.questions}
                                answers={readingAnswers}
                                setAnswers={setReadingAnswers}
                            />
                        </div>
                    </div>
                </div>
            </div >
        );
    }

    if (phase === 'listening_intro' || phase === 'writing_intro' || phase === 'speaking_intro') {
        const specs = {
            'listening_intro': { title: 'Listening Section', desc: 'Listen to audio clips of increasing difficulty (A2→C1). You may replay each recording up to 2 times.', next: 'listening', data: listeningData, icon: Headphones, color: 'text-purple-500', bg: 'bg-purple-100' },
            'writing_intro': { title: 'Writing Section', desc: 'You will have 30 minutes to complete 4 writing tasks.', next: 'writing', data: writingData, icon: PenTool, color: 'text-orange-500', bg: 'bg-orange-100' },
            'speaking_intro': { title: 'Speaking Section', desc: 'Parts 1-2: Shadowing. Parts 3-4: Free Response.', next: 'speaking', data: speakingData, icon: Mic, color: 'text-red-500', bg: 'bg-red-100' }
        }[phase] as any;

        return (
            <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center pb-[max(env(safe-area-inset-bottom),24px)]">
                <div className={`w-24 h-24 ${specs.bg} ${specs.color} rounded-full flex items-center justify-center mb-6`}><specs.icon className="w-12 h-12" /></div>
                <h1 className="text-3xl font-bold text-slate-800 mb-3">{specs.title}</h1>
                <p className="text-slate-500 mb-8 max-w-sm">{specs.desc}</p>
                {!specs.data ? (
                    <div className="flex items-center gap-3 text-blue-600 bg-blue-50 px-6 py-4 rounded-xl"><Loader2 className="w-5 h-5 animate-spin" /> Generating content...</div>
                ) : (
                    <Button onClick={() => {
                        setPhase(specs.next);
                        if (specs.next === 'listening') startTimer(20 * 60);
                        if (specs.next === 'writing') startTimer(30 * 60);
                        if (specs.next === 'speaking') startTimer(15 * 60);
                    }} className="w-full max-w-xs h-14 text-lg">Begin Section</Button>
                )}
            </div >
        );
    }

    if (phase === 'listening' && listeningData) {
        const clipIndex = currentPart - 1;
        const clip = listeningData[clipIndex];
        const totalClips = listeningData.length;
        const isLastClip = clipIndex >= totalClips - 1;

        if (!clip) { finishSection('writing_intro'); return null; }

        return (
            <div className="h-full flex flex-col bg-slate-50 pb-[max(env(safe-area-inset-bottom),24px)]">
                <SectionHeader
                    title="Listening"
                    timeLeft={formatTime(timeLeft)}
                    onNext={() => {
                        if (!isLastClip) setCurrentPart(p => p + 1);
                        else finishSection('writing_intro', performGrading);
                    }}
                    currentPart={currentPart}
                    totalParts={totalClips}
                />
                <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 custom-scrollbar">
                    <div className="max-w-2xl mx-auto space-y-5">
                        <AudioPlayer audioId={clip.audioId} maxPlays={2} />
                        <QuestionList questions={clip.questions} answers={listeningAnswers} setAnswers={setListeningAnswers} />
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'writing' && writingData) {
        const prompt = currentPart === 1 ? writingData.part1 : currentPart === 2 ? writingData.part2 : currentPart === 3 ? writingData.part3 : writingData.part4;
        const key = `part${currentPart}`;
        const ans = writingAnswers[key] || '';
        return (
            <div className="h-full flex flex-col bg-slate-50 pb-[max(env(safe-area-inset-bottom),24px)]">
                <SectionHeader
                    title="Writing"
                    timeLeft={formatTime(timeLeft)}
                    onNext={() => {
                        if (currentPart < 4) setCurrentPart(p => p + 1);
                        else finishSection(freeMode ? 'grading' : 'speaking_intro', performGrading);
                    }}
                    currentPart={currentPart}
                    totalParts={4}
                />
                <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto flex flex-col gap-6 h-full">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                            <h3 className="font-bold text-slate-800 mb-2">Task {currentPart}</h3>
                            <p className="text-slate-700 leading-relaxed font-medium">{prompt}</p>
                        </div>
                        <div className="flex-1 flex flex-col min-h-[300px]">
                            <textarea
                                value={ans}
                                onChange={(e) => setWritingAnswers(p => ({ ...p, [key]: e.target.value }))}
                                className="flex-1 w-full bg-white border border-slate-200 rounded-2xl p-5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                                placeholder="Write your response here..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'speaking' && speakingData) {
        const pd = currentPart === 1 ? speakingData.part1 : currentPart === 2 ? speakingData.part2 : currentPart === 3 ? speakingData.part3 : speakingData.part4;
        const key = `part${currentPart}`;
        const isShadowing = currentPart <= 2;

        return (
            <div className="h-full flex flex-col bg-slate-50 pb-[max(env(safe-area-inset-bottom),24px)]">
                <SectionHeader
                    title="Speaking"
                    timeLeft={formatTime(timeLeft)}
                    onNext={() => {
                        if (isRecording) toggleRecording(key);
                        if (currentPart < 4) setCurrentPart(p => p + 1);
                        else finishSection('grading', performGrading);
                    }}
                    currentPart={currentPart}
                    totalParts={4}
                />
                <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 flex flex-col min-h-0 custom-scrollbar">
                    <div className="max-w-2xl mx-auto w-full space-y-6 flex-1 flex flex-col min-h-0">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                            <AudioPlayer audioId={pd.audioId} />
                            <p className="mt-4 text-slate-600 font-medium">{pd.prompt}</p>
                        </div>
                        <div className="flex flex-col items-center flex-1 min-h-0 min-h-[200px] justify-center gap-5">
                            <button
                                onClick={() => toggleRecording(key)}
                                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg touch-manipulation ${isRecording ? 'bg-red-500 scale-110 shadow-red-500/40 animate-pulse' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/40'}`}
                            >
                                {isRecording ? <div className="w-8 h-8 bg-white rounded-sm" /> : <Mic className="w-10 h-10 text-white" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div >
        );
    }

    if (phase === 'results' && results) {
        return (
            <CefrResultsView
                results={results}
                isPartial={freeMode}
                onNavigate={onNavigate}
                onRetake={() => {
                    setResults(null);
                    setPhase('intro');
                    setErrorMsg('');
                }}
            />
        );
    }

    return (
        <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Unknown State</h2>
            <Button onClick={() => onNavigate(AppView.PRACTICE_HUB)}>Go Back</Button>
        </div>
    );
};

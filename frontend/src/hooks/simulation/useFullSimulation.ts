/**
 * useFullSimulation — Progressive Full Simulation State Machine
 * 
 * Manages the entire TOEFL IBT simulation lifecycle:
 * - Progressive section-by-section generation (avoids Groq rate limits)
 * - Per-section timers
 * - 2-minute break periods between sections
 * - Adaptive difficulty based on previous section performance
 * - Background generation during breaks
 * 
 * Flow: config → instructions → loading → [section_active → section_break] ... → results
 */

import { useState, useCallback, useRef } from 'react';

import { generateQuizUnified } from '../../services/aiProvider';
import { getRandomQuestionsForSimulation } from '../../services/questionBankService';
import { canAccessFeature, recordFeatureUsage } from '../../services/subscriptionService';
import {
    FullSimulationPhase,
    AdaptiveDifficulty,
    SimulationSectionResult,
    QuizData,
    SIMULATION_SECTIONS_ORDER,
    getAdaptiveDifficulty,
    SectionGenerationStatus,
} from '../../types';

// ─── Configuration ───────────────────────────────────────────────────────────

const BREAK_DURATION_SECONDS = 120; // 2-minute break between sections

export interface SimulationConfig {
    reading: number;
    listening: number;
    structure: number;
    writtenExpression: number;
}

export interface UseFullSimulationReturn {
    // State
    phase: FullSimulationPhase;
    currentSectionIndex: number;
    currentSectionDef: typeof SIMULATION_SECTIONS_ORDER[0] | null;
    questionsForCurrentSection: QuizData[];
    sectionResults: SimulationSectionResult[];
    generationStatus: Record<string, SectionGenerationStatus>;
    difficulty: AdaptiveDifficulty;
    config: SimulationConfig;
    breakTimeLeft: number;
    isGeneratingNext: boolean;
    totalQuestions: number;
    estimatedMinutes: number;
    availableCounts: Record<string, number>;
    error: string | null;

    // Actions
    setConfig: (config: SimulationConfig) => void;
    startSimulation: () => Promise<void>;
    submitSectionAnswers: (answers: Record<number, number>, timeUsed: number) => void;
    skipBreak: () => void;
    resetSimulation: () => void;
}

export const useFullSimulation = (): UseFullSimulationReturn => {
    // ─── Core State ─────────────────────────────────────────────────────────
    const [phase, setPhase] = useState<FullSimulationPhase>('config');
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [sectionResults, setSectionResults] = useState<SimulationSectionResult[]>([]);
    const [difficulty, setDifficulty] = useState<AdaptiveDifficulty>('medium');
    const [error, setError] = useState<string | null>(null);

    // Per-section questions storage
    const questionsRef = useRef<Record<string, QuizData[]>>({});
    const [currentSectionQuestions, setCurrentSectionQuestions] = useState<QuizData[]>([]);

    // Generation status per section
    const [generationStatus, setGenerationStatus] = useState<Record<string, SectionGenerationStatus>>({});
    const [isGeneratingNext, setIsGeneratingNext] = useState(false);

    // Break timer
    const [breakTimeLeft, setBreakTimeLeft] = useState(0);
    const breakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Available question counts from database
    const [availableCounts, setAvailableCounts] = useState<Record<string, number>>({
        reading: 0, listening: 0, structure: 0, written: 0
    });

    // Configuration
    const [config, setConfigState] = useState<SimulationConfig>({
        reading: 50,
        listening: 50,
        structure: 15,
        writtenExpression: 25,
    });

    // Answered question tracking
    const answeredRef = useRef<Record<string, string[]>>({});

    // ─── Derived ────────────────────────────────────────────────────────────
    const totalQuestions = config.reading + config.listening + config.structure + config.writtenExpression;
    const estimatedMinutes = Math.round(totalQuestions * 0.9);
    const currentSectionDef = currentSectionIndex < SIMULATION_SECTIONS_ORDER.length
        ? SIMULATION_SECTIONS_ORDER[currentSectionIndex]
        : null;

    // ─── Config ─────────────────────────────────────────────────────────────
    const setConfig = useCallback((newConfig: SimulationConfig) => {
        setConfigState(newConfig);
    }, []);

    // ─── Section Generation ─────────────────────────────────────────────────

    const getQuestionCountForSection = useCallback((sectionKey: string): number => {
        switch (sectionKey) {
            case 'reading': return config.reading;
            case 'listening': return config.listening;
            case 'structure': return config.structure;
            case 'writtenExpression': return config.writtenExpression;
            default: return 10;
        }
    }, [config]);

    /**
     * Generate questions for a specific section.
     * First fetches from bank, then generates remaining via AI.
     */
    const generateSectionQuestions = useCallback(async (
        sectionIndex: number,
        difficultyOverride?: AdaptiveDifficulty
    ): Promise<QuizData[]> => {
        const sectionDef = SIMULATION_SECTIONS_ORDER[sectionIndex];
        if (!sectionDef) return [];

        const sectionKey = sectionDef.key;
        const dbSection = sectionDef.dbSection;
        const requested = getQuestionCountForSection(sectionKey);
        const available = availableCounts[dbSection] || 0;
        const fromBank = Math.min(requested, available);
        const toGenerate = Math.max(0, requested - available);
        const currentDifficulty = difficultyOverride || difficulty;

        console.log(`[FullSimulation] Generating ${sectionKey}: ${fromBank} from bank, ${toGenerate} from AI (difficulty: ${currentDifficulty})`);

        // Update status
        setGenerationStatus(prev => ({
            ...prev,
            [sectionKey]: {
                section: dbSection,
                fromBank,
                toGenerate,
                generated: 0,
                status: 'fetching' as const,
            }
        }));

        const questions: QuizData[] = [];

        // Phase 1: Fetch from bank
        if (fromBank > 0) {
            try {
                const bankQuestions = await getRandomQuestionsForSimulation(
                    dbSection,
                    fromBank,
                    answeredRef.current[dbSection] || [],
                    0.1
                );
                questions.push(...bankQuestions);
            } catch (err) {
                console.warn(`[FullSimulation] Bank fetch failed for ${sectionKey}:`, err);
            }
        }

        // Phase 2: Generate remaining via AI
        if (toGenerate > 0) {
            setGenerationStatus(prev => ({
                ...prev,
                [sectionKey]: { ...prev[sectionKey], status: 'generating' as const }
            }));

            try {
                const topic = dbSection === 'listening' ? 'TOEFL Listening Comprehension' :
                    dbSection === 'structure' ? 'TOEFL Structure - Sentence Completion' :
                        dbSection === 'written' ? 'TOEFL Written Expression - Error Identification' :
                            'TOEFL Reading Comprehension';

                const sectionType = dbSection === 'listening' ? 'LISTENING' as const :
                    dbSection === 'reading' ? 'READING' as const : 'STRUCTURE' as const;

                const skillId = dbSection === 'written' ? 20 : undefined;

                // Generate in small batches to avoid rate limits
                const batchSize = 5;
                let remaining = toGenerate;
                while (remaining > 0) {
                    const count = Math.min(batchSize, remaining);
                    try {
                        const generated = await generateQuizUnified(topic, sectionType, count, skillId, {
                            parallel: false,
                        });
                        questions.push(...generated);
                        remaining -= count;

                        setGenerationStatus(prev => ({
                            ...prev,
                            [sectionKey]: {
                                ...prev[sectionKey],
                                generated: toGenerate - remaining,
                            }
                        }));

                        // Small delay between batches to avoid rate limits
                        if (remaining > 0) {
                            await new Promise(r => setTimeout(r, 2000));
                        }
                    } catch (err) {
                        console.error(`[FullSimulation] AI generation failed for ${sectionKey}:`, err);
                        // Continue with what we have
                        break;
                    }
                }
            } catch (err) {
                console.error(`[FullSimulation] Generation error for ${sectionKey}:`, err);
            }
        }

        // Mark complete
        setGenerationStatus(prev => ({
            ...prev,
            [sectionKey]: {
                ...prev[sectionKey],
                status: questions.length > 0 ? 'complete' as const : 'error' as const,
                generated: questions.length - fromBank,
            }
        }));

        // Cache for later
        questionsRef.current[sectionKey] = questions;

        return questions;
    }, [config, availableCounts, difficulty, getQuestionCountForSection]);

    // ─── Start Simulation ───────────────────────────────────────────────────

    const startSimulation = useCallback(async () => {
        setError(null);

        // Check subscription
        const access = await canAccessFeature('full_simulation');
        if (!access.allowed) {
            setError('Please upgrade to access Full Simulation.');
            return;
        }

        await recordFeatureUsage('full_simulation');

        // Phase: loading first section
        setPhase('loading');
        setCurrentSectionIndex(0);
        setSectionResults([]);
        setDifficulty('medium');

        try {
            // Generate ONLY the first section (Reading)
            const firstQuestions = await generateSectionQuestions(0, 'medium');

            if (firstQuestions.length === 0) {
                throw new Error('Failed to generate questions for the first section.');
            }

            setCurrentSectionQuestions(firstQuestions);
            setPhase('section_active');

        } catch (err) {
            console.error('[FullSimulation] Failed to start:', err);
            setError(err instanceof Error ? err.message : 'Failed to start simulation.');
            setPhase('config');
        }
    }, [generateSectionQuestions]);

    // ─── Submit Section Answers ─────────────────────────────────────────────

    const submitSectionAnswers = useCallback(async (answers: Record<number, number>, timeUsed: number) => {
        const sectionDef = SIMULATION_SECTIONS_ORDER[currentSectionIndex];
        if (!sectionDef) return;

        // Calculate accuracy
        const questions = currentSectionQuestions;
        let correct = 0;
        Object.entries(answers).forEach(([qIndex, selectedIndex]) => {
            const q = questions[parseInt(qIndex)];
            if (q && q.choices[selectedIndex] === q.correct_response[0]) {
                correct++;
            }
        });

        const total = questions.length;
        const accuracy = total > 0 ? correct / total : 0;

        const result: SimulationSectionResult = {
            section: sectionDef.label,
            correct,
            total,
            accuracy,
            timeUsedSeconds: timeUsed,
            difficulty,
        };

        setSectionResults(prev => [...prev, result]);

        // Start break phase with background generation
        setPhase('section_break');
        setBreakTimeLeft(BREAK_DURATION_SECONDS);
        setIsGeneratingNext(true);

        // Start break countdown
        if (breakTimerRef.current) clearInterval(breakTimerRef.current);
        breakTimerRef.current = setInterval(() => {
            setBreakTimeLeft(prev => {
                if (prev <= 1) {
                    if (breakTimerRef.current) clearInterval(breakTimerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Fetch API for next difficulty and save progress
        try {
            const { quizService } = await import('../../services/quiz');
            const apiResult = await quizService.saveResult({
                section: sectionDef.dbSection,
                score: Math.round(accuracy * 100),
                correct_count: correct,
                total_questions: total,
            });

            const nextDifficulty = (apiResult.next_difficulty_level as AdaptiveDifficulty) || getAdaptiveDifficulty(accuracy);
            setDifficulty(nextDifficulty);
            console.log(`[FullSimulation] Section ${sectionDef.label}: ${correct}/${total} (${(accuracy * 100).toFixed(0)}%) → next difficulty: ${nextDifficulty}`);

            // Check if there are more sections
            const nextIndex = currentSectionIndex + 1;
            if (nextIndex >= SIMULATION_SECTIONS_ORDER.length) {
                // All sections complete → results
                setPhase('results');
                return;
            }

            // Generate next section in background
            generateSectionQuestions(nextIndex, nextDifficulty).then(questions => {
                setIsGeneratingNext(false);

                if (questions.length > 0) {
                    setCurrentSectionIndex(nextIndex);
                    setCurrentSectionQuestions(questions);
                } else {
                    setError(`Failed to generate questions for ${SIMULATION_SECTIONS_ORDER[nextIndex]?.label || 'next section'}`);
                }
            }).catch(err => {
                console.error('[FullSimulation] Background generation failed:', err);
                setIsGeneratingNext(false);
                setError('Failed to generate next section. You can try to skip the break.');
            });

        } catch (e) {
            console.error('Failed to save section result to API:', e);
            // Fallback to local adaptive difficulty calculation
            const nextDifficulty = getAdaptiveDifficulty(accuracy);
            setDifficulty(nextDifficulty);

            // Check if there are more sections
            const nextIndex = currentSectionIndex + 1;
            if (nextIndex >= SIMULATION_SECTIONS_ORDER.length) {
                setPhase('results');
                return;
            }

            generateSectionQuestions(nextIndex, nextDifficulty).then(questions => {
                setIsGeneratingNext(false);
                if (questions.length > 0) {
                    setCurrentSectionIndex(nextIndex);
                    setCurrentSectionQuestions(questions);
                } else {
                    setError(`Failed to generate questions for ${SIMULATION_SECTIONS_ORDER[nextIndex]?.label || 'next section'}`);
                }
            }).catch(err => {
                console.error('[FullSimulation] Background generation failed:', err);
                setIsGeneratingNext(false);
                setError('Failed to generate next section. You can try to skip the break.');
            });
        }
    }, [currentSectionIndex, currentSectionQuestions, difficulty, generateSectionQuestions]);

    // ─── Skip Break ─────────────────────────────────────────────────────────

    const skipBreak = useCallback(() => {
        if (breakTimerRef.current) clearInterval(breakTimerRef.current);
        setBreakTimeLeft(0);

        // Only proceed if next section is ready
        const nextIndex = currentSectionIndex + 1;
        const nextKey = SIMULATION_SECTIONS_ORDER[nextIndex]?.key;
        if (nextKey && questionsRef.current[nextKey]?.length > 0) {
            setCurrentSectionIndex(nextIndex);
            setCurrentSectionQuestions(questionsRef.current[nextKey]);
            setPhase('section_active');
        }
        // If not ready yet, user stays on break screen (generation will auto-advance)
    }, [currentSectionIndex]);

    // ─── Reset ──────────────────────────────────────────────────────────────

    const resetSimulation = useCallback(() => {
        if (breakTimerRef.current) clearInterval(breakTimerRef.current);
        setPhase('config');
        setCurrentSectionIndex(0);
        setSectionResults([]);
        setDifficulty('medium');
        setCurrentSectionQuestions([]);
        setGenerationStatus({});
        setBreakTimeLeft(0);
        setIsGeneratingNext(false);
        setError(null);
        questionsRef.current = {};
    }, []);

    return {
        phase,
        currentSectionIndex,
        currentSectionDef,
        questionsForCurrentSection: currentSectionQuestions,
        sectionResults,
        generationStatus,
        difficulty,
        config,
        breakTimeLeft,
        isGeneratingNext,
        totalQuestions,
        estimatedMinutes,
        availableCounts,
        error,

        setConfig,
        startSimulation,
        submitSectionAnswers,
        skipBreak,
        resetSimulation,
    };
};

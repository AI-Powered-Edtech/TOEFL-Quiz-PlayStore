import { getRandomTask } from '../data/essayTaskBank';
import { WRITING_GYM_SKILL_MAP } from '../data/skills';
import { WritingExercise, WritingGymLevel, WritingGymProgress, IELTSWritingTask, ComplexityLadderLevel } from '../types';
import { metricsCollector } from '../utils/MetricsCollector';
import { logicWeaverLogger } from '../utils/monitoring';
import { logicWeaverRateLimiter, RateLimitError } from '../utils/RateLimiter';

import { cacheService } from './cacheService';
import { essayTaskCache } from './essayTaskCache';
import { validateEssayStructure as validateEssayStructureFn } from './essayValidationService';

const PROGRESS_KEY_PREFIX = 'writing_gym_progress_';
const EXERCISE_POOL_KEY = 'writing_gym_exercise_pool';

interface ExercisePoolEntry {
    id: string;
    level: string;
    skill_id: string;
    difficulty: string;
    exercise_data: WritingExercise;
    created_at: string;
}

const getProgressKey = (userId: string): string => `${PROGRESS_KEY_PREFIX}${userId}`;

const getLocalProgress = (userId: string): WritingGymProgress[] => {
    try {
        const stored = localStorage.getItem(getProgressKey(userId));
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveLocalProgress = (userId: string, progress: WritingGymProgress[]): void => {
    localStorage.setItem(getProgressKey(userId), JSON.stringify(progress));
};

const getExercisePool = (): ExercisePoolEntry[] => {
    try {
        const stored = localStorage.getItem(EXERCISE_POOL_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveExercisePool = (pool: ExercisePoolEntry[]): void => {
    localStorage.setItem(EXERCISE_POOL_KEY, JSON.stringify(pool));
};

export const writingGymService = {

    async getProgress(userId: string): Promise<WritingGymProgress[]> {
        return getLocalProgress(userId);
    },

    getUnlockedLevels(progress: WritingGymProgress[] = []): WritingGymLevel[] {
        const levels: WritingGymLevel[] = ['mason'];

        if (!progress || !Array.isArray(progress)) return levels;

        const completedSkillsByLevel = progress.reduce((acc, p) => {
            if (p.stars_earned >= 3 && p.skill_id) {
                if (!acc[p.level]) acc[p.level] = new Set<string>();
                acc[p.level].add(p.skill_id);
            }
            return acc;
        }, {} as Record<string, Set<string>>);

        const masonCompleteCount = completedSkillsByLevel['mason']?.size || 0;
        const logicWeaverCompleteCount = completedSkillsByLevel['logic_weaver']?.size || 0;

        if (masonCompleteCount >= 5) {
            levels.push('logic_weaver');
        }

        if (logicWeaverCompleteCount >= 5) {
            levels.push('complexity_ladder');
        }

        return levels;
    },

    triggerPrefetch(level: string, skillId: string, difficulty: string) {
        setTimeout(async () => {
            try {
                const { generateWritingGymExercise } = await import('./groq/generators');

                const aiResult = await generateWritingGymExercise(
                    level as any,
                    difficulty as any,
                    skillId
                );

                const exercise = this.buildExerciseFromAiResult(level, skillId, aiResult);

                const pool = getExercisePool();
                pool.push({
                    id: exercise.id,
                    level,
                    skill_id: skillId,
                    difficulty,
                    exercise_data: exercise,
                    created_at: new Date().toISOString()
                });
                saveExercisePool(pool);

            } catch (err) {
                console.warn('[WritingGym] Prefetch generator failed:', err);
            }
        }, 500);
    },

    buildExerciseFromAiResult(level: string, skillId: string, aiResult: any): WritingExercise {
        const base = {
            id: crypto.randomUUID(),
            level,
            skill_id: skillId,
            explanation: aiResult.explanation || "Explanation will appear here.",
            hints: aiResult.hints || []
        };

        if (level === 'mason') {
            let fragments = aiResult.fragments;
            const targetSentence = aiResult.target_sentence;

            if (!targetSentence) throw new Error('Invalid Mason exercise: missing target_sentence');

            if (!fragments || !Array.isArray(fragments) || fragments.length === 0) {
                fragments = targetSentence.replace(/([.,!?;:])/g, ' $1').split(/\s+/).filter((f: string) => f.length > 0);
            }

            return {
                ...base,
                type: 'drag_drop',
                target_sentence: targetSentence,
                fragments,
                translation: aiResult.translation
            } as any;
        } else if (level === 'logic_weaver') {
            return {
                ...base,
                type: 'puzzle_fit',
                clauses: aiResult.clauses,
                connectors: aiResult.options || aiResult.connectors,
                options: aiResult.options || aiResult.connectors,
                correct_answer: aiResult.correct_answer || aiResult.correct_connector,
                translation: aiResult.translation
            } as any;
        } else if (level === 'ielts_paragraph') {
            return {
                ...base,
                type: 'ielts_paragraph',
                ielts_data: aiResult
            } as any;
        }
        throw new Error(`Unsupported level: ${level}`);
    },

    async generateExercise(
        level: Exclude<WritingGymLevel, 'complexity_ladder'>,
        skillId: string,
        difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
        userId?: string
    ): Promise<WritingExercise> {
        const startTime = Date.now();

        try {
            const pool = getExercisePool();
            const poolIndex = pool.findIndex(p => 
                p.level === level && 
                p.skill_id === skillId && 
                p.difficulty === difficulty
            );

            if (poolIndex >= 0) {
                const [exercise] = pool.splice(poolIndex, 1);
                saveExercisePool(pool);
                logicWeaverLogger.info('Exercise served from local pool', { level, skillId, userId });
                metricsCollector.increment('exercise.cache.hit', 1, { level, skillId });
                this.triggerPrefetch(level, skillId, difficulty);
                return exercise.exercise_data as WritingExercise;
            }

            metricsCollector.increment('exercise.cache.miss', 1, { level, skillId });

            if (level === 'logic_weaver' && userId) {
                const rateLimitInfo = await logicWeaverRateLimiter.checkLimit(userId);

                if (!rateLimitInfo.allowed) {
                    logicWeaverLogger.warn('Rate limit exceeded', {
                        userId, skillId, remaining: rateLimitInfo.remaining, retryAfter: rateLimitInfo.retryAfter
                    });
                    metricsCollector.increment('exercise.rate_limited', 1, { level, skillId });
                    throw new RateLimitError(
                        `Rate limit exceeded. You can generate ${rateLimitInfo.remaining} more exercises. Try again in ${rateLimitInfo.retryAfter} seconds.`,
                        rateLimitInfo
                    );
                }
            }

            const { generateWritingGymExercise } = await import('./groq/generators');

            const aiResult = await generateWritingGymExercise(level, difficulty, skillId);

            const latency = Date.now() - startTime;
            metricsCollector.histogram('exercise.generation.latency', latency, { level, skillId, success: 'true' });

            if (level === 'ielts_paragraph') {
                metricsCollector.increment('ielts_paragraph.exercise.generated', 1, { skillId });
                metricsCollector.histogram('ielts_paragraph.exercise.latency', latency, { skillId });
            }

            logicWeaverLogger.info('Exercise generated synchronously', {
                level, skillId, userId, latency
            });

            const exercise = this.buildExerciseFromAiResult(level, skillId, aiResult);

            this.triggerPrefetch(level, skillId, difficulty);

            return exercise as WritingExercise;

        } catch (error: any) {
            if (error.message?.includes('Circuit breaker OPEN')) {
                logicWeaverLogger.error('Circuit breaker activated', {
                    level, skillId, userId, circuitState: 'OPEN',
                });
                metricsCollector.increment('exercise.circuit_breaker_open', 1, { level });

                const cachedFallback = await cacheService.get<WritingExercise>(`exercise:${level}:${skillId}:${difficulty}`);
                if (cachedFallback) {
                    logicWeaverLogger.info('Served stale cache due to circuit breaker', { level, skillId });
                    return cachedFallback;
                }
            } else if (error instanceof RateLimitError) {
                throw error;
            } else {
                logicWeaverLogger.error('Exercise generation failed', {
                    level, skillId, userId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                metricsCollector.increment('exercise.generation_error', 1, { level, skillId });
            }

            console.error('AI generation failed:', error);
            throw error;
        }
    },

    async generateWritingTask(type: 'Task 1' | 'Task 2'): Promise<IELTSWritingTask> {
        const startTime = Date.now();

        try {
            const { generateEssayTask } = await import('./groq/generators');
            const data = await generateEssayTask(type);

            const task: IELTSWritingTask = {
                type,
                prompt: data.prompt,
                source_text: data.source_text,
                suggested_structure: data.suggested_structure,
                time_limit: data.time_limit || (type === 'Task 1' ? 1200 : 2400),
                model_answer: data.model_answer
            };

            essayTaskCache.cacheTask(task);

            const latency = Date.now() - startTime;
            metricsCollector.increment('ielts_writing.task.generated', 1, { type, source: 'ai' });
            metricsCollector.histogram('ielts_writing.task.generation_latency', latency, { type, source: 'ai' });

            return task;
        } catch (error) {
            console.error('[WritingTask] AI generation failed, checking cache:', error);
            metricsCollector.increment('ielts_writing.task.generation_error', 1, { type });

            const cachedTask = essayTaskCache.getRandomCachedTask(type);
            if (cachedTask) {
                console.log('[WritingTask] Using cached task');
                metricsCollector.increment('ielts_writing.task.generated', 1, { type, source: 'cache' });
                return cachedTask;
            }

            console.log('[WritingTask] Using static fallback task');
            metricsCollector.increment('ielts_writing.task.generated', 1, { type, source: 'static' });
            return getRandomTask(type);
        }
    },

    validateEssayStructure(essay: string, type: 'Task 1' | 'Task 2'): any | null {
        const validation = validateEssayStructureFn(essay, type);

        if (!validation.isValid) {
            return {
                band_score: 0,
                feedback: `Your essay could not be evaluated: ${validation.errors.join('. ')}`,
                breakdown: {
                    task_response: 0,
                    coherence_cohesion: 0,
                    lexical_resource: 0,
                    grammatical_range: 0
                },
                confidence: 1.0,
                confidence_factors: [{ factor: "Pre-Validation", score: 1.0, impact: 'positive' }],
                grammar_errors: [],
                grammar_summary: { total_errors: 0, by_category: {}, by_severity: {}, most_frequent_error: 'N/A' },
                indoglish_analysis: [],
                validation_result: validation,
            };
        }

        if (validation.warnings.length > 0) {
            (this as any)._lastValidationResult = validation;
        }

        return null;
    },

    async evaluateEssay(prompt: string, essay: string, type: 'Task 1' | 'Task 2'): Promise<any> {
        const validationError = this.validateEssayStructure(essay, type);
        if (validationError) {
            return validationError;
        }

        const startTime = Date.now();
        try {
            const { evaluateEssay } = await import('./groq/generators');
            const result = await evaluateEssay(prompt, essay, type);

            const latency = Date.now() - startTime;
            metricsCollector.increment('ielts_writing.essay.submitted', 1, { type });
            metricsCollector.histogram('ielts_writing.assessment.latency', latency, { type });

            return result;
        } catch (error) {
            const latency = Date.now() - startTime;
            metricsCollector.increment('ielts_writing.assessment.error', 1, { type });
            metricsCollector.histogram('ielts_writing.assessment.latency', latency, { type, success: 'false' });
            throw error;
        }
    },

    async chatWithExaminer(
        history: any[],
        context: { prompt: string; essay: string; feedback: string },
        userMessage: string
    ): Promise<string> {
        const { chatWithExaminer } = await import('./groq/generators');
        return chatWithExaminer(history, context, userMessage);
    },

    async generateModelEssay(topic?: string): Promise<any> {
        const { generateModelEssay } = await import('./groq/generators');
        return generateModelEssay(topic);
    },

    async generateComplexityLadder(topic: string, skillId?: string): Promise<ComplexityLadderLevel[]> {
        const { generateComplexityLadder } = await import('./groq/generators');
        return generateComplexityLadder(topic, skillId);
    },

    async verifyComplexityLevel(userInput: string, levelName: string, instruction: string, topic: string): Promise<{ isValid: boolean, feedback: string }> {
        const { verifyComplexityLevel } = await import('./groq/generators');
        return verifyComplexityLevel(userInput, levelName, instruction, topic);
    },

    async getLevelHint(levelName: string, topic: string): Promise<string> {
        const { getLevelHint } = await import('./groq/generators');
        return getLevelHint(levelName, topic);
    },

    async saveLadderSession(userId: string, topic: string, levelsCompleted: number, stars: number, history: any[] = []): Promise<void> {
        try {
            const progress = getLocalProgress(userId);
            const existingIndex = progress.findIndex(p => 
                p.level === 'complexity_ladder' && p.skill_id === topic
            );

            const entry: WritingGymProgress = {
                id: existingIndex >= 0 ? progress[existingIndex].id : crypto.randomUUID(),
                user_id: userId,
                level: 'complexity_ladder',
                skill_id: topic,
                stars_earned: Math.max(stars, existingIndex >= 0 ? progress[existingIndex].stars_earned : 0),
                history: history,
                updated_at: new Date().toISOString()
            };

            if (existingIndex >= 0) {
                progress[existingIndex] = entry;
            } else {
                progress.push(entry);
            }

            saveLocalProgress(userId, progress);
        } catch (err) {
            console.error('Failed to save ladder session:', err);
            throw err;
        }
    },

    async getCompletedLadders(userId: string): Promise<any[]> {
        const progress = getLocalProgress(userId);
        return progress
            .filter(p => p.level === 'complexity_ladder')
            .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    }
};

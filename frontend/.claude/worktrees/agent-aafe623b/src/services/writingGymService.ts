
import { WRITING_GYM_SKILL_MAP } from '../data/skills';
import { getRandomTask } from '../data/essayTaskBank';
import { WritingExercise, WritingGymLevel, WritingGymProgress, IELTSWritingTask, ComplexityLadderLevel } from '../types';
import { metricsCollector } from '../utils/MetricsCollector';
import { logicWeaverLogger } from '../utils/monitoring';
import { logicWeaverRateLimiter, RateLimitError } from '../utils/RateLimiter';

import { cacheService } from './cacheService';
import { essayTaskCache } from './essayTaskCache';
import { supabase } from './supabase';

import { validateEssayStructure as validateEssayStructureFn } from './essayValidationService';

/**
 * Service to handle Writing Gym gamification logic
 */

export const writingGymService = {

    /**
     * Get user progress for all levels
     */
    async getProgress(userId: string): Promise<WritingGymProgress[]> {
        const { data, error } = await supabase
            .from('writing_gym_progress')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching writing gym progress:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get unlocked levels based on validated user progress
     * Level 1 (Mason): Always unlocked
     * Level 2 (Logic Weaver): Requires 5 DISTINCT skills from Mason with 3+ stars
     * Level 3 (Complexity Ladder): Requires 5 DISTINCT skills from Logic Weaver with 3+ stars
     */
    getUnlockedLevels(progress: WritingGymProgress[] = []): WritingGymLevel[] {
        const levels: WritingGymLevel[] = ['mason']; // Always unlocked

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

        // Unlock Logic Weaver after 5 distinct Mason skills
        if (masonCompleteCount >= 5) {
            levels.push('logic_weaver');
        }

        // Unlock Complexity Ladder after 5 distinct Logic Weaver skills
        if (logicWeaverCompleteCount >= 5) {
            levels.push('complexity_ladder');
        }

        return levels;
    },

    /**
     * Trigger background prefetch to populate the cache pool
     */
    triggerPrefetch(level: string, skillId: string, difficulty: string) {
        // Run in background without awaiting, safe in SPAs
        setTimeout(async () => {
            try {
                // Skip prefetch for unauthenticated users (prevents RPC 400/403)
                const { data: authData } = await supabase.auth.getSession();
                if (!authData.session) return;

                // Dynamically import generator to avoid circular dependencies
                const { generateWritingGymExercise } = await import('./groq/generators');

                // 1. Generate new exercise in background (bypassing rate limits as this is system prefetch)
                const aiResult = await generateWritingGymExercise(
                    level as any,
                    difficulty as any,
                    skillId
                );

                const exercise = this.buildExerciseFromAiResult(level, skillId, aiResult);

                // 2. Insert to pool via RPC (bypasses RLS)
                const { error } = await supabase.rpc('upsert_exercise_to_pool', {
                    p_id: exercise.id,
                    p_level: level,
                    p_skill_id: skillId,
                    p_difficulty: difficulty,
                    p_exercise_data: exercise
                });

                if (error) {
                    logicWeaverLogger.error('Failed to prefetch to pool via RPC', { error, level, skillId });
                } else {
                    logicWeaverLogger.info('Prefetch successfully inserted to pool', { level, skillId });
                }

            } catch (err) {
                console.warn('[WritingGym] Prefetch generator failed:', err);
            }
        }, 500);
    },

    /**
     * Helper to construct complete WritingExercise from Groq payload
     */
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
        throw new Error(`Unsupported level: \${level}`);
    },

    /**
     * Generate exercise using Groq AI with Circuit Breaker and Rate Limiting
     */
    async generateExercise(
        level: Exclude<WritingGymLevel, 'complexity_ladder'>,
        skillId: string,
        difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
        userId?: string
    ): Promise<WritingExercise> {
        const startTime = Date.now();

        try {
            // 1. Check Supabase DB Cache Pool using SKIP LOCKED via RPC
            const { data: cachedExercise, error: popError } = await supabase.rpc('pop_exercise_from_pool', {
                p_level: level,
                p_skill_id: skillId,
                p_difficulty: difficulty
            });

            if (cachedExercise && !popError) {
                logicWeaverLogger.info('Exercise served from Supabase pool', { level, skillId, userId });
                metricsCollector.increment('exercise.cache.hit', 1, { level, skillId });

                // Trigger prefetch to replenish pool asynchronously
                this.triggerPrefetch(level, skillId, difficulty);

                return cachedExercise as WritingExercise;
            }

            metricsCollector.increment('exercise.cache.miss', 1, { level, skillId });

            // 2. Rate limiting check (only for Logic Weaver with authenticated users)
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

            // 3. Import Groq generator & dynamically generate synchronous fallback
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

            // 4. Trigger prefetch so next users get from pool
            this.triggerPrefetch(level, skillId, difficulty);

            return exercise as WritingExercise;

        } catch (error: any) {
            // ... (metrics failure)

            // Handle specific error types
            // Check for Circuit Breaker error from string (since we use groq/client.ts)
            if (error.message?.includes('Circuit breaker OPEN')) {
                logicWeaverLogger.error('Circuit breaker activated', {
                    level,
                    skillId,
                    userId,
                    circuitState: 'OPEN', // Inferred
                });
                metricsCollector.increment('exercise.circuit_breaker_open', 1, { level });

                // Try to get from cache as emergency fallback
                const cachedFallback = await cacheService.get<WritingExercise>(`exercise:${level}:${skillId}:${difficulty}`);
                if (cachedFallback) {
                    logicWeaverLogger.info('Served stale cache due to circuit breaker', { level, skillId });
                    return cachedFallback;
                }
            } else if (error instanceof RateLimitError) {
                // ...

                // Re-throw rate limit errors to user
                throw error;
            } else {
                // Generic error logging
                logicWeaverLogger.error('Exercise generation failed', {
                    level,
                    skillId,
                    userId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                metricsCollector.increment('exercise.generation_error', 1, { level, skillId });
            }

            console.error('AI generation failed:', error);

            // Re-throw instead of returning fake exercises
            throw error;
        }
    },

    /**
     * Generate IELTS/TOEFL Writing Task
     * Uses AI generation with cache fallback and static bank fallback
     */
    async generateWritingTask(type: 'Task 1' | 'Task 2'): Promise<IELTSWritingTask> {
        const startTime = Date.now();

        try {
            // Try AI generation first
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

            // Cache successful AI generation for offline use
            essayTaskCache.cacheTask(task);

            const latency = Date.now() - startTime;
            metricsCollector.increment('ielts_writing.task.generated', 1, { type, source: 'ai' });
            metricsCollector.histogram('ielts_writing.task.generation_latency', latency, { type, source: 'ai' });

            return task;
        } catch (error) {
            console.error('[WritingTask] AI generation failed, checking cache:', error);
            metricsCollector.increment('ielts_writing.task.generation_error', 1, { type });

            // Try cached task first (may have been cached from previous AI generation)
            const cachedTask = essayTaskCache.getRandomCachedTask(type);
            if (cachedTask) {
                console.log('[WritingTask] Using cached task');
                metricsCollector.increment('ielts_writing.task.generated', 1, { type, source: 'cache' });
                return cachedTask;
            }

            // Fallback to static task bank
            console.log('[WritingTask] Using static fallback task');
            metricsCollector.increment('ielts_writing.task.generated', 1, { type, source: 'static' });
            return getRandomTask(type);
        }
    },

    /**
     * Pre-validate essay before sending to AI
     * Returns an error assessment object if validation fails, null if it passes
     */
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

        // Return validation warnings alongside null (pass) so UI can display them
        if (validation.warnings.length > 0) {
            // Store warnings for later attachment to AI result
            (this as any)._lastValidationResult = validation;
        }

        return null;
    },

    /**
     * Evaluate Student Essay
     */
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

    /**
     * Chat with AI Examiner
     */
    async chatWithExaminer(
        history: any[],
        context: { prompt: string; essay: string; feedback: string },
        userMessage: string
    ): Promise<string> {
        const { chatWithExaminer } = await import('./groq/generators');
        return chatWithExaminer(history, context, userMessage);
    },

    /**
     * Generate Model Essay
     */
    async generateModelEssay(topic?: string): Promise<any> {
        const { generateModelEssay } = await import('./groq/generators');
        return generateModelEssay(topic);
    },

    /**
     * Complexity Ladder Methods
     */
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
        // Upsert progress for this topic
        const { error } = await supabase
            .from('writing_gym_progress')
            .upsert({
                user_id: userId,
                level: 'complexity_ladder',
                skill_id: topic, // Using topic as the "skill" identifier
                stars_earned: stars,
                history: history, // Save sentence history
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,level,skill_id'
            });

        if (error) {
            console.error('Failed to save ladder session:', error);
            throw error;
        }

        // Update Global XP (50 XP for completing a ladder)
        const { error: profileError } = await supabase.rpc('increment_xp', {
            user_id_param: userId,
            amount: 50
        });

        // Fallback removed due to security vulnerability. Only rely on RPC.
        if (profileError) {
            console.error('[Writing Gym] Failed to strictly update XP via backend increment_xp RPC', profileError);
        }
    },

    async getCompletedLadders(userId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('writing_gym_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('level', 'complexity_ladder')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error("Failed to fetch ladders", error);
            return [];
        }
        return data || [];
    }
};

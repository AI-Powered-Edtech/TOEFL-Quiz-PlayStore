import { getRandomTask } from '../data/essayTaskBank';
import { WRITING_GYM_SKILL_MAP } from '../data/skills';
import { WritingExercise, WritingGymLevel, WritingGymProgress, IELTSWritingTask, ComplexityLadderLevel } from '../types';
import { metricsCollector } from '../utils/MetricsCollector';
import { logicWeaverLogger } from '../utils/monitoring';
import { logicWeaverRateLimiter, RateLimitError } from '../utils/RateLimiter';
import api from './apiClient';

import { cacheService } from './cacheService';
import { essayTaskCache } from './essayTaskCache';

const EXERCISE_POOL_KEY = 'writing_gym_exercise_pool';

interface ExercisePoolEntry {
    id: string;
    level: string;
    skill_id: string;
    difficulty: string;
    exercise_data: WritingExercise;
    created_at: string;
}

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
        const response = await api.get<WritingGymProgress[]>('/api/writing/progress');
        return response.data || [];
    },

    getUnlockedLevels(progress: WritingGymProgress[] = []): WritingGymLevel[] {
        if (import.meta.env.DEV) {
            return ['mason', 'logic_weaver', 'complexity_ladder', 'ielts_paragraph'];
        }
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

            console.warn('AI generation failed:', error);

            if (level === 'mason') {
                const target = `Students practice ${skillId || 'grammar'} every day.`;
                const fragments = target.replace(/([.,!?;:])/g, ' $1').split(/\s+/).filter(Boolean);
                return this.buildExerciseFromAiResult('mason', skillId, {
                    target_sentence: target,
                    fragments,
                    translation: 'Latihan offline (tanpa AI).',
                    explanation: 'Explanation will appear here.',
                    hints: []
                });
            }

            if (level === 'logic_weaver') {
                return this.buildExerciseFromAiResult('logic_weaver', skillId, {
                    clauses: {
                        main: 'The results improved',
                        subordinate: 'the team practiced consistently'
                    },
                    options: ['because', 'although', 'therefore'],
                    correct_answer: 'because',
                    translation: 'Latihan offline (tanpa AI).',
                    explanation: 'Explanation will appear here.',
                    hints: []
                });
            }

            if (level === 'ielts_paragraph') {
                return this.buildExerciseFromAiResult('ielts_paragraph', skillId, {
                    task_prompt: 'Some people think students should do more group work at school. To what extent do you agree or disagree?',
                    steps: [
                        {
                            step_type: 'Topic Sentence',
                            options: [
                                { id: 'A', text: 'Group work can significantly enhance students’ communication skills by requiring them to articulate ideas clearly.', band_level: 9, feedback: 'Precise claim with sophisticated wording.' },
                                { id: 'B', text: 'Group work can improve communication because students need to share ideas with other classmates.', band_level: 8, feedback: 'Clear and strong, slightly less nuanced.' },
                                { id: 'C', text: 'Group work is good because students talk to each other and learn together in class.', band_level: 7, feedback: 'Clear but simpler phrasing.' }
                            ]
                        },
                        {
                            step_type: 'Supporting Detail',
                            options: [
                                { id: 'A', text: 'For instance, collaborative tasks often assign roles that promote negotiation, turn-taking, and constructive disagreement.', band_level: 9, feedback: 'Strong support and natural flow.' },
                                { id: 'B', text: 'In many projects, students must divide roles, listen, and respond, which strengthens teamwork and speaking ability.', band_level: 8, feedback: 'Solid support, slightly less refined.' },
                                { id: 'C', text: 'When students work in groups, they share roles and speak more, so they practice teamwork.', band_level: 7, feedback: 'Support is present but more repetitive.' }
                            ]
                        },
                        {
                            step_type: 'Example',
                            options: [
                                { id: 'A', text: 'A debate-style group assignment can train learners to defend positions with evidence while respecting alternative viewpoints.', band_level: 9, feedback: 'Specific, relevant, and well-developed.' },
                                { id: 'B', text: 'For example, group presentations push students to discuss content and prepare a clear message for an audience.', band_level: 8, feedback: 'Relevant example with good clarity.' },
                                { id: 'C', text: 'For example, students can present together and talk about the topic in front of the class.', band_level: 7, feedback: 'Example is simple but understandable.' }
                            ]
                        }
                    ],
                    explanation: 'Explanation will appear here.',
                    hints: []
                });
            }

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

    async evaluateEssay(prompt: string, essay: string, type: 'Task 1' | 'Task 2'): Promise<any> {
        const startTime = Date.now();
        try {
            const response = await api.post('/api/writing/evaluate', {
                essay,
                task_type: type,
                prompt,
            });

            const latency = Date.now() - startTime;
            metricsCollector.increment('ielts_writing.essay.submitted', 1, { type });
            metricsCollector.histogram('ielts_writing.assessment.latency', latency, { type });

            // The backend returns a VilResponse<EvaluateResponse>.
            // We want to return the feedback object that includes validation_result.
            const result = (response.data as any)?.feedback || response.data;
            
            if (result?.validation_result?.warnings?.length > 0) {
                (this as any)._lastValidationResult = result.validation_result;
            }

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
            await api.post('/api/writing/progress', {
                level: 'complexity_ladder',
                skill_id: topic,
                exercises_completed: levelsCompleted,
                stars_earned: stars,
                history: JSON.stringify(history)
            });
        } catch (err) {
            console.error('Failed to save ladder session:', err);
            throw err;
        }
    },

    async getCompletedLadders(userId: string): Promise<any[]> {
        const response = await api.get<WritingGymProgress[]>('/api/writing/progress');
        const progress = response.data || [];
        return progress
            .filter(p => p.level === 'complexity_ladder')
            .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    }
};

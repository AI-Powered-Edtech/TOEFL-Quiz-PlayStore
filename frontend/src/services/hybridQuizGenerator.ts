import { CanonicalQuestionV1, SectionType } from '../types';
import { groqCircuitBreaker } from './groq/circuitBreaker';
import { generateQuizBatch } from './groq/quizGenerator';
import { generateStructureBatch } from './groq/structureQuizEngine';
import { generateWrittenBatch } from './groq/writtenQuizEngine';
import { generateReadingBatch } from './groq/readingQuizEngine';
import { generateListeningBatch } from './groq/listeningQuizEngine';

export interface HybridQuizConfig {
    useAI: boolean;
    useFallback: boolean;
    maxRetries: number;
    fallbackCount: number;
}

const DEFAULT_CONFIG: HybridQuizConfig = {
    useAI: true,
    useFallback: true,
    maxRetries: 2,
    fallbackCount: 3,
};

export const FALLBACK_QUESTIONS: Record<SectionType, CanonicalQuestionV1[]> = {
    STRUCTURE: [
        {
            id: 'fallback_structure_1',
            skill_id: 1,
            section: 'structure',
            interaction: 'fill_blank',
            prompt: 'The researcher _____ that the experiment would yield significant results.',
            choices: ['predicted', 'predicts', 'has predicted', 'was predicting'],
            correct_response: ['predicted'],
            cefr_target: 'B1',
            difficulty_score: 45,
            stimulus: {},
            metadata: { source: 'db', topic: 'verb_tense' },
        },
        {
            id: 'fallback_structure_2',
            skill_id: 5,
            section: 'structure',
            interaction: 'fill_blank',
            prompt: 'Unlike the previous study, _____ results showed a clear correlation.',
            choices: ['these', 'that', 'this', 'those'],
            correct_response: ['these'],
            cefr_target: 'B1',
            difficulty_score: 55,
            stimulus: {},
            metadata: { source: 'db', topic: 'demonstratives' },
        },
        {
            id: 'fallback_structure_3',
            skill_id: 10,
            section: 'structure',
            interaction: 'fill_blank',
            prompt: 'The professor emphasized that students _____ complete their assignments on time.',
            choices: ['must', 'must to', 'must have', 'musted'],
            correct_response: ['must'],
            cefr_target: 'A2',
            difficulty_score: 40,
            stimulus: {},
            metadata: { source: 'db', topic: 'modals' },
        },
    ],
    WRITTEN: [
        {
            id: 'fallback_written_1',
            skill_id: 25,
            section: 'written',
            interaction: 'identify_error',
            prompt: 'The {A}new{B} interesting{C} approach{D} yielded unexpected results.',
            choices: ['A', 'B', 'C', 'D'],
            correct_response: ['B'],
            cefr_target: 'B1',
            difficulty_score: 50,
            stimulus: {},
            metadata: { source: 'db', topic: 'adjectives' },
        },
        {
            id: 'fallback_written_2',
            skill_id: 30,
            section: 'written',
            interaction: 'identify_error',
            prompt: 'She {A}quickly{B} walked{C} to{D} the store.',
            choices: ['A', 'B', 'C', 'D'],
            correct_response: ['A'],
            cefr_target: 'A2',
            difficulty_score: 35,
            stimulus: {},
            metadata: { source: 'db', topic: 'adverbs' },
        },
        {
            id: 'fallback_written_3',
            skill_id: 35,
            section: 'written',
            interaction: 'identify_error',
            prompt: 'The {A}data{B} were{C} {D} helpful.',
            choices: ['A', 'B', 'C', 'D'],
            correct_response: ['D'],
            cefr_target: 'B2',
            difficulty_score: 60,
            stimulus: {},
            metadata: { source: 'db', topic: 'subject_verb' },
        },
    ],
    READING: [
        {
            id: 'fallback_reading_1',
            skill_id: 101,
            section: 'reading',
            interaction: 'multiple_choice',
            prompt: 'Based on the passage, what can be inferred about the author\'s perspective?',
            stimulus: {
                text: 'The findings suggest that climate change has significant impacts on global ecosystems. Researchers emphasize the need for immediate action to mitigate these effects.',
            },
            choices: [
                'The author believes the issue is overstated',
                'The author supports urgent environmental policy',
                'The author suggests further research is unnecessary',
                'The author opposes current climate models',
            ],
            correct_response: ['The author supports urgent environmental policy'],
            cefr_target: 'B2',
            difficulty_score: 55,
            metadata: { source: 'db', topic: 'inference' },
        },
        {
            id: 'fallback_reading_2',
            skill_id: 105,
            section: 'reading',
            interaction: 'multiple_choice',
            prompt: 'What is the primary purpose of the passage?',
            stimulus: {
                text: 'Photosynthesis is the process by which plants convert light energy into chemical energy. This process occurs in chloroplasts and involves chlorophyll. The energy produced supports plant growth and reproduction.',
            },
            choices: [
                'To argue for plant conservation',
                'To explain the process of photosynthesis',
                'To compare different plant species',
                'To discuss the history of botanical research',
            ],
            correct_response: ['To explain the process of photosynthesis'],
            cefr_target: 'A2',
            difficulty_score: 40,
            metadata: { source: 'db', topic: 'purpose' },
        },
    ],
    LISTENING: [
        {
            id: 'fallback_listening_1',
            skill_id: 201,
            section: 'listening',
            interaction: 'multiple_choice',
            prompt: 'What is the professor mainly discussing?',
            stimulus: {
                audio_url: '',
                text: 'Today we\'ll discuss the Industrial Revolution and its impact on European society. The period from 1760 to 1840 saw remarkable changes in manufacturing and agriculture.',
            },
            choices: [
                'Agricultural techniques in the 18th century',
                'The causes and effects of the Industrial Revolution',
                'European social history timeline',
                'Manufacturing innovations in textile industry',
            ],
            correct_response: ['The causes and effects of the Industrial Revolution'],
            cefr_target: 'B1',
            difficulty_score: 50,
            metadata: { source: 'db', topic: 'lecture_main_idea' },
        },
    ],
    SPEAKING: [],
};

export const getFallbackQuestions = (
    section: SectionType,
    count: number,
    difficulty?: 'easy' | 'medium' | 'hard'
): CanonicalQuestionV1[] => {
    const questions = FALLBACK_QUESTIONS[section] || [];
    
    let filtered = questions;
    if (difficulty) {
        const range: Record<string, [number, number]> = {
            easy: [1, 40],
            medium: [41, 60],
            hard: [61, 100],
        };
        const [min, max] = range[difficulty];
        filtered = questions.filter(q => {
            const score = q.difficulty_score || 50;
            return score >= min && score <= max;
        });
    }

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length || questions.length));
};

export const generateHybridQuiz = async (
    topic: string,
    section: SectionType,
    count: number,
    config: Partial<HybridQuizConfig> = {},
    skillIdOverride?: number
): Promise<CanonicalQuestionV1[]> => {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const results: CanonicalQuestionV1[] = [];
    let attempts = 0;

    while (results.length < count && attempts < cfg.maxRetries + 1) {
        if (cfg.useAI && attempts === 0) {
            try {
                const aiQuestions = await groqCircuitBreaker.execute(
                    'quiz_generation',
                    () => generateQuizBatch(topic, section, count, skillIdOverride)
                );
                results.push(...aiQuestions);
                break;
            } catch (error) {
                console.warn('[HybridQuiz] AI generation failed:', error);
            }
        }

        if (cfg.useFallback) {
            const remaining = count - results.length;
            const fallbackQuestions = getFallbackQuestions(section, remaining);
            results.push(...fallbackQuestions);
            break;
        }

        attempts++;
    }

    if (results.length === 0 && cfg.useFallback) {
        const emergencyFallback = getFallbackQuestions(section, count);
        console.warn('[HybridQuiz] Using emergency fallback questions');
        return emergencyFallback;
    }

    const deduplicated = results.filter((q, index, self) => 
        index === self.findIndex(t => t.prompt?.substring(0, 50) === q.prompt?.substring(0, 50))
    );

    return deduplicated.slice(0, count);
};

export const generateBatchWithCircuitBreaker = async (
    batches: Array<{
        topic: string;
        section: SectionType;
        count: number;
        skillId?: number;
    }>,
    config: Partial<HybridQuizConfig> = {}
): Promise<CanonicalQuestionV1[]> => {
    const allQuestions: CanonicalQuestionV1[] = [];
    
    for (const batch of batches) {
        try {
            const questions = await generateHybridQuiz(
                batch.topic,
                batch.section,
                batch.count,
                config,
                batch.skillId
            );
            allQuestions.push(...questions);
        } catch (error) {
            console.error(`[HybridQuiz] Batch failed for ${batch.section}:`, error);
            const fallback = getFallbackQuestions(batch.section, batch.count);
            allQuestions.push(...fallback);
        }
    }

    return allQuestions;
};

export const isCircuitBreakerOpen = (): boolean => {
    const status = groqCircuitBreaker.getStatus('quiz_generation');
    return status?.state === 'OPEN';
};

export const getCircuitBreakerStatus = (): Record<string, { state: string; failures: number }> => {
    const allStatuses = groqCircuitBreaker.getAllStatuses() as Record<string, { state: string; failures: number }>;
    return Object.fromEntries(
        Object.entries(allStatuses).map(([key, val]) => [key, { state: val.state, failures: val.failures }])
    );
};
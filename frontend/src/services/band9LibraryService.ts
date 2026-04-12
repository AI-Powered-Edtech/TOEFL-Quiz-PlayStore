import toast from 'react-hot-toast';

import { ModelEssay, EssayFilters, EssayInteraction, VocabularyItem } from '../types';
import { idb } from '../utils/indexedDB';
import { sanitizeText } from '../utils/inputValidation';

/**
 * Band 9 Library Service
 * Uses static data and IndexedDB for local storage
 */

const CACHE_KEY_PREFIX = 'essay_';
const ALL_ESSAYS_KEY = 'all_essays_cache';

const STATIC_ESSAYS: ModelEssay[] = [
    {
        id: 'essay-1',
        topic: 'Technology in Education',
        content: 'Sample essay content...',
        category: 'education',
        task_type: 'Task 2',
        band_score: 9,
        source: 'curated',
        word_count: 0,
        breakdown: {
            task_response: 9,
            coherence_cohesion: 9,
            lexical_resource: 9,
            grammatical_range: 9,
        },
        annotations: [],
        created_at: new Date().toISOString(),
    }
];

export const band9LibraryService = {
    async getEssays(
        filters: EssayFilters = {},
        page: number = 0,
        limit: number = 9
    ): Promise<ModelEssay[]> {
        let essays = [...STATIC_ESSAYS];

        if (filters.category && filters.category !== 'All') {
            essays = essays.filter(e => e.category === filters.category);
        }
        if (filters.task_type) {
            essays = essays.filter(e => e.task_type === filters.task_type);
        }
        if (filters.band_score_min) {
            essays = essays.filter(e => e.band_score >= filters.band_score_min!);
        }
        if (filters.source) {
            essays = essays.filter(e => e.source === filters.source);
        }

        const start = page * limit;
        return essays.slice(start, start + limit);
    },

    async getEssayById(id: string): Promise<ModelEssay | null> {
        return STATIC_ESSAYS.find(e => e.id === id) || null;
    },

    async recordInteraction(interaction: EssayInteraction): Promise<void> {
        console.log('[Band9Library] Interaction recorded:', interaction);
    },

    async getVocabulary(userId: string): Promise<VocabularyItem[]> {
        return [];
    },

    async addVocabulary(userId: string, item: VocabularyItem): Promise<void> {
        console.log('[Band9Library] Vocabulary added:', item);
    },

    async getSavedEssays(userId: string): Promise<ModelEssay[]> {
        const savedIds = JSON.parse(localStorage.getItem('saved_essays') || '[]');
        return STATIC_ESSAYS.filter(e => savedIds.includes(e.id));
    },

    async saveToFavorites(userId: string, essayId: string): Promise<void> {
        const savedIds = JSON.parse(localStorage.getItem('saved_essays') || '[]');
        if (!savedIds.includes(essayId)) {
            savedIds.push(essayId);
            localStorage.setItem('saved_essays', JSON.stringify(savedIds));
        }
    },

    async unsaveFromFavorites(userId: string, essayId: string): Promise<void> {
        const savedIds = JSON.parse(localStorage.getItem('saved_essays') || '[]');
        const filtered = savedIds.filter((id: string) => id !== essayId);
        localStorage.setItem('saved_essays', JSON.stringify(filtered));
    },

    async trackView(userId: string, essayId: string): Promise<void> {
        const views = JSON.parse(localStorage.getItem('essay_views') || '{}');
        views[essayId] = (views[essayId] || 0) + 1;
        localStorage.setItem('essay_views', JSON.stringify(views));
    },

    async generateEssay(topic: string, bandTarget: number): Promise<ModelEssay | null> {
        return {
            id: crypto.randomUUID(),
            topic,
            content: `AI-generated essay on: ${topic}`,
            category: 'general',
            task_type: 'Task 2',
            band_score: bandTarget,
            source: 'ai_generated',
            word_count: 0,
            breakdown: {
                task_response: bandTarget,
                coherence_cohesion: bandTarget,
                lexical_resource: bandTarget,
                grammatical_range: bandTarget,
            },
            annotations: [],
            created_at: new Date().toISOString(),
        };
    }
};

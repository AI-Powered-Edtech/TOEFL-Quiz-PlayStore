import { supabase } from './supabase';
import { ModelEssay, EssayFilters, EssayInteraction, VocabularyItem } from '../types';
import { idb } from '../utils/indexedDB';
import toast from 'react-hot-toast';
import { sanitizeText } from '../utils/inputValidation';

/**
 * Band 9 Library Service
 * Handles essay browsing, generation, user interactions, and vocabulary collection
 */

const CACHE_KEY_PREFIX = 'essay_';
const ALL_ESSAYS_KEY = 'all_essays_cache';

export const band9LibraryService = {
    /**
     * Get model essays with pagination and filtering
     * Implements Network-First strategy with IndexedDB fallback
     */
    async getEssays(
        filters: EssayFilters = {},
        page: number = 0,
        limit: number = 9
    ): Promise<ModelEssay[]> {
        try {
            // 1. Try Network
            let query = supabase
                .from('model_essays')
                .select('*', { count: 'exact' });

            // Apply filters
            if (filters.category && filters.category !== 'All') query = query.eq('category', filters.category);
            if (filters.task_type) query = query.eq('task_type', filters.task_type);
            if (filters.band_score_min) {
                // If band_score_min is a number, use it. If we supported range in UI, we'd handle it here.
                // For now assuming the UI sends appropriate min value.
                query = query.gte('band_score', filters.band_score_min);
            }
            if (filters.source) query = query.eq('source', filters.source);

            if (filters.search) {
                const safeSearch = sanitizeText(filters.search, { maxLength: 100 }).replace(/[^\w\s-]/gi, '');
                if (safeSearch.length > 0) {
                    query = query.or(`topic.ilike.%${safeSearch}%,content.ilike.%${safeSearch}%`);
                }
            }

            const from = page * limit;
            const to = from + limit - 1;

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // 2. Save to Cache (if successful)
            // We only cache the first page of default results (no filters) for offline fallback
            const isDefaultView = !filters.category && !filters.task_type && !filters.band_score_min && !filters.search;

            if (page === 0 && isDefaultView) {
                await idb.put('essays', { id: ALL_ESSAYS_KEY, data: data || [], count: count || 0, timestamp: Date.now() });
            }

            return data || [];

        } catch (error) {
            console.error('[Band9Library] Fetch failed, trying cache:', error);

            // 3. Fallback to Cache
            try {
                // Only fallback for main feed or if we had a meaningful cache strategy
                const cached = await idb.get('essays', ALL_ESSAYS_KEY);
                if (cached && page === 0) {
                    toast('You are offline. Showing cached essays.', { icon: '📡' });
                    return cached.data;
                }
            } catch (cacheError) {
                console.error('[Band9Library] Cache lookup failed:', cacheError);
            }

            toast.error('Failed to load essays. Please check your connection.');
            throw error;
        }
    },
    /**
     * Get single essay by ID
     */
    async getEssayById(id: string): Promise<ModelEssay | null> {
        const { data, error } = await supabase
            .from('model_essays')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching essay:', error);
            return null;
        }

        // Increment view count
        await supabase
            .from('model_essays')
            .update({ views_count: (data.views_count || 0) + 1 })
            .eq('id', id);

        return data;
    },

    /**
     * Search essays by topic or content
     */
    async searchEssays(query: string): Promise<ModelEssay[]> {
        const safeQuery = sanitizeText(query, { maxLength: 100 }).replace(/[^\w\s-]/gi, '');
        if (safeQuery.length === 0) return [];

        const { data, error } = await supabase
            .from('model_essays')
            .select('*')
            .or(`topic.ilike.%${safeQuery}%,content.ilike.%${safeQuery}%`)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error searching essays:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Save essay to database (after AI generation)
     */
    async saveEssay(essay: Omit<ModelEssay, 'id' | 'created_at' | 'views_count' | 'saves_count'>): Promise<ModelEssay | null> {
        const { data, error } = await supabase
            .from('model_essays')
            .insert({
                topic: essay.topic,
                task_type: essay.task_type,
                content: essay.content,
                word_count: essay.word_count,
                band_score: essay.band_score,
                breakdown: essay.breakdown,
                annotations: essay.annotations,
                source: essay.source,
                category: essay.category
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving essay:', error);
            return null;
        }

        return data;
    },

    /**
     * Save essay to user's favorites
     */
    async saveToFavorites(userId: string, essayId: string, notes?: string): Promise<void> {
        const { error } = await supabase
            .from('user_saved_essays')
            .insert({
                user_id: userId,
                essay_id: essayId,
                notes
            });

        if (error) {
            console.error('Error saving to favorites:', error);
            throw error;
        }

        // Increment saves count
        const { data: essay } = await supabase
            .from('model_essays')
            .select('saves_count')
            .eq('id', essayId)
            .single();

        if (essay) {
            await supabase
                .from('model_essays')
                .update({ saves_count: (essay.saves_count || 0) + 1 })
                .eq('id', essayId);
        }
    },

    /**
     * Remove essay from user's favorites
     */
    async unsaveFromFavorites(userId: string, essayId: string): Promise<void> {
        const { error } = await supabase
            .from('user_saved_essays')
            .delete()
            .eq('user_id', userId)
            .eq('essay_id', essayId);

        if (error) {
            console.error('Error removing from favorites:', error);
            throw error;
        }

        // Decrement saves count
        const { data: essay } = await supabase
            .from('model_essays')
            .select('saves_count')
            .eq('id', essayId)
            .single();

        if (essay && essay.saves_count > 0) {
            await supabase
                .from('model_essays')
                .update({ saves_count: essay.saves_count - 1 })
                .eq('id', essayId);
        }
    },

    /**
     * Get user's saved essays
     */
    async getSavedEssays(userId: string): Promise<ModelEssay[]> {
        const { data, error } = await supabase
            .from('user_saved_essays')
            .select('essay_id, model_essays(*)')
            .eq('user_id', userId)
            .order('saved_at', { ascending: false });

        if (error) {
            console.error('Error fetching saved essays:', error);
            throw error;
        }

        return data?.map((item: any) => item.model_essays) || [];
    },

    /**
     * Check if essay is saved by user
     */
    async isEssaySaved(userId: string, essayId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('user_saved_essays')
            .select('essay_id')
            .eq('user_id', userId)
            .eq('essay_id', essayId)
            .single();

        return !error && !!data;
    },

    /**
     * Track essay view interaction
     */
    async trackView(userId: string, essayId: string): Promise<string> {
        const { data, error } = await supabase
            .from('essay_interactions')
            .insert({
                user_id: userId,
                essay_id: essayId,
                viewed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error tracking view:', error);
            throw error;
        }

        return data.id;
    },

    /**
     * Update interaction with time spent and annotations clicked
     */
    async updateInteraction(
        interactionId: string,
        timeSpentMs: number,
        annotationsClicked: string[],
        completed: boolean
    ): Promise<void> {
        const { error } = await supabase
            .from('essay_interactions')
            .update({
                time_spent_ms: timeSpentMs,
                annotations_clicked: annotationsClicked,
                completed
            })
            .eq('id', interactionId);

        if (error) {
            console.error('Error updating interaction:', error);
            throw error;
        }
    },

    /**
     * Get user's reading history
     */
    async getReadingHistory(userId: string, limit: number = 20): Promise<EssayInteraction[]> {
        const { data, error } = await supabase
            .from('essay_interactions')
            .select('*')
            .eq('user_id', userId)
            .order('viewed_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching reading history:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Save vocabulary item
     */
    async saveVocabulary(userId: string, vocab: VocabularyItem): Promise<void> {
        const { error } = await supabase
            .from('collected_vocabulary')
            .insert({
                user_id: userId,
                word: vocab.word,
                definition: vocab.definition,
                cefr_level: vocab.cefr_level,
                example_sentence: vocab.example_sentence,
                source_essay_id: vocab.source_essay_id
            });

        if (error) {
            console.error('Error saving vocabulary:', error);
            throw error;
        }
    },

    /**
     * Get user's collected vocabulary
     */
    async getCollectedVocabulary(userId: string): Promise<VocabularyItem[]> {
        const { data, error } = await supabase
            .from('collected_vocabulary')
            .select('*')
            .eq('user_id', userId)
            .order('collected_at', { ascending: false });

        if (error) {
            console.error('Error fetching vocabulary:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Get vocabulary due for review (SRS)
     */
    async getVocabularyDueForReview(userId: string): Promise<VocabularyItem[]> {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('collected_vocabulary')
            .select('*')
            .eq('user_id', userId)
            .lte('next_review_at', now)
            .order('next_review_at', { ascending: true });

        if (error) {
            console.error('Error fetching due vocabulary:', error);
            throw error;
        }

        return data || [];
    },

    /**
     * Update vocabulary review
     */
    async updateVocabularyReview(vocabId: string, nextReviewAt: string): Promise<void> {
        const { data: vocab } = await supabase
            .from('collected_vocabulary')
            .select('review_count')
            .eq('id', vocabId)
            .single();

        const { error } = await supabase
            .from('collected_vocabulary')
            .update({
                review_count: (vocab?.review_count || 0) + 1,
                next_review_at: nextReviewAt
            })
            .eq('id', vocabId);

        if (error) {
            console.error('Error updating vocabulary review:', error);
            throw error;
        }
    }
};

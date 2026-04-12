import { InlineCorrection } from '../types';

/**
 * Review Draft Storage Utility
 * 
 * Persists review drafts to localStorage to prevent data loss
 * from network errors or accidental navigation.
 */

export interface ReviewDraft {
    submissionId: string;
    scores: {
        taskResponse: number;
        coherence: number;
        lexical: number;
        grammar: number;
    };
    strengths: string;
    weaknesses: string;
    suggestions: string;
    inlineCorrections: InlineCorrection[];
    savedAt: string;
}

const STORAGE_KEY = 'peer_review_drafts';
const MAX_DRAFT_AGE_DAYS = 7; // Auto-cleanup drafts older than 7 days

/**
 * Save a review draft to localStorage
 */
export const saveDraft = (draft: ReviewDraft): void => {
    try {
        const drafts = getAllDrafts();
        drafts[draft.submissionId] = {
            ...draft,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
        console.log('[DraftStorage] Draft saved:', draft.submissionId);
    } catch (error) {
        console.error('[DraftStorage] Save failed:', error);
    }
};

/**
 * Load a review draft from localStorage
 */
export const loadDraft = (submissionId: string): ReviewDraft | null => {
    try {
        const drafts = getAllDrafts();
        const draft = drafts[submissionId];

        if (!draft) {
            return null;
        }

        // Check if draft is too old
        const draftAge = Date.now() - new Date(draft.savedAt).getTime();
        const maxAge = MAX_DRAFT_AGE_DAYS * 24 * 60 * 60 * 1000;

        if (draftAge > maxAge) {
            console.log('[DraftStorage] Draft expired, deleting:', submissionId);
            deleteDraft(submissionId);
            return null;
        }

        console.log('[DraftStorage] Draft loaded:', submissionId);
        return draft;
    } catch (error) {
        console.error('[DraftStorage] Load failed:', error);
        return null;
    }
};

/**
 * Delete a review draft from localStorage
 */
export const deleteDraft = (submissionId: string): void => {
    try {
        const drafts = getAllDrafts();
        delete drafts[submissionId];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
        console.log('[DraftStorage] Draft deleted:', submissionId);
    } catch (error) {
        console.error('[DraftStorage] Delete failed:', error);
    }
};

/**
 * Get all drafts from localStorage
 */
const getAllDrafts = (): Record<string, ReviewDraft> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('[DraftStorage] Get all failed:', error);
        return {};
    }
};

/**
 * Clean up old drafts (older than MAX_DRAFT_AGE_DAYS)
 */
export const cleanupOldDrafts = (): number => {
    try {
        const drafts = getAllDrafts();
        const now = Date.now();
        const maxAge = MAX_DRAFT_AGE_DAYS * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        Object.entries(drafts).forEach(([submissionId, draft]) => {
            const draftAge = now - new Date(draft.savedAt).getTime();
            if (draftAge > maxAge) {
                delete drafts[submissionId];
                deletedCount++;
            }
        });

        if (deletedCount > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
            console.log('[DraftStorage] Cleaned up old drafts:', deletedCount);
        }

        return deletedCount;
    } catch (error) {
        console.error('[DraftStorage] Cleanup failed:', error);
        return 0;
    }
};

/**
 * Get count of saved drafts
 */
export const getDraftCount = (): number => {
    try {
        const drafts = getAllDrafts();
        return Object.keys(drafts).length;
    } catch (error) {
        console.error('[DraftStorage] Get count failed:', error);
        return 0;
    }
};

/**
 * Check if a draft exists for a submission
 */
export const hasDraft = (submissionId: string): boolean => {
    try {
        const drafts = getAllDrafts();
        return submissionId in drafts;
    } catch (error) {
        console.error('[DraftStorage] Has draft check failed:', error);
        return false;
    }
};

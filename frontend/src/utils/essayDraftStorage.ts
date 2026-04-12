/**
 * Essay Draft Storage Utility
 * Handles auto-save and recovery of essay drafts for the submission form
 */



const DRAFT_STORAGE_KEY = 'peer_review_essay_drafts';
const DRAFT_EXPIRY_DAYS = 7;

export interface EssayDraft {
    id: string;
    userId: string;
    essayContent: string;
    prompt: string;
    taskType: 'Task 1' | 'Task 2';
    isAnonymous: boolean;
    wordCount: number;
    savedAt: string;
    expiresAt: string;
}

/**
 * Get all drafts from localStorage
 */
function getAllDrafts(): EssayDraft[] {
    try {
        const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!stored) return [];

        const drafts: EssayDraft[] = JSON.parse(stored);
        return drafts.filter(d => new Date(d.expiresAt) > new Date());
    } catch (error) {
        console.error('[EssayDraft] Failed to load drafts:', error);
        return [];
    }
}

/**
 * Save all drafts to localStorage
 */
function saveAllDrafts(drafts: EssayDraft[]): void {
    try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
        console.error('[EssayDraft] Failed to save drafts:', error);
        // If storage is full, remove oldest drafts
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            const sortedDrafts = drafts.sort((a, b) =>
                new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
            );
            // Keep only the 5 most recent drafts
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(sortedDrafts.slice(0, 5)));
        }
    }
}

/**
 * Save a draft
 */
export function saveEssayDraft(draft: Omit<EssayDraft, 'id' | 'savedAt' | 'expiresAt' | 'wordCount'>): EssayDraft {
    const drafts = getAllDrafts();

    // Check if user already has a draft
    const existingIndex = drafts.findIndex(d => d.userId === draft.userId);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const newDraft: EssayDraft = {
        id: existingIndex >= 0 ? drafts[existingIndex].id : crypto.randomUUID(),
        ...draft,
        wordCount: draft.essayContent.trim().split(/\s+/).filter(w => w.length > 0).length,
        savedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString()
    };

    if (existingIndex >= 0) {
        drafts[existingIndex] = newDraft;
    } else {
        drafts.push(newDraft);
    }

    saveAllDrafts(drafts);
    console.log('[EssayDraft] Draft saved:', newDraft.id);

    return newDraft;
}

/**
 * Load draft for a user
 */
export function loadEssayDraft(userId: string): EssayDraft | null {
    const drafts = getAllDrafts();
    const draft = drafts.find(d => d.userId === userId);

    if (draft) {
        console.log('[EssayDraft] Draft loaded:', draft.id);
    }

    return draft || null;
}

/**
 * Delete a draft
 */
export function deleteEssayDraft(userId: string): void {
    const drafts = getAllDrafts();
    const filtered = drafts.filter(d => d.userId !== userId);
    saveAllDrafts(filtered);
    console.log('[EssayDraft] Draft deleted for user:', userId);
}

/**
 * Clear all expired drafts
 */
export function cleanupExpiredDrafts(): number {
    const drafts = getAllDrafts();
    const now = new Date();
    const validDrafts = drafts.filter(d => new Date(d.expiresAt) > now);

    const removedCount = drafts.length - validDrafts.length;
    if (removedCount > 0) {
        saveAllDrafts(validDrafts);
        console.log('[EssayDraft] Cleaned up', removedCount, 'expired drafts');
    }

    return removedCount;
}

/**
 * Get draft count for a user
 */
export function getDraftCount(userId: string): number {
    const drafts = getAllDrafts();
    return drafts.filter(d => d.userId === userId).length;
}

/**
 * Check if user has unsaved draft
 */
export function hasUnsavedDraft(userId: string, currentContent: string): boolean {
    const draft = loadEssayDraft(userId);
    if (!draft) return false;

    // Check if draft is different from current content
    return draft.essayContent !== currentContent && draft.essayContent.trim().length > 0;
}

/**
 * Auto-save hook interval (in milliseconds)
 */
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

/**
 * Get time since last save
 */
export function getTimeSinceLastSave(userId: string): number | null {
    const draft = loadEssayDraft(userId);
    if (!draft) return null;

    return Date.now() - new Date(draft.savedAt).getTime();
}

/**
 * Format time since last save for display
 */
export function formatTimeSinceLastSave(userId: string): string {
    const timeMs = getTimeSinceLastSave(userId);
    if (timeMs === null) return '';

    const seconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

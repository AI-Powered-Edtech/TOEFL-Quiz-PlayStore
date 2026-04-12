/**
 * Offline Writing Service
 * Handles offline caching of tasks and queuing submissions for sync
 */

import { IntegratedWritingTask, IntegratedWritingSession } from '../types';

// Use native IndexedDB for offline storage (no external dependencies)
const DB_NAME = 'toefl_quiz_offline';
const DB_VERSION = 1;
const STORES = {
    CACHED_TASKS: 'cached_tasks',
    PENDING_SUBMISSIONS: 'pending_submissions',
    SYNC_LOG: 'sync_log'
};

let db: IDBDatabase | null = null;

// Initialize IndexedDB
async function initDB(): Promise<IDBDatabase> {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Create object stores
            if (!database.objectStoreNames.contains(STORES.CACHED_TASKS)) {
                database.createObjectStore(STORES.CACHED_TASKS, { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains(STORES.PENDING_SUBMISSIONS)) {
                database.createObjectStore(STORES.PENDING_SUBMISSIONS, { keyPath: 'id', autoIncrement: true });
            }
            if (!database.objectStoreNames.contains(STORES.SYNC_LOG)) {
                database.createObjectStore(STORES.SYNC_LOG, { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Generic store operations
async function addToStore<T>(storeName: string, data: T): Promise<void> {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function putToStore<T>(storeName: string, data: T): Promise<void> {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function clearStore(storeName: string): Promise<void> {
    const database = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Cached task with metadata
interface CachedTask extends IntegratedWritingTask {
    cachedAt: number;
}

// Queued submission with metadata
interface QueuedSubmission {
    id?: number;
    session: Omit<IntegratedWritingSession, 'id' | 'created_at'>;
    queuedAt: number;
    retryCount: number;
}

export const offlineWritingService = {
    /**
     * Check if the app is online
     */
    isOnline(): boolean {
        return navigator.onLine;
    },

    /**
     * Cache a generated task for offline use
     */
    async cacheTask(task: IntegratedWritingTask): Promise<void> {
        try {
            const cached: CachedTask = {
                ...task,
                cachedAt: Date.now()
            };

            await putToStore(STORES.CACHED_TASKS, cached);

            // Keep only the 5 most recent tasks
            const allTasks = await this.getCachedTasks();
            if (allTasks.length > 5) {
                const sorted = allTasks.sort((a, b) => b.cachedAt - a.cachedAt);
                const toDelete = sorted.slice(5);
                for (const task of toDelete) {
                    await deleteFromStore(STORES.CACHED_TASKS, task.id);
                }
            }

            console.log('[Offline] Task cached:', task.id);
        } catch (e) {
            console.error('[Offline] Failed to cache task:', e);
        }
    },

    /**
     * Get all cached tasks
     */
    async getCachedTasks(): Promise<CachedTask[]> {
        try {
            return await getAllFromStore<CachedTask>(STORES.CACHED_TASKS);
        } catch (e) {
            console.error('[Offline] Failed to get cached tasks:', e);
            return [];
        }
    },

    /**
     * Get a random cached task for offline practice
     */
    async getRandomCachedTask(): Promise<IntegratedWritingTask | null> {
        const tasks = await this.getCachedTasks();
        if (tasks.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * tasks.length);
        return tasks[randomIndex];
    },

    /**
     * Queue a submission for later sync
     */
    async queueSubmission(
        session: Omit<IntegratedWritingSession, 'id' | 'created_at'>
    ): Promise<void> {
        try {
            const queued: QueuedSubmission = {
                session,
                queuedAt: Date.now(),
                retryCount: 0
            };

            await addToStore(STORES.PENDING_SUBMISSIONS, queued);
            console.log('[Offline] Submission queued');
        } catch (e) {
            console.error('[Offline] Failed to queue submission:', e);
            throw e;
        }
    },

    /**
     * Get all pending submissions
     */
    async getPendingSubmissions(): Promise<QueuedSubmission[]> {
        try {
            return await getAllFromStore<QueuedSubmission>(STORES.PENDING_SUBMISSIONS);
        } catch (e) {
            console.error('[Offline] Failed to get pending submissions:', e);
            return [];
        }
    },

    /**
     * Get count of pending submissions
     */
    async getPendingCount(): Promise<number> {
        const pending = await this.getPendingSubmissions();
        return pending.length;
    },

    /**
     * Sync all pending submissions when online
     * Returns number of successfully synced submissions
     */
    async syncPendingSubmissions(
        saveFunction: (session: Omit<IntegratedWritingSession, 'id' | 'created_at'>) => Promise<void>
    ): Promise<number> {
        if (!this.isOnline()) {
            console.log('[Offline] Cannot sync - not online');
            return 0;
        }

        const pending = await this.getPendingSubmissions();
        let synced = 0;

        for (const item of pending) {
            try {
                await saveFunction(item.session);
                if (item.id) {
                    await deleteFromStore(STORES.PENDING_SUBMISSIONS, item.id);
                }
                synced++;
                console.log('[Offline] Synced submission:', item.id);
            } catch (e) {
                console.error('[Offline] Sync failed for submission:', item.id, e);
                // Increment retry count
                if (item.id) {
                    await putToStore(STORES.PENDING_SUBMISSIONS, {
                        ...item,
                        retryCount: item.retryCount + 1
                    });
                }
            }
        }

        return synced;
    },

    /**
     * Clear all cached data
     */
    async clearAll(): Promise<void> {
        await clearStore(STORES.CACHED_TASKS);
        await clearStore(STORES.PENDING_SUBMISSIONS);
        await clearStore(STORES.SYNC_LOG);
        console.log('[Offline] All offline data cleared');
    },

    /**
     * Register sync on online event
     */
    registerOnlineSync(
        saveFunction: (session: Omit<IntegratedWritingSession, 'id' | 'created_at'>) => Promise<void>
    ): () => void {
        const handleOnline = async () => {
            console.log('[Offline] Back online - syncing...');
            const synced = await this.syncPendingSubmissions(saveFunction);
            if (synced > 0) {
                console.log(`[Offline] Synced ${synced} pending submissions`);
            }
        };

        window.addEventListener('online', handleOnline);

        // Return cleanup function
        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }
};

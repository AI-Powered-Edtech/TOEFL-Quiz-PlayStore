import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SyncQueueDB extends DBSchema {
    mutations: {
        key: number;
        value: {
            id?: number;
            type: string;
            payload: any;
            timestamp: string;
            userId?: string;
        };
        indexes: { 'by-timestamp': string };
    };
}

class SyncQueueService {
    private dbPromise: Promise<IDBPDatabase<SyncQueueDB>> | null = null;
    private isSyncing = false;

    constructor() {
        if (typeof window !== 'undefined') {
            this.dbPromise = openDB<SyncQueueDB>('streamquiz-sync-queue', 1, {
                upgrade(db) {
                    const store = db.createObjectStore('mutations', {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    store.createIndex('by-timestamp', 'timestamp');
                },
            });

            // Listen for online event to flush queue
            window.addEventListener('online', () => {
                console.log('[SyncQueue] Network is online. Flushing queue...');
                this.flushQueue();
            });
        }
    }

    /**
     * Queues a mutation to be sent when online
     */
    async enqueue(type: string, payload: any, userId?: string): Promise<void> {
        if (!this.dbPromise) return;

        try {
            const db = await this.dbPromise;
            await db.add('mutations', {
                type,
                payload,
                timestamp: new Date().toISOString(),
                userId
            });
            console.log(`[SyncQueue] Enqueued mutation: ${type}`);

            // Try to flush immediately if we think we're online
            if (navigator.onLine) {
                this.flushQueue();
            }
        } catch (error) {
            console.error('[SyncQueue] Failed to enqueue mutation:', error);
        }
    }

    /**
     * Gets all pending mutations
     */
    async getPendingMutations() {
        if (!this.dbPromise) return [];
        try {
            const db = await this.dbPromise;
            return await db.getAllFromIndex('mutations', 'by-timestamp');
        } catch (error) {
            console.error('[SyncQueue] Failed to get pending mutations', error);
            return [];
        }
    }

    /**
     * Removes a mutation from the queue after successful sync
     */
    async dequeue(id: number) {
        if (!this.dbPromise) return;
        try {
            const db = await this.dbPromise;
            await db.delete('mutations', id);
        } catch (error) {
            console.error(`[SyncQueue] Failed to dequeue mutation ${id}:`, error);
        }
    }

    /**
     * Attempts to flush all queued mutations to the backend
     */
    async flushQueue(): Promise<void> {
        if (!this.dbPromise || !navigator.onLine || this.isSyncing) {
            return;
        }

        try {
            this.isSyncing = true;
            const pending = await this.getPendingMutations();

            if (pending.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`[SyncQueue] Flushing ${pending.length} pending mutations...`);

            // Detailed imports for actually executing the mutations will depend on the `type`
            for (const item of pending) {
                if (!item.id) continue;

                let success = false;
                try {
                    // Route the mutation payload to the correct service based on `type`
                    switch (item.type) {
                        case 'saveQuizResult':
                            // Dynamically importing to avoid circular dependencies if needed
                            const { saveQuizResult } = await import('./historyService');
                            await saveQuizResult(item.payload, item.userId);
                            success = true;
                            break;



                        default:
                            console.warn(`[SyncQueue] Unknown mutation type: ${item.type}`);
                            // Consider unknown types as processed to avoid blocking the queue forever
                            success = true;
                            break;
                    }
                } catch (error) {
                    console.error(`[SyncQueue] Failed to process mutation ${item.id} (${item.type}):`, error);
                    // Leave it in the queue to try again later
                }

                if (success) {
                    await this.dequeue(item.id);
                    console.log(`[SyncQueue] Successfully processed and dequeued mutation ${item.id} (${item.type})`);
                }
            }
        } catch (error) {
            console.error('[SyncQueue] Fatal error during flushQueue:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Clears the entire queue (useful for logout)
     */
    async clearQueue() {
        if (!this.dbPromise) return;
        try {
            const db = await this.dbPromise;
            await db.clear('mutations');
            console.log('[SyncQueue] Queue cleared.');
        } catch (error) {
            console.error('[SyncQueue] Failed to clear queue', error);
        }
    }
}

export const syncQueueService = new SyncQueueService();

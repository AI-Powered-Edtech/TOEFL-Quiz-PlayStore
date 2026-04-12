import { supabase } from './supabase';

// Offline Queue Service
// Stores failed operations in IndexedDB for retry when online

interface QueuedOperation {
    id: string;
    type: 'log' | 'metric' | 'session';
    payload: any;
    timestamp: number;
    retries: number;
}

const DB_NAME = 'toefl_quiz_offline';
const DB_VERSION = 1;
const STORE_NAME = 'queue';
const MAX_QUEUE_SIZE = 1000;
const MAX_RETRIES = 3;

class OfflineQueue {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.init();

        // Listen for online event to process queue
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('[OfflineQueue] Connection restored, processing queue');
                this.processQueue();
            });
        }
    }

    private async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                console.warn('[OfflineQueue] IndexedDB not available');
                resolve();
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[OfflineQueue] Failed to open database');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[OfflineQueue] Database initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    console.log('[OfflineQueue] Object store created');
                }
            };
        });

        return this.initPromise;
    }

    /**
     * Enqueue an operation for later processing
     */
    async enqueue(operation: Omit<QueuedOperation, 'id' | 'retries'>): Promise<void> {
        await this.init();

        if (!this.db) {
            console.warn('[OfflineQueue] Database not available, operation dropped');
            return;
        }

        // Check queue size first
        const size = await this.getQueueSize();
        if (size >= MAX_QUEUE_SIZE) {
            console.warn('[OfflineQueue] Queue full, dropping oldest operation');
            await this.removeOldest();
        }

        const queuedOp: QueuedOperation = {
            ...operation,
            id: `${operation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            retries: 0
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(queuedOp);

            request.onsuccess = () => {
                console.log(`[OfflineQueue] Enqueued ${operation.type} operation`);
                resolve();
            };

            request.onerror = () => {
                console.error('[OfflineQueue] Failed to enqueue:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Process all queued operations
     */
    async processQueue(): Promise<void> {
        await this.init();

        if (!this.db) return;

        const operations = await this.getAllOperations();
        console.log(`[OfflineQueue] Processing ${operations.length} operations`);

        for (const op of operations) {
            try {
                // Apply exponential backoff delay for retried operations
                if (op.retries > 0) {
                    const delay = Math.min(1000 * Math.pow(2, op.retries - 1), 30000);
                    console.log(`[OfflineQueue] Waiting ${delay}ms before retry #${op.retries} for ${op.id}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                await this.processOperation(op);
                await this.remove(op.id);
            } catch (error) {
                console.error(`[OfflineQueue] Failed to process ${op.type}:`, error);

                // Increment retry count
                if (op.retries < MAX_RETRIES) {
                    await this.updateRetries(op.id, op.retries + 1);
                } else {
                    console.warn(`[OfflineQueue] Max retries reached, dropping operation ${op.id}`);
                    await this.remove(op.id);
                }
            }
        }
    }

    private async processOperation(op: QueuedOperation): Promise<void> {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase credentials not available');
        }

        let endpoint = '';

        switch (op.type) {
            case 'log':
                endpoint = `${supabaseUrl}/rest/v1/app_logs`;
                break;
            case 'metric':
                endpoint = `${supabaseUrl}/rest/v1/app_metrics`;
                break;
            case 'session':
                endpoint = `${supabaseUrl}/rest/v1/mason_sessions`;
                break;
            default:
                throw new Error(`Unknown operation type: ${op.type}`);
        }

        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || supabaseKey;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(op.payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        console.log(`[OfflineQueue] Successfully processed ${op.type}`);
    }

    private async getAllOperations(): Promise<QueuedOperation[]> {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getQueueSize(): Promise<number> {
        if (!this.db) return 0;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    private async remove(id: string): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    private async removeOldest(): Promise<void> {
        if (!this.db) return;

        const operations = await this.getAllOperations();
        if (operations.length === 0) return;

        // Sort by timestamp and remove oldest
        operations.sort((a, b) => a.timestamp - b.timestamp);
        await this.remove(operations[0].id);
    }

    private async updateRetries(id: string, retries: number): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const op = getRequest.result;
                if (op) {
                    op.retries = retries;
                    const putRequest = store.put(op);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async clearQueue(): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('[OfflineQueue] Queue cleared');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }
}

export const offlineQueue = new OfflineQueue();

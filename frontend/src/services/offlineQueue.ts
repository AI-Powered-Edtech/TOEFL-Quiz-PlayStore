// Offline Queue Service
// Stores failed operations for retry when online

interface QueuedOperation {
    id: string;
    type: 'log' | 'metric' | 'session';
    payload: any;
    timestamp: number;
    retries: number;
}

const QUEUE_KEY = 'offline_queue';
const MAX_RETRIES = 3;

class OfflineQueue {
    private processTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('[OfflineQueue] Connection restored');
                this.processQueue();
            });
        }
    }

    async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): Promise<void> {
        const queue = this.getQueue();
        queue.push({
            ...operation,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            retries: 0
        });
        if (queue.length > 1000) queue.splice(0, queue.length - 1000);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }

    private getQueue(): QueuedOperation[] {
        try {
            return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
        } catch { return []; }
    }

    private saveQueue(queue: QueuedOperation[]): void {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }

    async processQueue(): Promise<void> {
        if (this.processTimer) return;
        
        this.processTimer = setTimeout(async () => {
            this.processTimer = null;
            
            if (!navigator.onLine) return;

            const queue = this.getQueue();
            const remaining: QueuedOperation[] = [];

            for (const op of queue) {
                try {
                    await this.processOperation(op);
                } catch {
                    if (op.retries < MAX_RETRIES) {
                        op.retries++;
                        remaining.push(op);
                    }
                }
            }

            this.saveQueue(remaining);
            console.log(`[OfflineQueue] Processed. Remaining: ${remaining.length}`);
        }, 1000);
    }

    private async processOperation(op: QueuedOperation): Promise<void> {
        console.log(`[OfflineQueue] Processing ${op.type} operation`);
    }

    clear(): void {
        localStorage.removeItem(QUEUE_KEY);
    }

    getPendingCount(): number {
        return this.getQueue().length;
    }

    getQueueSize(): number {
        return this.getQueue().length;
    }
}

export const offlineQueue = new OfflineQueue();
export default offlineQueue;

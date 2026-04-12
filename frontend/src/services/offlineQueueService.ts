import { v4 as uuidv4 } from 'uuid';

interface QueuedOperation {
  id: string;
  service: string;
  method: string;
  params: Record<string, unknown>;
  priority: number;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

const DB_NAME = 'offline-queue';
const STORE_NAME = 'operations';

class OfflineQueueService {
  private db: IDBDatabase | null = null;
  private isProcessing = false;
  private isOnline = navigator.onLine;
  private onlineHandler: () => void;
  private offlineHandler: () => void;

  constructor() {
    this.onlineHandler = () => {
      this.isOnline = true;
      this.processQueue();
    };
    this.offlineHandler = () => {
      this.isOnline = false;
    };

    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);

    this.initDB();
  }

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async enqueue(
    operation: Omit<QueuedOperation, 'id' | 'createdAt' | 'attempts'>
  ): Promise<string> {
    const db = this.ensureDB();
    const id = uuidv4();
    const queuedOperation: QueuedOperation = {
      ...operation,
      id,
      createdAt: Date.now(),
      attempts: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queuedOperation);

      request.onsuccess = () => {
        resolve(id);
        if (this.isOnline) {
          this.processQueue();
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to enqueue operation'));
      };
    });
  }

  async dequeue(count: number = 1): Promise<QueuedOperation[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => {
        const results = request.result
          .filter((op: QueuedOperation) => op.attempts < RETRY_CONFIG.maxAttempts)
          .sort((a: QueuedOperation, b: QueuedOperation) => {
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return a.createdAt - b.createdAt;
          })
          .slice(0, count);
        resolve(results);
      };

      request.onerror = () => {
        reject(new Error('Failed to dequeue operations'));
      };
    });
  }

  async markComplete(id: string): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to mark operation as complete'));
      };
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result as QueuedOperation;
        if (operation) {
          operation.attempts += 1;
          operation.lastError = error;

          const updateRequest = store.put(operation);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update operation'));
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get operation for update'));
      };
    });
  }

  async getPending(): Promise<QueuedOperation[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result.filter(
          (op: QueuedOperation) => op.attempts < RETRY_CONFIG.maxAttempts
        );
        resolve(results);
      };

      request.onerror = () => {
        reject(new Error('Failed to get pending operations'));
      };
    });
  }

  async clear(): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear queue'));
      };
    });
  }

  async processQueue(): Promise<void> {
    if (!this.isOnline || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const pendingOps = await this.dequeue(5);

      for (const operation of pendingOps) {
        if (!this.isOnline) {
          break;
        }

        try {
          await this.executeOperation(operation);
          await this.markComplete(operation.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await this.markFailed(operation.id, errorMessage);

          if (operation.attempts + 1 >= RETRY_CONFIG.maxAttempts) {
            console.error(`Operation ${operation.id} failed after max attempts`);
          } else {
            const delay = this.calculateBackoff(operation.attempts + 1);
            await this.delay(delay);
          }
        }
      }
    } finally {
      this.isProcessing = false;

      const remaining = await this.getPending();
      if (remaining.length > 0 && this.isOnline) {
        this.processQueue();
      }
    }
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    const serviceMap: Record<string, unknown> = {
      quiz: () => import('./quizService'),
      auth: () => import('./authService'),
      progress: () => import('./progressService'),
    };

    const serviceLoader = serviceMap[operation.service];
    if (!serviceLoader) {
      throw new Error(`Unknown service: ${operation.service}`);
    }

    const module = await serviceLoader();
    const service = module[operation.service];
    if (!service || typeof service[operation.method] !== 'function') {
      throw new Error(`Unknown method: ${operation.service}.${operation.method}`);
    }

    await service[operation.method](...Object.values(operation.params));
  }

  private calculateBackoff(attempt: number): number {
    const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
    return Math.min(delay, RETRY_CONFIG.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  destroy(): void {
    window.removeEventListener('online', this.onlineHandler);
    window.removeEventListener('offline', this.offlineHandler);
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

const offlineQueue = new OfflineQueueService();

export { offlineQueue, OfflineQueueService, QueuedOperation, RETRY_CONFIG };

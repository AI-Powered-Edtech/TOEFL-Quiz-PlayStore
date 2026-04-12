export class Mutex {
    private locked = false;
    private waitQueue: Array<{
        resolve: () => void;
        reject: (error: Error) => void;
    }> = [];

    async acquire(): Promise<() => void> {
        if (!this.locked) {
            this.locked = true;
            return () => {
                this.release();
            };
        }

        return new Promise<() => void>((resolve, reject) => {
            this.waitQueue.push({
                resolve: () => {
                    resolve(() => {
                        this.release();
                    });
                },
                reject
            });
        });
    }

    private release(): void {
        const next = this.waitQueue.shift();
        if (next) {
            next.resolve();
        } else {
            this.locked = false;
        }
    }

    async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
        const release = await this.acquire();
        try {
            return await fn();
        } finally {
            release();
        }
    }

    isLocked(): boolean {
        return this.locked;
    }
}

export class MutexRegistry {
    private mutexes = new Map<string, Mutex>();

    getMutex(key: string): Mutex {
        let mutex = this.mutexes.get(key);
        if (!mutex) {
            mutex = new Mutex();
            this.mutexes.set(key, mutex);
        }
        return mutex;
    }

    clearAll(): void {
        this.mutexes.clear();
    }
}

export const mutexRegistry = new MutexRegistry();
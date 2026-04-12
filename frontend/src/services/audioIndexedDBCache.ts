/**
 * IndexedDB Audio Cache — Persistent storage for synthesized audio blobs.
 *
 * Keyed by transcript hash + voice config. Survives page reloads,
 * eliminating re-synthesis for previously generated audio.
 *
 * LRU eviction with configurable max entries (default 200).
 */

const DB_NAME = 'toefl_audio_cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio_blobs';

interface CachedAudioEntry {
    key: string;          // transcript hash
    blob: Blob;           // WAV audio blob
    sampleRate: number;
    sizeBytes: number;
    createdAt: number;
    lastAccessedAt: number;
}

// ─── DB Management ───────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    store.createIndex('lastAccessedAt', 'lastAccessedAt');
                    store.createIndex('createdAt', 'createdAt');
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                console.warn('[IDB Cache] Failed to open:', request.error);
                reject(request.error);
            };
        } catch (err) {
            // IndexedDB not available (e.g., private browsing on some browsers)
            console.warn('[IDB Cache] IndexedDB not available:', err);
            reject(err);
        }
    });

    return dbPromise;
}

// ─── Hash Function ───────────────────────────────────────────────────────────

/**
 * FNV-1a hash for transcript → stable cache key
 */
export function hashTranscript(transcript: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < transcript.length; i++) {
        hash ^= transcript.charCodeAt(i);
        hash = (hash * 0x01000193) | 0;
    }
    return `idb_${Math.abs(hash).toString(36)}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

const MAX_ENTRIES = 200;

/**
 * Get a cached audio blob by transcript hash.
 * Updates lastAccessedAt for LRU tracking.
 */
export async function getFromIDB(transcript: string): Promise<Blob | null> {
    try {
        const db = await openDB();
        const key = hashTranscript(transcript);

        return new Promise<Blob | null>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                const entry = request.result as CachedAudioEntry | undefined;
                if (!entry) {
                    resolve(null);
                    return;
                }

                // Update access time (LRU)
                entry.lastAccessedAt = Date.now();
                store.put(entry);

                resolve(entry.blob);
            };

            request.onerror = () => {
                console.warn('[IDB Cache] Get failed:', request.error);
                resolve(null);
            };
        });
    } catch {
        return null;
    }
}

/**
 * Store an audio blob in IndexedDB.
 * Triggers LRU eviction if over MAX_ENTRIES.
 */
export async function putInIDB(transcript: string, blob: Blob): Promise<void> {
    try {
        const db = await openDB();
        const key = hashTranscript(transcript);
        const entry: CachedAudioEntry = {
            key,
            blob,
            sampleRate: 22050,
            sizeBytes: blob.size,
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
        };

        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // Evict if over limit
        await evictIfNeeded(db);

        console.log(`[IDB Cache] Stored ${(blob.size / 1024).toFixed(1)}KB`);
    } catch (err) {
        console.warn('[IDB Cache] Put failed:', err);
    }
}

/**
 * Check if a transcript exists in IndexedDB (without loading the blob).
 */
export async function hasInIDB(transcript: string): Promise<boolean> {
    try {
        const db = await openDB();
        const key = hashTranscript(transcript);

        return new Promise<boolean>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.count(IDBKeyRange.only(key));
            request.onsuccess = () => resolve(request.result > 0);
            request.onerror = () => resolve(false);
        });
    } catch {
        return false;
    }
}

/**
 * Get total number of cached entries.
 */
export async function getIDBCacheSize(): Promise<number> {
    try {
        const db = await openDB();
        return new Promise<number>((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(0);
        });
    } catch {
        return 0;
    }
}

/**
 * Clear all cached audio from IndexedDB.
 */
export async function clearIDBCache(): Promise<void> {
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        console.log('[IDB Cache] Cleared');
    } catch (err) {
        console.warn('[IDB Cache] Clear failed:', err);
    }
}

// ─── LRU Eviction ────────────────────────────────────────────────────────────

async function evictIfNeeded(db: IDBDatabase): Promise<void> {
    return new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const countReq = store.count();

        countReq.onsuccess = () => {
            const count = countReq.result;
            if (count <= MAX_ENTRIES) {
                resolve();
                return;
            }

            // Delete oldest by lastAccessedAt
            const toDelete = count - MAX_ENTRIES;
            const index = store.index('lastAccessedAt');
            const cursor = index.openCursor();
            let deleted = 0;

            cursor.onsuccess = () => {
                const c = cursor.result;
                if (c && deleted < toDelete) {
                    store.delete(c.primaryKey);
                    deleted++;
                    c.continue();
                } else {
                    console.log(`[IDB Cache] Evicted ${deleted} entries (LRU)`);
                    resolve();
                }
            };

            cursor.onerror = () => resolve();
        };

        countReq.onerror = () => resolve();
    });
}

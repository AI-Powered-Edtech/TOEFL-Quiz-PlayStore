import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { getGuestUserId } from '../utils/guestUser';

interface GuestProgress {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

interface OfflineSyncDB extends DBSchema {
  guest_progress: {
    key: string;
    value: GuestProgress;
    indexes: { 'by-timestamp': number; 'by-type': string };
  };
}

class OfflineSyncService {
  private dbPromise: Promise<IDBPDatabase<OfflineSyncDB>>;

  constructor() {
    this.dbPromise = openDB<OfflineSyncDB>('toefl-offline-sync', 1, {
      upgrade(db) {
        const store = db.createObjectStore('guest_progress', {
          keyPath: 'id',
        });
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-type', 'type');
      },
    });
  }

  async saveProgress(type: string, data: any): Promise<void> {
    const db = await this.dbPromise;
    const guestId = getGuestUserId();
    const id = `${guestId}_${type}_${Date.now()}`;
    
    await db.put('guest_progress', {
      id,
      type,
      data,
      timestamp: Date.now(),
    });
  }

  async getAllProgress(): Promise<GuestProgress[]> {
    const db = await this.dbPromise;
    return db.getAllFromIndex('guest_progress', 'by-timestamp');
  }

  async clearAllProgress(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('guest_progress');
  }

  async migrateGuestDataToBackend(tokenOverride?: string): Promise<boolean> {
    try {
      const allProgress = await this.getAllProgress();
      if (allProgress.length === 0) return true;

      const token = tokenOverride || localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      if (!token) return false;

      const response = await fetch('/api/guest/merge-offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          progress: allProgress,
          guest_id: getGuestUserId()
        }),
      });

      if (response.ok) {
        await this.clearAllProgress();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to migrate offline data:', error);
      return false;
    }
  }
}

export const offlineSyncService = new OfflineSyncService();

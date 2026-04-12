import { IELTSWritingTask } from '../types';

/**
 * Essay Task Cache Service
 * Caches AI-generated tasks for offline use and faster loading
 */

const CACHE_KEY = 'ielts_task_cache';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHED_PER_TYPE = 5;

interface CachedTask {
  task: IELTSWritingTask;
  cachedAt: number;
}

interface CacheStore {
  task1: CachedTask[];
  task2: CachedTask[];
}

/**
 * Get empty cache structure
 */
const getEmptyCache = (): CacheStore => ({
  task1: [],
  task2: []
});

export const essayTaskCache = {
  /**
   * Cache a task for offline use
   * @param task - The task to cache
   */
  cacheTask: (task: IELTSWritingTask): void => {
    try {
      const existing = essayTaskCache.getCachedTasks();
      const key = task.type === 'Task 1' ? 'task1' : 'task2';
      
      // Create cached entry
      const cached: CachedTask = {
        task: { ...task },
        cachedAt: Date.now()
      };
      
      // Add to front of array (most recent first)
      if (!existing[key]) existing[key] = [];
      
      // Check for duplicate (same prompt)
      const isDuplicate = existing[key].some(
        c => c.task.prompt === task.prompt
      );
      
      if (!isDuplicate) {
        existing[key].unshift(cached);
        
        // Keep max N tasks per type
        existing[key] = existing[key].slice(0, MAX_CACHED_PER_TYPE);
        
        localStorage.setItem(CACHE_KEY, JSON.stringify(existing));
        console.log(`[TaskCache] Cached ${task.type} task, total cached: ${existing[key].length}`);
      }
    } catch (error) {
      console.error('[TaskCache] Failed to cache task:', error);
    }
  },

  /**
   * Get all cached tasks
   * @returns CacheStore with task1 and task2 arrays
   */
  getCachedTasks: (): CacheStore => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return getEmptyCache();
      
      const parsed = JSON.parse(raw);
      
      // Validate structure
      if (!parsed.task1 || !parsed.task2) {
        return getEmptyCache();
      }
      
      return parsed as CacheStore;
    } catch (error) {
      console.error('[TaskCache] Failed to parse cache:', error);
      return getEmptyCache();
    }
  },

  /**
   * Get a cached task (non-expired)
   * @param type - Task 1 or Task 2
   * @returns A valid cached task or null
   */
  getCachedTask: (type: 'Task 1' | 'Task 2'): IELTSWritingTask | null => {
    try {
      const key = type === 'Task 1' ? 'task1' : 'task2';
      const cached = essayTaskCache.getCachedTasks()[key];
      
      if (!cached || cached.length === 0) {
        console.log(`[TaskCache] No cached ${type} tasks available`);
        return null;
      }
      
      // Find non-expired task
      const now = Date.now();
      const validTask = cached.find(c => 
        (now - c.cachedAt) < CACHE_EXPIRY_MS
      );
      
      if (validTask) {
        console.log(`[TaskCache] Found valid cached ${type} task`);
        return { ...validTask.task };
      }
      
      console.log(`[TaskCache] All cached ${type} tasks expired`);
      return null;
    } catch (error) {
      console.error('[TaskCache] Failed to get cached task:', error);
      return null;
    }
  },

  /**
   * Get a random cached task (for variety)
   * @param type - Task 1 or Task 2
   * @returns A random valid cached task or null
   */
  getRandomCachedTask: (type: 'Task 1' | 'Task 2'): IELTSWritingTask | null => {
    try {
      const key = type === 'Task 1' ? 'task1' : 'task2';
      const cached = essayTaskCache.getCachedTasks()[key];
      
      if (!cached || cached.length === 0) return null;
      
      // Filter non-expired tasks
      const now = Date.now();
      const validTasks = cached.filter(c => 
        (now - c.cachedAt) < CACHE_EXPIRY_MS
      );
      
      if (validTasks.length === 0) return null;
      
      // Return random task
      const randomIndex = Math.floor(Math.random() * validTasks.length);
      return { ...validTasks[randomIndex].task };
    } catch (error) {
      console.error('[TaskCache] Failed to get random cached task:', error);
      return null;
    }
  },

  /**
   * Clear expired cache entries
   */
  clearExpired: (): void => {
    try {
      const cached = essayTaskCache.getCachedTasks();
      const now = Date.now();
      let cleared = 0;
      
      Object.keys(cached).forEach(key => {
        const keyTyped = key as keyof CacheStore;
        const before = cached[keyTyped].length;
        cached[keyTyped] = cached[keyTyped].filter(c => 
          (now - c.cachedAt) < CACHE_EXPIRY_MS
        );
        cleared += before - cached[keyTyped].length;
      });
      
      if (cleared > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        console.log(`[TaskCache] Cleared ${cleared} expired tasks`);
      }
    } catch (error) {
      console.error('[TaskCache] Failed to clear expired:', error);
    }
  },

  /**
   * Clear all cached tasks
   */
  clearAll: (): void => {
    try {
      localStorage.removeItem(CACHE_KEY);
      console.log('[TaskCache] Cleared all cached tasks');
    } catch (error) {
      console.error('[TaskCache] Failed to clear cache:', error);
    }
  },

  /**
   * Get cache statistics
   */
  getStats: (): { task1Count: number; task2Count: number; oldestAge: number } => {
    const cached = essayTaskCache.getCachedTasks();
    const now = Date.now();
    
    const allTasks = [...cached.task1, ...cached.task2];
    const oldestAge = allTasks.length > 0
      ? Math.max(...allTasks.map(c => now - c.cachedAt))
      : 0;
    
    return {
      task1Count: cached.task1.length,
      task2Count: cached.task2.length,
      oldestAge
    };
  },

  /**
   * Check if cache has valid tasks
   */
  hasValidCache: (type: 'Task 1' | 'Task 2'): boolean => {
    return essayTaskCache.getCachedTask(type) !== null;
  }
};

// Auto-cleanup on module load
if (typeof window !== 'undefined') {
  essayTaskCache.clearExpired();
}

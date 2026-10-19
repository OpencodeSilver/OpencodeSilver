export interface CacheClearResult {
  clearedLocalStorageKeys: number;
  clearedSessionStorageKeys: number;
  clearedIndexedDBs: number;
  success: boolean;
}

/**
 * Safely clears non-essential client-side caches and temporary states.
 */
export async function clearTransientCaches(): Promise<CacheClearResult> {
  let clearedLocalStorageKeys = 0;
  let clearedSessionStorageKeys = 0;
  let clearedIndexedDBs = 0;

  // Clear SessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      clearedSessionStorageKeys = window.sessionStorage.length;
      window.sessionStorage.clear();
    } catch {
      // ignore
    }
  }

  // Clear non-critical LocalStorage items (preserving user settings and tokens)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const keysToClear: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith('cache_') || key.startsWith('tmp_') || key.includes('preview_cache'))) {
          keysToClear.push(key);
        }
      }
      for (const k of keysToClear) {
        window.localStorage.removeItem(k);
        clearedLocalStorageKeys++;
      }
    } catch {
      // ignore
    }
  }

  // Clear caches API if available
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await window.caches.keys();
      for (const name of cacheNames) {
        if (!name.includes('offline-bundle')) {
          await window.caches.delete(name);
          clearedIndexedDBs++;
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    clearedLocalStorageKeys,
    clearedSessionStorageKeys,
    clearedIndexedDBs,
    success: true,
  };
}

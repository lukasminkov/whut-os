// Simple in-memory cache with TTL for API responses
// Used to avoid redundant external API calls within short windows

interface CacheEntry {
  data: any;
  expires: number;
}

const store = new Map<string, CacheEntry>();

// Periodic cleanup every 5 minutes
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expires <= now) store.delete(key);
    }
  }, 300_000);
}

/**
 * Get or fetch with TTL cache.
 * @param key  Cache key (e.g. "gmail:userId")
 * @param ttlMs  Time-to-live in ms (default 60s)
 * @param fn  Async fetcher
 */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  ensureCleanup();
  const entry = store.get(key);
  if (entry && entry.expires > Date.now()) return entry.data as T;
  const data = await fn();
  store.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}

/** Invalidate a specific cache key */
export function invalidate(key: string) {
  store.delete(key);
}

/** Invalidate all keys matching a prefix */
export function invalidatePrefix(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

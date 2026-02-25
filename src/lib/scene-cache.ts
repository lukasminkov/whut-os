// Client-side scene cache for instant "show that again" responses
// Stores recent scenes keyed by intent/query with 60s TTL

interface CachedScene {
  scene: any;
  spokenText: string;
  expires: number;
}

const MAX_ENTRIES = 20;
const TTL_MS = 60_000;

const sceneStore = new Map<string, CachedScene>();

function normalizeKey(query: string): string {
  return query.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

export function cacheScene(query: string, scene: any, spokenText: string) {
  const key = normalizeKey(query);
  if (!key) return;
  sceneStore.set(key, { scene, spokenText, expires: Date.now() + TTL_MS });
  // Evict oldest if over limit
  if (sceneStore.size > MAX_ENTRIES) {
    const oldest = sceneStore.keys().next().value;
    if (oldest) sceneStore.delete(oldest);
  }
}

export function getCachedScene(query: string): { scene: any; spokenText: string } | null {
  const key = normalizeKey(query);
  const entry = sceneStore.get(key);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    sceneStore.delete(key);
    return null;
  }
  return { scene: entry.scene, spokenText: entry.spokenText };
}

/** Check for "show that again" type queries */
export function isRepeatRequest(query: string): boolean {
  return /\b(show that again|repeat|same thing|show me that|what was that)\b/i.test(query);
}

/** Get the most recent cached scene (for repeat requests) */
export function getLastScene(): { scene: any; spokenText: string } | null {
  let latest: CachedScene | null = null;
  for (const entry of sceneStore.values()) {
    if (entry.expires > Date.now() && (!latest || entry.expires > latest.expires)) {
      latest = entry;
    }
  }
  return latest ? { scene: latest.scene, spokenText: latest.spokenText } : null;
}

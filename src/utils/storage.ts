import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'novatune-db';
const DB_VERSION = 2; // bumped to add api-cache store
const SONG_STORE = 'offline-songs';
const API_STORE  = 'api-cache';

let _db: IDBPDatabase | null = null;

const getDb = async () => {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SONG_STORE)) {
        db.createObjectStore(SONG_STORE);
      }
      if (!db.objectStoreNames.contains(API_STORE)) {
        // key: cache key string, value: { data, timestamp }
        db.createObjectStore(API_STORE);
      }
    },
  });
  return _db;
};

// ── Offline Song Storage ────────────────────────────────────────────────────

export async function downloadSong(songId: string, streamUrl: string): Promise<void> {
  try {
    const response = await fetch(streamUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const db = await getDb();
    await db.put(SONG_STORE, blob, songId);
  } catch (error) {
    console.error('Failed to download song:', error);
    throw error;
  }
}

export async function getOfflineSong(songId: string): Promise<string | null> {
  try {
    const db = await getDb();
    const blob = await db.get(SONG_STORE, songId);
    if (blob) return URL.createObjectURL(blob);
    return null;
  } catch (error) {
    console.error('Failed to get offline song:', error);
    return null;
  }
}

export async function isOffline(songId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const blob = await db.get(SONG_STORE, songId);
    return !!blob;
  } catch {
    return false;
  }
}

export async function removeOfflineSong(songId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(SONG_STORE, songId);
  } catch (error) {
    console.error('Failed to remove offline song:', error);
  }
}

// ── API Response Cache (IDB) ────────────────────────────────────────────────
// Provides cross-session persistence for React Query data.
// Eviction strategy:
//   1. 24-hour TTL per entry (unchanged).
//   2. LRU size-based eviction: if storage usage exceeds 80% of quota, the
//      oldest 20% of entries (by lastAccessed) are deleted before each write.
//      Falls back gracefully on browsers without navigator.storage.estimate().
//
// Cache entry shape (v2):
//   { data: unknown, timestamp: number, lastAccessed: number }
//   `lastAccessed` is updated on every cache read.
//   Old entries missing the field treat timestamp as lastAccessed.

const API_CACHE_TTL_MS  = 24 * 60 * 60 * 1000; // 24 hours
const QUOTA_EVICT_RATIO = 0.80; // trigger eviction above 80% usage
const EVICT_FRACTION    = 0.20; // delete oldest 20% of entries

// Throttle quota checks: run at most once every 20 writes OR once per minute.
const EVICT_CHECK_EVERY_N_WRITES = 20;
const EVICT_CHECK_MIN_INTERVAL_MS = 60_000; // 1 minute
let _evictWriteCount = 0;
let _lastEvictCheckAt = 0;

interface ApiCacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  lastAccessed: number;
}

/** Evict the oldest `EVICT_FRACTION` of api-cache entries (LRU). */
async function evictLruEntries(): Promise<void> {
  const db = await getDb();
  const keys = await db.getAllKeys(API_STORE) as string[];
  if (!keys.length) return;

  // Collect { key, lastAccessed } for all entries
  const entries: { key: string; lastAccessed: number }[] = [];
  for (const key of keys) {
    const entry = await db.get(API_STORE, key) as ApiCacheEntry | undefined;
    entries.push({ key, lastAccessed: entry?.lastAccessed ?? entry?.timestamp ?? 0 });
  }

  // Sort oldest-first and delete the bottom EVICT_FRACTION
  entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
  const toDelete = entries.slice(0, Math.ceil(entries.length * EVICT_FRACTION));
  await Promise.all(toDelete.map(e => db.delete(API_STORE, e.key)));
}

/**
 * Check storage quota and run LRU eviction if above threshold.
 * Throttled: only executes the estimate() call once every
 * EVICT_CHECK_EVERY_N_WRITES writes OR EVICT_CHECK_MIN_INTERVAL_MS ms,
 * whichever comes first. Fire-and-forget safe.
 */
async function maybeEvictBySize(): Promise<void> {
  _evictWriteCount++;
  const now = Date.now();
  const countThreshold = _evictWriteCount >= EVICT_CHECK_EVERY_N_WRITES;
  const timeThreshold  = now - _lastEvictCheckAt >= EVICT_CHECK_MIN_INTERVAL_MS;

  if (!countThreshold && !timeThreshold) return; // neither threshold met, skip

  // Reset counters before the async work so concurrent calls don't double-fire.
  _evictWriteCount = 0;
  _lastEvictCheckAt = now;

  if (!('storage' in navigator && 'estimate' in navigator.storage)) return;
  try {
    const { usage = 0, quota = Infinity } = await navigator.storage.estimate();
    if (quota > 0 && usage / quota > QUOTA_EVICT_RATIO) {
      await evictLruEntries();
    }
  } catch {
    // estimate() failed — skip eviction, not critical
  }
}

export async function setApiCache(key: string, data: unknown): Promise<void> {
  try {
    // Size-based eviction check before writing (fire-and-forget semantics: write
    // proceeds even if eviction throws internally).
    await maybeEvictBySize();
    const db = await getDb();
    const now = Date.now();
    await db.put(API_STORE, { data, timestamp: now, lastAccessed: now } satisfies ApiCacheEntry, key);
  } catch (e) {
    console.warn('IDB api-cache set failed', e);
  }
}

export async function getApiCache<T>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    const entry = await db.get(API_STORE, key) as ApiCacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > API_CACHE_TTL_MS) {
      await db.delete(API_STORE, key); // evict TTL-expired
      return null;
    }
    // Bump lastAccessed on read so LRU eviction keeps hot entries alive.
    // Fire-and-forget — don't block the caller.
    db.put(API_STORE, { ...entry, lastAccessed: Date.now() }, key).catch(() => {});
    return entry.data;
  } catch {
    return null;
  }
}

export async function clearApiCache(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(API_STORE);
  } catch (e) {
    console.warn('IDB api-cache clear failed', e);
  }
}


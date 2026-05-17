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
// TTL: 24 hours by default so stale data doesn't persist forever on mobile.

const API_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function setApiCache(key: string, data: unknown): Promise<void> {
  try {
    const db = await getDb();
    await db.put(API_STORE, { data, timestamp: Date.now() }, key);
  } catch (e) {
    console.warn('IDB api-cache set failed', e);
  }
}

export async function getApiCache<T>(key: string): Promise<T | null> {
  try {
    const db = await getDb();
    const entry = await db.get(API_STORE, key) as { data: T; timestamp: number } | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > API_CACHE_TTL_MS) {
      await db.delete(API_STORE, key); // evict expired
      return null;
    }
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


import { openDB } from 'idb';

const DB_NAME = 'novatune-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline-songs';

const getDb = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

export async function downloadSong(songId: string, streamUrl: string): Promise<void> {
  try {
    const response = await fetch(streamUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    const db = await getDb();
    await db.put(STORE_NAME, blob, songId);
  } catch (error) {
    console.error('Failed to download song:', error);
    throw error;
  }
}

export async function getOfflineSong(songId: string): Promise<string | null> {
  try {
    const db = await getDb();
    const blob = await db.get(STORE_NAME, songId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error) {
    console.error('Failed to get offline song:', error);
    return null;
  }
}

export async function isOffline(songId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const blob = await db.get(STORE_NAME, songId);
    return !!blob;
  } catch (error) {
    return false;
  }
}

export async function removeOfflineSong(songId: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, songId);
  } catch (error) {
    console.error('Failed to remove offline song:', error);
  }
}

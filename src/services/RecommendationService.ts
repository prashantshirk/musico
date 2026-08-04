import { usePlayerStore } from '../store/playerStore';
import { useAuthStore } from '../store/authStore';
import { subsonicGet } from '../api/client';
import { getRandomSongs } from '../api/browsing';
import type { Song } from '../types';

// If an external AI recommendation server is configured, use it.
// Otherwise fall back to Navidrome's built-in getSimilarSongs2.
const AI_BASE_URL = (import.meta.env.VITE_AI_RECOMMENDATION_BASE_URL as string | undefined) || '';

class LruCache<K, V> {
  private max: number;
  private cache: Map<K, V>;

  constructor(max = 50) {
    this.max = max;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: K, val: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, val);
  }

  clear(): void {
    this.cache.clear();
  }
}

class RecommendationServiceClass {
  private cache = new LruCache<string, Song[]>(50);
  private recentlyPlayedIds: string[] = [];
  
  private prefetchedSongs: Song[] = [];
  private prefetchSourceSongId: string | null = null;
  private prefetchStatus: 'idle' | 'loading' | 'success' | 'failed' = 'idle';
  private activeRequestPromise: Promise<Song[]> | null = null;

  addToRecentlyPlayed(songId: string) {
    this.recentlyPlayedIds = this.recentlyPlayedIds.filter(id => id !== songId);
    this.recentlyPlayedIds.push(songId);
    if (this.recentlyPlayedIds.length > 20) {
      this.recentlyPlayedIds.shift();
    }
  }

  clearSession() {
    this.prefetchedSongs = [];
    this.prefetchSourceSongId = null;
    this.prefetchStatus = 'idle';
    this.activeRequestPromise = null;
  }

  private async fetchFromExternalServer(songId: string, sessionId: string): Promise<Song[]> {
    // The AI recommendation server is public — no auth required.
    const params = new URLSearchParams({ id: songId, count: '15' });
    const url = `${AI_BASE_URL.replace(/\/$/, '')}/rest/getSimilarSongs.view?${params}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const state = usePlayerStore.getState();
    if (!state.isAiRadioSession || state.aiRadioSessionId !== sessionId) {
      throw new Error('Session changed during fetch');
    }

    const data = await res.json();
    const response = data['subsonic-response'];
    if (!response) throw new Error('Unexpected response from server');
    if (response.status !== 'ok') throw new Error(response.error?.message || 'API error');

    return response.similarSongs?.song || response.similarSongs2?.song || [];
  }

  private async fetchFromNavidrome(songId: string, sessionId: string): Promise<Song[]> {
    const res = await subsonicGet<any>('getSimilarSongs2.view', { id: songId, count: 15 });

    const state = usePlayerStore.getState();
    if (!state.isAiRadioSession || state.aiRadioSessionId !== sessionId) {
      throw new Error('Session changed during fetch');
    }

    const songs: Song[] = res.similarSongs2?.song || [];
    if (songs.length > 0) return songs;

    // Navidrome may return empty if Last.fm integration is not configured.
    // Fall back to random songs so AI Radio always has content.
    const random = await getRandomSongs(15);
    return random as Song[];
  }

  private async fetchRecommendations(songId: string, sessionId: string): Promise<Song[]> {
    const cached = this.cache.get(songId);
    if (cached) return cached;

    let songs: Song[];
    if (AI_BASE_URL) {
      songs = await this.fetchFromExternalServer(songId, sessionId);
    } else {
      songs = await this.fetchFromNavidrome(songId, sessionId);
    }

    if (songs.length > 0) {
      this.cache.set(songId, songs);
    }
    return songs;
  }

  async triggerPrefetch(songId: string, sessionId: string): Promise<void> {
    if (
      this.prefetchSourceSongId === songId &&
      (this.prefetchStatus === 'loading' || this.prefetchStatus === 'success')
    ) {
      return;
    }

    if (this.activeRequestPromise) return;

    this.prefetchSourceSongId = songId;
    this.prefetchStatus = 'loading';
    this.prefetchedSongs = [];

    const promise = this.fetchRecommendations(songId, sessionId);
    this.activeRequestPromise = promise;

    try {
      const songs = await promise;

      const state = usePlayerStore.getState();
      if (!state.isAiRadioSession || state.aiRadioSessionId !== sessionId) return;

      this.prefetchedSongs = songs;
      this.prefetchStatus = 'success';
    } catch {
      this.prefetchStatus = 'failed';
    } finally {
      this.activeRequestPromise = null;
    }
  }

  async getOrFetchImmediate(songId: string, sessionId: string): Promise<Song[]> {
    if (
      this.prefetchSourceSongId === songId &&
      this.prefetchStatus === 'loading' &&
      this.activeRequestPromise
    ) {
      try {
        await this.activeRequestPromise;
      } catch {
        // fall through to fresh fetch
      }
    }

    if (this.prefetchSourceSongId === songId && this.prefetchStatus === 'success') {
      return this.prefetchedSongs;
    }

    try {
      return await this.fetchRecommendations(songId, sessionId);
    } catch {
      return [];
    }
  }

  filterAndClean(songs: Song[], currentQueue: Song[], _currentSong: Song | null): Song[] {
    const queueIds = new Set(currentQueue.map(s => s.id));
    // recentlyPlayedIds includes the seed song, but the seed is already in queueIds
    // so filtering by queueIds first means recently-played check never touches it.
    const recentlyPlayedSet = new Set(this.recentlyPlayedIds);

    return songs.filter(song => {
      if (queueIds.has(song.id)) return false;         // already in queue
      if (recentlyPlayedSet.has(song.id)) return false; // heard recently
      return true;
    });
  }
}

export const RecommendationService = new RecommendationServiceClass();

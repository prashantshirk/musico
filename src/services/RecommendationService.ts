import { usePlayerStore } from '../store/playerStore';
import type { Song } from '../types';

// Use the same-origin proxy by default so browsers can reach the remote endpoint
// without CORS or mixed-content failures.
const SIMILAR_SONGS_ENDPOINT =
  (import.meta.env.VITE_SIMILAR_SONGS_ENDPOINT as string | undefined) ||
  '/api/ai-recommendations/rest/getSimilarSongs.view?u=admin&t=x&s=x&v=1.16.1&c=test&f=json';

const RECOMMENDATION_BATCH_SIZE = 10;
const REFILL_RETRY_ATTEMPTS = 5;
const RECENT_HISTORY_LIMIT = 50;

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
  private recentHistoryIds: string[] = [];
  private prefetchedSongs: Song[] = [];
  private prefetchSourceSongId: string | null = null;
  private prefetchStatus: 'idle' | 'loading' | 'success' | 'failed' = 'idle';
  private activeRequestPromise: Promise<Song[]> | null = null;

  trackPlayedSong(songId: string) {
    this.recentHistoryIds = this.recentHistoryIds.filter(id => id !== songId);
    this.recentHistoryIds.push(songId);
    if (this.recentHistoryIds.length > RECENT_HISTORY_LIMIT) {
      this.recentHistoryIds.shift();
    }
  }

  clearSession() {
    this.prefetchedSongs = [];
    this.prefetchSourceSongId = null;
    this.prefetchStatus = 'idle';
    this.activeRequestPromise = null;
  }

  private async fetchFromExternalServer(songId: string, sessionId: string): Promise<Song[]> {
    const url = new URL(SIMILAR_SONGS_ENDPOINT, window.location.origin);
    url.searchParams.set('id', songId);
    url.searchParams.set('count', String(RECOMMENDATION_BATCH_SIZE));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const state = usePlayerStore.getState();
    if (!state.isAiRadioSession || state.aiRadioSessionId !== sessionId) {
      throw new Error('Session changed during fetch');
    }

    const data = await res.json();
    const response = data['subsonic-response'];
    if (!response) throw new Error('Unexpected response from server');
    if (response.status !== 'ok') throw new Error(response.error?.message || 'API error');

    const songs = response.similarSongs?.song || response.similarSongs2?.song || [];
    return Array.isArray(songs) ? songs : [songs];
  }

  private async fetchRecommendations(songId: string, sessionId: string): Promise<Song[]> {
    const cached = this.cache.get(songId);
    if (cached) return cached;

    const songs = await this.fetchFromExternalServer(songId, sessionId);

    if (songs.length > 0) {
      this.cache.set(songId, songs);
    }
    return songs;
  }

  private pickUniqueSongs(songs: Song[], blockedIds: Set<string>, usedIds: Set<string>): Song[] {
    const picked: Song[] = [];
    for (const song of songs) {
      if (!song?.id) continue;
      if (blockedIds.has(song.id) || usedIds.has(song.id)) continue;
      usedIds.add(song.id);
      picked.push(song);
    }
    return picked;
  }

  async getUniqueRecommendations(
    songId: string,
    sessionId: string,
    currentQueueSongIds: string[],
    desiredCount = RECOMMENDATION_BATCH_SIZE
  ): Promise<Song[]> {
    const blockedIds = new Set<string>([...currentQueueSongIds, ...this.recentHistoryIds]);
    const usedIds = new Set<string>();
    const collected: Song[] = [];

    const pushFrom = (songs: Song[]) => {
      const unique = this.pickUniqueSongs(songs, blockedIds, usedIds);
      if (unique.length > 0) collected.push(...unique);
    };

    // Prefer prefetched/cached results first to keep queue refill responsive.
    const initial = await this.getOrFetchImmediate(songId, sessionId);
    pushFrom(initial);

    for (let attempt = 0; attempt < REFILL_RETRY_ATTEMPTS && collected.length < desiredCount; attempt++) {
      const state = usePlayerStore.getState();
      if (!state.isAiRadioSession || state.aiRadioSessionId !== sessionId) break;

      try {
        const fresh = await this.fetchFromExternalServer(songId, sessionId);
        if (fresh.length > 0) {
          this.cache.set(songId, fresh);
        }
        pushFrom(fresh);
      } catch (error) {
        console.error('[AI Radio] Retry fetch failed:', error);
      }
    }

    return collected.slice(0, desiredCount);
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
    } catch (error) {
      console.error('[AI Radio] Recommendation fetch failed:', error);
      return [];
    }
  }
}

export const RecommendationService = new RecommendationServiceClass();

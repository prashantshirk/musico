import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from './usePlayer';
import { coverArtUrl } from '../api/client';

/* Two sizes rather than six. Every distinct size is its own entry in the
 * 500-item cover-art cache, so requesting six variants per track evicted the
 * library's artwork six times faster than it needed to. Browsers pick the
 * largest artwork that fits anyway. */
const ARTWORK_SIZES = [192, 512];

/* Lock-screen position only needs to be roughly right. The store now ticks at
 * 4Hz; pushing all of those through setPositionState is wasted work. */
const POSITION_PUSH_INTERVAL_MS = 1000;

export function useMediaSession() {
  // Selector subscriptions — this hook lives in the app shell, so subscribing to
  // the whole store re-rendered every route on every progress tick.
  const songId = usePlayerStore(state => state.currentSong?.id);
  const title = usePlayerStore(state => state.currentSong?.title);
  const artist = usePlayerStore(state => state.currentSong?.artist);
  const album = usePlayerStore(state => state.currentSong?.album);
  const albumId = usePlayerStore(state => state.currentSong?.albumId);
  const { togglePlay, next, previous, seek } = usePlayer();

  useEffect(() => {
    if (!('mediaSession' in navigator) || !songId) return;

    const absolute = (url: string) => new URL(url, window.location.origin).href;
    // Prefer the album id: song rows and album pages already request artwork by
    // album, so keying on the song id here fetched and cached the same image twice.
    const artId = albumId || songId;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || '',
      artist: artist || '',
      album: album || '',
      artwork: ARTWORK_SIZES.map(size => ({
        src: absolute(coverArtUrl(artId, size)),
        sizes: `${size}x${size}`,
        type: 'image/jpeg',
      })),
    });

    navigator.mediaSession.setActionHandler('play', () => togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => togglePlay());
    navigator.mediaSession.setActionHandler('previoustrack', () => previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [songId, title, artist, album, albumId, togglePlay, next, previous, seek]);

  // Position is pushed from an imperative store subscription so progress ticks
  // never re-render React at all.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    let lastPush = 0;
    const push = (state: ReturnType<typeof usePlayerStore.getState>) => {
      if (!state.currentSong || !Number.isFinite(state.duration) || state.duration <= 0) return;
      const now = Date.now();
      if (now - lastPush < POSITION_PUSH_INTERVAL_MS) return;
      lastPush = now;
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, state.duration),
          playbackRate: 1,
          position: Math.max(0, Math.min(state.progress, state.duration)),
        });
      } catch {
        /* Safari throws while duration is still settling — next tick will retry */
      }
    };

    return usePlayerStore.subscribe(push);
  }, []);
}

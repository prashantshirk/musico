import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from './usePlayer';
import { coverArtUrl } from '../api/client';

export function useMediaSession() {
  const { currentSong, isPlaying, progress, duration } = usePlayerStore();
  const { togglePlay, next, previous, seek } = usePlayer();

  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: [
          { src: coverArtUrl(currentSong.id, 96), sizes: '96x96', type: 'image/jpeg' },
          { src: coverArtUrl(currentSong.id, 128), sizes: '128x128', type: 'image/jpeg' },
          { src: coverArtUrl(currentSong.id, 192), sizes: '192x192', type: 'image/jpeg' },
          { src: coverArtUrl(currentSong.id, 256), sizes: '256x256', type: 'image/jpeg' },
          { src: coverArtUrl(currentSong.id, 384), sizes: '384x384', type: 'image/jpeg' },
          { src: coverArtUrl(currentSong.id, 512), sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => previous());
      navigator.mediaSession.setActionHandler('nexttrack', () => next());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      });
    }

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      }
    };
  }, [currentSong, togglePlay, next, previous, seek]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentSong && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: isPlaying ? 1 : 0,
          position: Math.max(0, Math.min(progress, duration))
        });
      } catch (e) {
        console.error('Failed to set position state', e);
      }
    }
  }, [isPlaying, progress, duration, currentSong]);
}

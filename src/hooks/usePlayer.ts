import { useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { usePlayerStore } from '../store/playerStore';
import { streamUrl } from '../api/client';
import { scrobble } from '../api/scrobble';
import type { Song } from '../types';

let currentHowl: Howl | null = null;
let preloaderHowl: Howl | null = null;
let preloadTimeout: ReturnType<typeof setTimeout> | null = null;

function getStore() {
  return usePlayerStore.getState();
}

function startProgressTick(howl: Howl) {
  const tick = () => {
    if (currentHowl === howl && howl.playing()) {
      getStore().setProgress(howl.seek() as number);
      requestAnimationFrame(tick);
    }
  };
  requestAnimationFrame(tick);
}

function schedulePreload() {
  if (preloadTimeout) { clearTimeout(preloadTimeout); preloadTimeout = null; }

  // Preload the next song shortly after the current one starts playing.
  // This gives the network time to buffer the next track in the background
  // so track transitions are instant (gapless).
  preloadTimeout = setTimeout(() => {
    const state = getStore();
    const { queue, queueIndex, repeat } = state;
    if (!currentHowl || !currentHowl.playing()) return;

    let ni = queueIndex + 1;
    if (ni >= queue.length && repeat === 'all') ni = 0;
    if (ni < queue.length) {
      const nextSong = queue[ni];
      if (preloaderHowl) { preloaderHowl.unload(); preloaderHowl = null; }
      preloaderHowl = new Howl({
        src: [streamUrl(nextSong.id)],
        html5: true,
        volume: 0,
        preload: true,
      });
    }
  }, 3000); // Start preloading 3 seconds into current track
}


function handleSongEnd() {
  const { repeat, queue, queueIndex } = getStore();
  const currentSong = queue[queueIndex];
  
  if (currentSong) {
    scrobble(currentSong.id, true); // Scrobble on finish
  }

  if (repeat === 'one') {
    currentHowl?.seek(0);
    currentHowl?.play();
    return;
  }

  const nextIndex = queueIndex + 1;

  if (nextIndex < queue.length) {
    if (preloaderHowl) {
      const promoted = preloaderHowl;
      preloaderHowl = null;
      if (currentHowl) { currentHowl.unload(); currentHowl = null; }
      currentHowl = promoted;
      promoted.volume(getStore().isMuted ? 0 : getStore().volume);
      getStore().next();
      promoted.on('load', () => getStore().setDuration(promoted.duration()));
      promoted.on('play', () => {
        schedulePreload();
        startProgressTick(promoted);
      });
      promoted.on('end', handleSongEnd);
      promoted.play();
      return;
    }
    getStore().next();
    const nextSong = getStore().queue[getStore().queueIndex];
    if (nextSong) _playSong(nextSong);
  } else if (repeat === 'all' && queue.length > 0) {
    getStore().next();
    const firstSong = getStore().queue[0];
    if (firstSong) _playSong(firstSong);
  } else {
    getStore().setProgress(0);
    getStore().setLoading(false);
  }
}

function _playSong(song: Song, queue?: Song[]) {
  if (preloaderHowl) { preloaderHowl.unload(); preloaderHowl = null; }
  if (preloadTimeout) { clearTimeout(preloadTimeout); preloadTimeout = null; }
  if (currentHowl) { currentHowl.unload(); currentHowl = null; }

  if (queue !== undefined) {
    getStore().playSong(song, queue);
  } else {
    getStore().playSong(song);
  }
  getStore().setLoading(true);

  const url = streamUrl(song.id);
  scrobble(song.id, false); // Now playing status
  
  const howl = new Howl({
    src: [url],
    html5: true,
    preload: true,
    volume: getStore().isMuted ? 0 : getStore().volume,
    onload: () => {
      getStore().setDuration(howl.duration());
      getStore().setLoading(false);
    },
    onplay: () => {
      schedulePreload();
      startProgressTick(howl);
    },
    onend: handleSongEnd,
    onloaderror: (_id: number, err: unknown) => {
      console.error('Load error:', err);
      getStore().setLoading(false);
    },
    onplayerror: () => {
      Howler.ctx?.resume();
    },
  });
  currentHowl = howl;
  howl.play();
}

export function usePlayer() {
  const playSong = useCallback((song: Song, queue?: Song[]) => {
    _playSong(song, queue);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentHowl) return;
    if (currentHowl.playing()) {
      currentHowl.pause();
      getStore().togglePlay();
    } else {
      currentHowl.play();
      getStore().togglePlay();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    if (!currentHowl) return;
    currentHowl.seek(seconds);
    getStore().seek(seconds);
    schedulePreload();
  }, []);

  const setVolume = useCallback((vol: number) => {
    Howler.volume(vol);
    getStore().setVolume(vol);
    if (preloaderHowl) preloaderHowl.volume(0);
  }, []);

  const toggleMute = useCallback(() => {
    const { isMuted, volume } = getStore();
    Howler.volume(isMuted ? volume : 0);
    getStore().toggleMute();
  }, []);

  const next = useCallback(() => {
    const { queue, queueIndex, repeat } = getStore();
    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      _playSong(queue[nextIndex]);
      getStore().next();
    } else if (repeat === 'all' && queue.length > 0) {
      _playSong(queue[0]);
      getStore().next();
    }
  }, []);

  const previous = useCallback(() => {
    const state = getStore();
    if (state.progress > 3) {
      seek(0);
      return;
    }
    if (state.queueIndex > 0) {
      const prevSong = state.queue[state.queueIndex - 1];
      getStore().previous();
      if (prevSong) _playSong(prevSong);
    }
  }, [seek]);

  const playAlbum = useCallback((songs: Song[], startIndex = 0) => {
    const song = songs[startIndex];
    if (song) _playSong(song, songs);
  }, []);

  const skipTo = useCallback((index: number) => {
    const { queue } = getStore();
    if (index >= 0 && index < queue.length) {
      _playSong(queue[index], queue);
    }
  }, []);

  return { playSong, playAlbum, togglePlay, seek, skipTo, setVolume, toggleMute, next, previous };
}

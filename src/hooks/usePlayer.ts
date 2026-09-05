import { useCallback } from 'react';
import { Howl, Howler } from 'howler';
import { usePlayerStore } from '../store/playerStore';
import { streamUrl } from '../api/client';
import { scrobble } from '../api/scrobble';
import { toast } from './use-toast';
import type { Song } from '../types';

let currentHowl: Howl | null = null;
let preloaderHowl: Howl | null = null;
let preloadTimeout: ReturnType<typeof setTimeout> | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;

let lastSaveTime = 0;
let lastSeenPosition = -1;
let stalledTicks = 0;
let stallRecoveries = 0;
let retriedSongId: string | null = null;

/* Progress is polled on an interval rather than driven by requestAnimationFrame.
 * rAF is suspended entirely once the tab is hidden or the phone screen locks, so
 * the store froze at the last visible position while audio kept playing — which
 * left the Media Session scrubber and the resume checkpoint stale, and made the
 * player look dead on return. An interval is throttled in the background but
 * never suspended. It also cuts store writes from ~60/s to 4/s, and those writes
 * were re-rendering the whole component tree every frame. */
const PROGRESS_INTERVAL_MS = 250;
const SAVE_INTERVAL_MS = 5000;
/* 250ms x 24 = 6s of a "playing" Howl whose position has not advanced. */
const STALL_TICKS_BEFORE_RECOVERY = 24;
const MAX_STALL_RECOVERIES = 2;
/* Preloading opens a second stream, and Navidrome transcodes it server-side, so
 * firing at 3s meant every quick skip spawned a throwaway transcode job. */
const PRELOAD_DELAY_MS = 15000;

/* Global gain is pinned at unity and per-Howl volume is the single source of
 * truth. setVolume() used to write the global while _playSong() wrote the
 * per-sound value, and Howler multiplies the two — so a slider at 0.5 actually
 * played at 0.25, and muting then unmuting could leave audio at zero. */
Howler.volume(1);

function getStore() {
  return usePlayerStore.getState();
}

function activeVolume() {
  const { isMuted, volume } = getStore();
  return isMuted ? 0 : volume;
}

function stopProgressTick() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  lastSeenPosition = -1;
  stalledTicks = 0;
}

function cleanupHowl(howl: Howl | null) {
  if (!howl) return;
  howl.off();
  howl.stop();
  howl.unload();
}

function saveCheckpoint(seconds: number) {
  const now = Date.now();
  if (now - lastSaveTime < SAVE_INTERVAL_MS) return;
  lastSaveTime = now;
  try {
    localStorage.setItem('novatune-saved-progress', seconds.toString());
  } catch {
    /* quota or private mode — losing the resume position is not worth throwing */
  }
}

/* A dropped mobile connection does not surface as an error: Howler keeps
 * reporting playing() === true and the position simply stops moving. Rebuilding
 * the audio element at the same offset is what actually clears it, and it is far
 * less disruptive than skipping the track. Bounded so a server that is genuinely
 * down does not turn into a reload loop. */
function recoverFromStall(position: number) {
  const song = getStore().currentSong;
  if (!song) return;

  if (stallRecoveries >= MAX_STALL_RECOVERIES) {
    stopProgressTick();
    getStore().setPlaying(false);
    getStore().setLoading(false);
    toast({
      variant: 'destructive',
      title: 'Playback stalled',
      description: 'The stream stopped responding. Check your connection to the server.',
    });
    return;
  }

  stallRecoveries++;
  console.warn('[player] stream stalled, reloading at', position);
  _playSong(song, undefined, false, true, position);
}

function startProgressTick(howl: Howl) {
  stopProgressTick();

  progressTimer = setInterval(() => {
    // A stale timer from a previous track — drop it.
    if (currentHowl !== howl) { stopProgressTick(); return; }
    // Paused is not stalled. Keep the timer (it costs nothing) but don't judge.
    if (!howl.playing()) { lastSeenPosition = -1; stalledTicks = 0; return; }

    const seek = howl.seek();
    if (typeof seek !== 'number' || Number.isNaN(seek)) return;

    if (lastSeenPosition >= 0 && Math.abs(seek - lastSeenPosition) < 0.01) {
      stalledTicks++;
      if (stalledTicks >= STALL_TICKS_BEFORE_RECOVERY) {
        stalledTicks = 0;
        recoverFromStall(seek);
        return;
      }
    } else {
      stalledTicks = 0;
      stallRecoveries = 0;
    }
    lastSeenPosition = seek;

    getStore().setProgress(seek);
    saveCheckpoint(seek);
  }, PROGRESS_INTERVAL_MS);
}

function schedulePreload() {
  if (preloadTimeout) { clearTimeout(preloadTimeout); preloadTimeout = null; }

  preloadTimeout = setTimeout(() => {
    const { queue, queueIndex, repeat } = getStore();
    if (!currentHowl || !currentHowl.playing()) return;

    let ni = queueIndex + 1;
    if (ni >= queue.length && repeat === 'all') ni = 0;
    if (ni < queue.length && queue[ni]) {
      if (preloaderHowl) { cleanupHowl(preloaderHowl); preloaderHowl = null; }
      preloaderHowl = new Howl({
        src: [streamUrl(queue[ni].id)],
        format: ['mp3'],
        html5: true,
        volume: 0,
        preload: true,
      });
    }
  }, PRELOAD_DELAY_MS);
}

/* The preloaded Howl becomes the live one. It needs the same event wiring as a
 * freshly built Howl, otherwise a promoted track plays with no progress tick, no
 * duration and no error handling — which looked exactly like "music just stops". */
function adoptPreloaded(promoted: Howl, song: Song) {
  if (currentHowl) { cleanupHowl(currentHowl); currentHowl = null; }
  currentHowl = promoted;
  promoted.volume(activeVolume());

  // If it finished loading before promotion the 'load' event has already fired,
  // so read the duration directly instead of waiting for an event that won't come.
  if (promoted.state() === 'loaded') {
    getStore().setDuration(promoted.duration());
    getStore().setLoading(false);
  } else {
    getStore().setLoading(true);
    promoted.once('load', () => {
      getStore().setDuration(promoted.duration());
      getStore().setLoading(false);
    });
  }

  promoted.on('play', () => {
    retriedSongId = null;
    getStore().setPlaying(true);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    schedulePreload();
    startProgressTick(promoted);
  });
  promoted.on('pause', () => {
    getStore().setPlaying(false);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  });
  promoted.on('end', () => {
    getStore().setPlaying(false);
    handleSongEnd();
  });
  promoted.on('loaderror', (_id: number, err: unknown) => handleLoadFailure(song, err));
  promoted.on('playerror', () => {
    Howler.ctx?.resume().catch(() => {});
    promoted.play();
  });

  promoted.play();
}

/* One silent retry, then tell the user. Most mobile failures are a transient
 * connection drop while the radio was asleep and a fresh <audio> element clears
 * it; failing twice means the server is actually unreachable, and silently
 * stopping is the behaviour that made playback feel unreliable. */
function handleLoadFailure(song: Song, err: unknown) {
  console.error('[player] load error for', song.id, err);
  stopProgressTick();
  getStore().setLoading(false);

  if (retriedSongId !== song.id) {
    retriedSongId = song.id;
    setTimeout(() => {
      const state = getStore();
      if (state.currentSong?.id !== song.id) return;
      _playSong(song, undefined, false, true, state.progress);
    }, 1200);
    return;
  }

  retriedSongId = null;
  getStore().setPlaying(false);
  toast({
    variant: 'destructive',
    title: 'Playback failed',
    description: `Could not stream "${song.title}". Check your connection to the server.`,
  });
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
    const nextSong = queue[nextIndex];
    if (preloaderHowl && nextSong) {
      const promoted = preloaderHowl;
      preloaderHowl = null;
      getStore().next();
      adoptPreloaded(promoted, nextSong);
      return;
    }
    getStore().next();
    if (nextSong) _playSong(nextSong, undefined, false, true);
  } else if (repeat === 'all' && queue.length > 0) {
    getStore().next();
    const firstSong = getStore().queue[0];
    if (firstSong) _playSong(firstSong, undefined, false, true);
  } else {
    stopProgressTick();
    getStore().setProgress(0);
    getStore().setLoading(false);
  }
}

function playNext() {
  const { queue, queueIndex, repeat } = getStore();
  const nextIndex = queueIndex + 1;
  if (nextIndex < queue.length) {
    const nextSong = queue[nextIndex];
    getStore().next();
    if (nextSong) _playSong(nextSong, undefined, false, true);
  } else if (repeat === 'all' && queue.length > 0) {
    const firstSong = queue[0];
    getStore().next();
    if (firstSong) _playSong(firstSong, undefined, false, true);
  } else {
    getStore().next();
    stopProgressTick();
    if (currentHowl) {
      currentHowl.pause();
      currentHowl.seek(0);
    }
  }
}

function playPrevious() {
  const state = getStore();

  // Past the 3s mark, "previous" means restart the current track.
  if (state.progress > 3) {
    if (currentHowl) currentHowl.seek(0);
    state.seek(0);
    return;
  }

  if (state.queueIndex > 0) {
    const prevSong = state.queue[state.queueIndex - 1];
    state.previous();
    if (prevSong) _playSong(prevSong, undefined, false, true);
    return;
  }

  // At the head of the queue with repeat-all on, wrap to the end. next() already
  // wraps forward, so not wrapping backward made the two buttons asymmetric.
  if (state.repeat === 'all' && state.queue.length > 0) {
    const lastIndex = state.queue.length - 1;
    const lastSong = state.queue[lastIndex];
    if (lastSong) {
      usePlayerStore.setState({
        queueIndex: lastIndex,
        currentSong: lastSong,
        progress: 0,
        isPlaying: true,
      });
      _playSong(lastSong, undefined, false, true);
      return;
    }
  }

  // Nothing before this one — restart rather than doing nothing at all.
  if (currentHowl) currentHowl.seek(0);
  state.seek(0);
}

function _playSong(
  song: Song,
  queue?: Song[],
  startRefillSession = false,
  skipStoreUpdate = false,
  initialSeek?: number
) {
  stopProgressTick();
  if (preloaderHowl) { cleanupHowl(preloaderHowl); preloaderHowl = null; }
  if (preloadTimeout) { clearTimeout(preloadTimeout); preloadTimeout = null; }
  if (currentHowl) { cleanupHowl(currentHowl); currentHowl = null; }

  if (!skipStoreUpdate) {
    if (queue !== undefined) {
      getStore().playSong(song, queue, startRefillSession);
    } else {
      getStore().playSong(song);
    }
  }
  getStore().setLoading(true);

  scrobble(song.id, false); // Now playing status

  const howl = new Howl({
    src: [streamUrl(song.id)],
    format: ['mp3'],
    html5: true,
    preload: true,
    volume: activeVolume(),
    onload: () => {
      getStore().setDuration(howl.duration());
      getStore().setLoading(false);
    },
    onplay: () => {
      retriedSongId = null;
      getStore().setPlaying(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      schedulePreload();
      startProgressTick(howl);
    },
    onpause: () => {
      getStore().setPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    },
    onend: () => {
      getStore().setPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
      handleSongEnd();
    },
    onloaderror: (_id: number, err: unknown) => handleLoadFailure(song, err),
    onplayerror: () => {
      // Almost always a suspended AudioContext after backgrounding.
      Howler.ctx?.resume().catch(() => {});
      howl.play();
    },
  });

  currentHowl = howl;
  if (initialSeek && initialSeek > 0) {
    howl.once('load', () => howl.seek(initialSeek));
  }
  howl.play();
}

/* iOS suspends the AudioContext when the app is backgrounded and does not always
 * resume it on return. main.tsx unlocks once on the first gesture with
 * { once: true }, so that path never runs again — a session suspended mid-track
 * stayed silent until the app was force-quit. Re-check on every foreground. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (Howler.ctx?.state === 'suspended') Howler.ctx.resume().catch(() => {});

    const state = getStore();
    if (state.isPlaying && currentHowl && !currentHowl.playing()) {
      currentHowl.play();
    }
  });
}

export function usePlayer() {
  const playSong = useCallback((song: Song, queue?: Song[], startRefillSession = false) => {
    _playSong(song, queue, startRefillSession);
  }, []);

  const playIndividualSong = useCallback((song: Song) => {
    getStore().startAiRadio(song);
    _playSong(song, undefined, false, true);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentHowl || currentHowl.state() === 'unloaded') {
      const state = getStore();
      if (state.currentSong) {
        _playSong(state.currentSong, undefined, false, true, state.progress);
      }
      return;
    }

    if (currentHowl.playing()) {
      currentHowl.pause();
    } else {
      if (Howler.ctx?.state === 'suspended') Howler.ctx.resume().catch(() => {});
      currentHowl.play();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    if (!currentHowl) return;
    currentHowl.seek(seconds);
    getStore().seek(seconds);
    // Seeking resets the stall watchdog — the position legitimately jumped.
    lastSeenPosition = -1;
    stalledTicks = 0;
    schedulePreload();
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    const store = getStore();
    store.setVolume(clamped);
    // Dragging the slider off zero should also clear mute, or the two controls
    // contradict each other and the slider appears to do nothing.
    if (clamped > 0 && store.isMuted) store.toggleMute();
    if (currentHowl) currentHowl.volume(activeVolume());
    if (preloaderHowl) preloaderHowl.volume(0);
  }, []);

  const toggleMute = useCallback(() => {
    getStore().toggleMute();
    if (currentHowl) currentHowl.volume(activeVolume());
  }, []);

  const next = useCallback(playNext, []);
  const previous = useCallback(playPrevious, []);

  const playAlbum = useCallback((songs: Song[], startIndex = 0) => {
    const song = songs[startIndex];
    if (song) _playSong(song, songs, true);
  }, []);

  const skipTo = useCallback((index: number) => {
    const { queue } = getStore();
    if (index >= 0 && index < queue.length) {
      _playSong(queue[index], queue, false);
    }
  }, []);

  return { playIndividualSong, playSong, playAlbum, togglePlay, seek, skipTo, setVolume, toggleMute, next, previous };
}

import { useEffect, useRef } from 'react';
import { scrobble } from '../api/annotation';
import { usePlayerStore } from '../store/playerStore';

/**
 * Submits a scrobble once per track, at the earlier of half the track length,
 * 30 seconds of playback, or a 30 second wall-clock timer.
 *
 * This subscribes to the store imperatively rather than taking progress as a
 * prop. It used to be called as `useScrobble(id, progress, duration)` from the
 * app shell, which meant the shell had to subscribe to `progress` — so the whole
 * component tree re-rendered on every progress tick purely to re-run a numeric
 * comparison that changes nothing visible.
 */
export function useScrobble() {
  const scrobbled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let trackedId: string | null = null;

    const check = (state: ReturnType<typeof usePlayerStore.getState>) => {
      const id = state.currentSong?.id ?? null;

      if (id !== trackedId) {
        trackedId = id;
        scrobbled.current = false;
        if (timer.current) { clearTimeout(timer.current); timer.current = null; }
        if (id) {
          timer.current = setTimeout(() => {
            if (!scrobbled.current && trackedId === id) {
              scrobble(id).catch(console.error);
              scrobbled.current = true;
            }
          }, 30000);
        }
      }

      if (!id || scrobbled.current || state.duration <= 0) return;

      if (state.progress >= Math.min(state.duration * 0.5, 30)) {
        scrobble(id).catch(console.error);
        scrobbled.current = true;
        if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      }
    };

    check(usePlayerStore.getState());
    const unsubscribe = usePlayerStore.subscribe(check);

    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}

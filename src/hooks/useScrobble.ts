import { useEffect, useRef } from 'react';
import { scrobble } from '../api/annotation';

export function useScrobble(songId: string | undefined | null, progress: number, duration: number) {
  const scrobbled = useRef(false);
  const scrobbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scrobbled.current = false;
    if (scrobbleTimer.current) clearTimeout(scrobbleTimer.current);

    if (!songId) return;

    scrobbleTimer.current = setTimeout(() => {
      if (!scrobbled.current) {
        scrobble(songId).catch(console.error);
        scrobbled.current = true;
      }
    }, 30000);

    return () => {
      if (scrobbleTimer.current) clearTimeout(scrobbleTimer.current);
    };
  }, [songId]);

  useEffect(() => {
    if (!songId || scrobbled.current || duration <= 0) return;

    if (progress >= Math.min(duration * 0.5, 30)) {
      scrobble(songId).catch(console.error);
      scrobbled.current = true;
      if (scrobbleTimer.current) clearTimeout(scrobbleTimer.current);
    }
  }, [progress, duration, songId]);
}

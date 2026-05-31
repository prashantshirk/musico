import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { getSimilarSongs } from '../api/similar';
import { getRandomSongs } from '../api/browsing';

export function useAutoQueue() {
  const { queue, queueIndex, currentSong } = usePlayerStore();

  useEffect(() => {
    const songsRemaining = queue.length - queueIndex - 1;

    if (songsRemaining < 2 && currentSong) {
      (async () => {
        try {
          const similarSongs = await getSimilarSongs(currentSong.id, 5);
          const currentIds = new Set(usePlayerStore.getState().queue.map(s => s.id));
          let newSongs = similarSongs.filter((s: any) => !currentIds.has(s.id));

          if (newSongs.length === 0) {
            const randomSongs = await getRandomSongs(5);
            newSongs = randomSongs.filter((s: any) => !currentIds.has(s.id));
          }

          if (newSongs.length > 0) {
            usePlayerStore.getState().appendToQueue(newSongs);
          }
        } catch (error) {
          console.error('Failed to fetch auto-queue songs:', error);
        }
      })();
    }
  }, [queueIndex, currentSong?.id, queue.length]);
}

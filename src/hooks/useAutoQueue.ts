import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { getSimilarSongs } from '../api/similar';
import { getRandomSongs } from '../api/browsing';

const AUTO_QUEUE_THRESHOLD = 1;
const AUTO_QUEUE_BATCH_SIZE = 4;

export function useAutoQueue() {
  const { queue, queueIndex, currentSong } = usePlayerStore();
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const songsRemaining = queue.length - queueIndex - 1;

    if (songsRemaining < AUTO_QUEUE_THRESHOLD && currentSong && !isFetchingRef.current) {
      isFetchingRef.current = true;

      (async () => {
        try {
          const similarSongs = await getSimilarSongs(currentSong.id, AUTO_QUEUE_BATCH_SIZE);
          const state = usePlayerStore.getState();
          const currentIds = new Set(state.queue.map((song) => song.id));
          let newSongs = similarSongs
            .filter((song: any) => !currentIds.has(song.id))
            .slice(0, AUTO_QUEUE_BATCH_SIZE);

          if (newSongs.length === 0) {
            const randomSongs = await getRandomSongs(AUTO_QUEUE_BATCH_SIZE);
            newSongs = randomSongs
              .filter((song: any) => !currentIds.has(song.id))
              .slice(0, AUTO_QUEUE_BATCH_SIZE);
          }

          if (newSongs.length > 0) {
            state.appendToQueue(newSongs);
          }
        } catch (error) {
          console.error('Failed to fetch auto-queue songs:', error);
        } finally {
          isFetchingRef.current = false;
        }
      })();
    }
  }, [queueIndex, currentSong?.id, queue.length]);
}

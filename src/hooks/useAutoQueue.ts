import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { getSimilarSongs } from '../api/similar';

const AUTO_QUEUE_THRESHOLD = 1;
const AUTO_QUEUE_BATCH_SIZE = 4;

export function useAutoQueue() {
  const { queue, queueIndex, currentSong } = usePlayerStore();
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const songsRemaining = queue.length - queueIndex - 1;

    if (songsRemaining < AUTO_QUEUE_THRESHOLD && currentSong && !isFetchingRef.current) {
      isFetchingRef.current = true;

      getSimilarSongs(currentSong.id, AUTO_QUEUE_BATCH_SIZE)
        .then((similarSongs) => {
          const state = usePlayerStore.getState();
          const currentIds = new Set(state.queue.map((song) => song.id));
          const uniqueRecommendations = similarSongs
            .filter((song: any) => !currentIds.has(song.id))
            .slice(0, AUTO_QUEUE_BATCH_SIZE);

          if (uniqueRecommendations.length > 0) {
            state.appendToQueue(uniqueRecommendations);
          }
        })
        .catch(console.error)
        .finally(() => {
          isFetchingRef.current = false;
        });
    }
  }, [queueIndex, currentSong?.id, queue.length]);
}

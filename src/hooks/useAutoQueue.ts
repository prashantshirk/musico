import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { getSimilarSongs } from '../api/similar';

export function useAutoQueue() {
  const { queue, queueIndex, currentSong } = usePlayerStore();

  useEffect(() => {
    const songsRemaining = queue.length - queueIndex - 1;

    if (songsRemaining < 2 && currentSong) {
      getSimilarSongs(currentSong.artistId || currentSong.id, 5).then(similarSongs => {
        const currentIds = new Set(usePlayerStore.getState().queue.map(s => s.id));
        const newSongs = similarSongs.filter((s: any) => !currentIds.has(s.id));

        if (newSongs.length > 0) {
          usePlayerStore.getState().appendToQueue(newSongs);
        }
      }).catch(console.error);
    }
  }, [queueIndex, currentSong?.id, queue.length]);
}

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { RecommendationService } from '../services/RecommendationService';

export function useAutoQueue() {
  const { queue, queueIndex, currentSong, isAiRadioSession, aiRadioSessionId } = usePlayerStore();
  const isFetchingRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentSong?.id) return;
    RecommendationService.trackPlayedSong(currentSong.id);
  }, [currentSong?.id]);

  // When the session terminates or a new one starts, clear cached prefetch data
  // and reset the fetch lock so the new session can immediately request songs.
  useEffect(() => {
    if (!isAiRadioSession) {
      RecommendationService.clearSession();
      isFetchingRef.current = false;
      lastSessionIdRef.current = null;
    } else if (aiRadioSessionId !== lastSessionIdRef.current) {
      // New session started — reset state
      RecommendationService.clearSession();
      isFetchingRef.current = false;
      lastSessionIdRef.current = aiRadioSessionId;
    }
  }, [isAiRadioSession, aiRadioSessionId]);

  useEffect(() => {
    // AI Radio queues refill themselves. Normal queues never do.
    if (!isAiRadioSession || !aiRadioSessionId || queue.length === 0) return;

    const songsRemaining = queue.length - queueIndex - 1;
    const seedSongId = queue[queue.length - 1]?.id;
    if (!seedSongId) return;

    // Prefetch recommendations when 5 or fewer songs are left in the queue,
    // so they are ready before we need to append them.
    if (songsRemaining <= 5) {
      RecommendationService.triggerPrefetch(seedSongId, aiRadioSessionId);
    }

    // Append recommendations as soon as fewer than 3 songs remain.
    // This also handles the initial case where AI Radio starts with 1 song (0 remaining).
    if (songsRemaining < 3 && !isFetchingRef.current) {
      const capturedSessionId = aiRadioSessionId;
      isFetchingRef.current = true;

      (async () => {
        try {
          const state = usePlayerStore.getState();
          // Async safety: discard if session changed
          if (!state.isAiRadioSession || state.aiRadioSessionId !== capturedSessionId) return;

          const songs = await RecommendationService.getUniqueRecommendations(
            seedSongId,
            capturedSessionId,
            state.queue.map(song => song.id),
            10
          );

          if (songs.length > 0) {
            state.appendToQueue(songs);
          }
        } catch (error) {
          console.error('[AI Radio] Failed to refill queue:', error);
        } finally {
          isFetchingRef.current = false;
        }
      })();
    }
  }, [queueIndex, currentSong?.id, queue.length, isAiRadioSession, aiRadioSessionId]);
}

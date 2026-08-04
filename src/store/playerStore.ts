import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Song } from '../types';

type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  queue: Song[];
  queueIndex: number;
  originalQueue: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  isLoading: boolean;
  isAiRadioSession: boolean;
  aiRadioSessionId: string | null;

  playSong: (song: Song, newQueue?: Song[], startRefillSession?: boolean) => void;
  playAlbum: (songs: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  addNextInQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  next: () => void;
  previous: () => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setProgress: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setLoading: (loading: boolean) => void;
  appendToQueue: (songs: Song[]) => void;
  reorderQueue: (newQueue: Song[]) => void;
  startAiRadio: (song: Song) => void;
}

const shuffleArray = (array: Song[]) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      queueIndex: 0,
      originalQueue: [],
      currentSong: null,
      isPlaying: false,
      progress: typeof window !== 'undefined' ? Number(localStorage.getItem('novatune-saved-progress')) || 0 : 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      shuffle: false,
      repeat: 'none',
      isLoading: false,
      isAiRadioSession: false,
      aiRadioSessionId: null,

      playSong: (song, newQueue, startRefillSession = false) => {
        set((state) => {
          let q = newQueue && newQueue.length > 0 ? [...newQueue] : [...state.queue];
          let qIndex = q.findIndex(s => s.id === song.id);
          if (qIndex === -1) {
            q = [song, ...q];
            qIndex = 0;
          }
          
          let origQ = newQueue ? [...q] : (state.originalQueue.length > 0 ? [...state.originalQueue] : [...q]);

          if (state.shuffle && newQueue && q.length > 0) {
            origQ = [...q];
            const currentInNew = q[qIndex];
            const rest = q.filter((_, i) => i !== qIndex);
            q = [currentInNew, ...shuffleArray(rest)];
            qIndex = 0;
          }

          const startsRefillSession = startRefillSession && Boolean(newQueue && newQueue.length > 0);
          const isAiRadioSession = startsRefillSession ? true : state.isAiRadioSession;
          const aiRadioSessionId = startsRefillSession
            ? (typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : Math.random().toString(36).substring(2) + Date.now().toString(36))
            : state.aiRadioSessionId;

          return {
            currentSong: song,
            queue: q,
            queueIndex: qIndex,
            originalQueue: origQ,
            isPlaying: true,
            progress: 0,
            isAiRadioSession,
            aiRadioSessionId
          };
        });
      },

      playAlbum: (songs, startIndex = 0) => {
        const song = songs[startIndex];
        if (song) {
          get().playSong(song, songs, true);
        }
      },

      addToQueue: (song) => {
        set((state) => {
          const base = state.queue.length === 0
            ? { queue: [song], originalQueue: [song] }
            : { 
                queue: [...state.queue, song],
                originalQueue: [...state.originalQueue, song]
              };
          return {
            ...base,
            isAiRadioSession: false,
            aiRadioSessionId: null
          };
        });
      },

      addNextInQueue: (song) => {
        set((state) => {
          if (state.queue.length === 0) {
            return { queue: [song], originalQueue: [song], isAiRadioSession: false, aiRadioSessionId: null };
          }
          const newQueue = [...state.queue];
          newQueue.splice(state.queueIndex + 1, 0, song);
          
          const newOrigQueue = [...state.originalQueue];
          newOrigQueue.push(song);

          return { queue: newQueue, originalQueue: newOrigQueue, isAiRadioSession: false, aiRadioSessionId: null };
        });
      },

      removeFromQueue: (index) => {
        set((state) => {
          if (index === state.queueIndex) return state; // don't remove current song this way
          const newQueue = state.queue.filter((_, i) => i !== index);
          let newIndex = state.queueIndex;
          if (index < state.queueIndex) {
            newIndex--;
          }
          return { queue: newQueue, queueIndex: newIndex, isAiRadioSession: false, aiRadioSessionId: null };
        });
      },

      clearQueue: () => {
        set((state) => {
          if (!state.currentSong) return { queue: [], originalQueue: [], queueIndex: 0, isAiRadioSession: false, aiRadioSessionId: null };
          return { queue: [state.currentSong], originalQueue: [state.currentSong], queueIndex: 0, isAiRadioSession: false, aiRadioSessionId: null };
        });
      },

      next: () => {
        set((state) => {
          const nextIndex = state.queueIndex + 1;
          if (nextIndex < state.queue.length) {
            return { queueIndex: nextIndex, currentSong: state.queue[nextIndex], progress: 0, isPlaying: true };
          } else if (state.repeat === 'all' && state.queue.length > 0) {
            return { queueIndex: 0, currentSong: state.queue[0], progress: 0, isPlaying: true };
          }
          return { isPlaying: false, progress: 0 };
        });
      },

      previous: () => {
        set((state) => {
          if (state.progress > 3) {
            return { progress: 0 }; // seeking handled by usePlayer hook
          }
          if (state.queueIndex > 0) {
            const prevIndex = state.queueIndex - 1;
            return { queueIndex: prevIndex, currentSong: state.queue[prevIndex], progress: 0, isPlaying: true };
          }
          return { progress: 0 };
        });
      },

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      
      setPlaying: (playing) => set({ isPlaying: playing }),
      
      seek: (seconds) => set({ progress: seconds }),
      
      setVolume: (volume) => set({ volume }),
      
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      
      toggleShuffle: () => {
        set((state) => {
          const newShuffle = !state.shuffle;
          if (newShuffle) {
            const currentSong = state.queue[state.queueIndex];
            const rest = state.queue.filter((_, i) => i !== state.queueIndex);
            const shuffledQueue = [currentSong, ...shuffleArray(rest)];
            return { 
              shuffle: true, 
              queue: shuffledQueue, 
              queueIndex: 0,
              originalQueue: [...state.queue]
            };
          } else {
            const currentSong = state.queue[state.queueIndex];
            const origIndex = state.originalQueue.findIndex(s => s.id === currentSong?.id);
            return {
              shuffle: false,
              queue: [...state.originalQueue],
              queueIndex: Math.max(0, origIndex)
            };
          }
        });
      },
      
      cycleRepeat: () => set((state) => {
        const map: Record<RepeatMode, RepeatMode> = { none: 'all', all: 'one', one: 'none' };
        return { repeat: map[state.repeat] };
      }),
      
      setProgress: (progress) => set({ progress }),
      
      setDuration: (duration) => set({ duration }),
      
      setLoading: (isLoading) => set({ isLoading }),

      appendToQueue: (songs) => set((state) => ({
        queue: [...state.queue, ...songs],
        originalQueue: [...state.originalQueue, ...songs]
      })),

      reorderQueue: (newQueue) => set((state) => {
        const currentId = state.queue[state.queueIndex]?.id;
        let newIndex = newQueue.findIndex(s => s.id === currentId);
        if (newIndex === -1) newIndex = 0;
        return { queue: newQueue, queueIndex: newIndex, isAiRadioSession: false, aiRadioSessionId: null };
      }),

      startAiRadio: (song) => {
        set(() => {
          const sessionId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2) + Date.now().toString(36);
          return {
            queue: [song],
            queueIndex: 0,
            originalQueue: [song],
            currentSong: song,
            isPlaying: true,
            progress: 0,
            isAiRadioSession: true,
            aiRadioSessionId: sessionId
          };
        });
      }
    }),
    {
      name: 'novatune-player-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const { progress, duration, isPlaying, isLoading, isAiRadioSession, aiRadioSessionId, ...rest } = state;
        return rest;
      },
    }
  )
);

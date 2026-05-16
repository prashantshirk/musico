import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSyncedLyrics, getLyrics } from '../api/lyrics';
import { usePlayerStore } from '../store/playerStore';
import { SyncedLyricsLine } from '../types';
import { X } from 'lucide-react';

interface LyricsPanelProps {
  onClose: () => void;
}

export function LyricsPanel({ onClose }: LyricsPanelProps) {
  const { currentSong, progress } = usePlayerStore();
  
  const { data: syncedLyrics, isLoading: isLoadingSynced } = useQuery({
    queryKey: ['lyrics', 'synced', currentSong?.id],
    queryFn: () => currentSong ? getSyncedLyrics(currentSong.id) : Promise.resolve([]),
    enabled: !!currentSong,
  });

  const { data: unsyncedLyrics, isLoading: isLoadingUnsynced } = useQuery({
    queryKey: ['lyrics', 'unsynced', currentSong?.artist, currentSong?.title],
    queryFn: () => (currentSong ? getLyrics(currentSong.artist, currentSong.title) : Promise.resolve(null)),
    enabled: !!currentSong && (!syncedLyrics || syncedLyrics.length === 0) && !isLoadingSynced,
  });

  const isLoading = isLoadingSynced || isLoadingUnsynced;

  let activeIndex = -1;
  const lines = syncedLyrics?.[0]?.line || [];
  
  if (lines.length > 0) {
    const msProgress = progress * 1000;
    activeIndex = lines.findIndex((line: SyncedLyricsLine, i: number) => {
      const nextLine = lines[i + 1];
      const start = Number(line.start);
      const nextStart = nextLine ? Number(nextLine.start) : Infinity;
      return msProgress >= start && msProgress < nextStart;
    });
  }

  // Scroll active line into view
  useEffect(() => {
    if (activeIndex !== -1) {
      const el = document.getElementById(`lyric-line-${activeIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex]);

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col pt-12 pb-8 px-6 animate-in slide-in-from-bottom-full duration-300">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-foreground/60 hover:text-foreground bg-white/5 rounded-full"
      >
        <X size={24} />
      </button>

      <div className="flex-1 overflow-y-auto pt-8 pb-32 mask-image-fade hide-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : lines.length > 0 ? (
          <div className="flex flex-col gap-6 text-center max-w-2xl mx-auto">
            {lines.map((line: SyncedLyricsLine, i: number) => (
              <p 
                key={i} 
                id={`lyric-line-${i}`}
                className={`text-2xl md:text-3xl lg:text-4xl font-syne font-bold transition-all duration-300 ${
                  i === activeIndex 
                    ? 'text-white scale-105' 
                    : i < activeIndex 
                      ? 'text-white/30' 
                      : 'text-white/40'
                }`}
              >
                {line.value || '♪'}
              </p>
            ))}
          </div>
        ) : unsyncedLyrics?.value ? (
          <div className="whitespace-pre-wrap text-xl md:text-2xl font-syne font-semibold text-white/80 max-w-2xl mx-auto text-center leading-relaxed">
            {unsyncedLyrics.value}
          </div>
        ) : (
          <div className="flex justify-center items-center h-full text-white/50 text-xl font-syne">
            No lyrics found
          </div>
        )}
      </div>
    </div>
  );
}

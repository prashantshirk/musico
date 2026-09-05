import { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { SongRow } from '../components/SongRow';
import { ArrowLeft, Trash2, Star, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePlayer } from '../hooks/usePlayer';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Song } from '../types';
import { star, unstar } from '../api/annotation';

export default function Queue() {
  const [, setLocation] = useLocation();
  const { queue, queueIndex, removeFromQueue, reorderQueue, clearQueue } = usePlayerStore();
  const { skipTo } = usePlayer();
  const [selectedSong, setSelectedSong] = useState<{ song: Song, index: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex(s => s.id === active.id);
      const newIndex = queue.findIndex(s => s.id === over.id);
      reorderQueue(arrayMove(queue, oldIndex, newIndex));
    }
  };

  const handleStarToggle = async () => {
    if (!selectedSong) return;
    if (selectedSong.song.starred) {
      await unstar(selectedSong.song.id, 'song');
      // In a real app we'd want to update the store here, but we rely on a refetch or local state mutation.
      // Since this is a simple PWA, we'll just close the modal for now.
    } else {
      await star(selectedSong.song.id, 'song');
    }
    setSelectedSong(null);
  };

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      <header className="pt-safe sticky top-0 bg-background/95 backdrop-blur-xl z-20 border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => window.history.back()} className="text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-syne font-bold text-foreground">Up Next</h1>
        </div>
        <button 
          onClick={clearQueue}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Clear
        </button>
      </header>

      <main className="p-4 flex flex-col gap-8 max-w-2xl mx-auto">
        {queue[queueIndex] && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">Now Playing</h2>
            <div className="bg-white/5 rounded-lg border border-border/50">
              <SongRow song={queue[queueIndex]} />
            </div>
          </section>
        )}

        {queue.length > queueIndex + 1 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">Next In Queue</h2>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={queue.slice(queueIndex + 1).map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                  {queue.slice(queueIndex + 1).map((song, i) => {
                    const actualIndex = queueIndex + 1 + i;
                    return (
                      <SortableSongRow 
                        key={song.id} 
                        song={song} 
                        index={actualIndex}
                        onRemove={() => removeFromQueue(actualIndex)}
                        onPlay={() => skipTo(actualIndex)}
                        onLongPress={() => setSelectedSong({ song, index: actualIndex })}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        )}
      </main>

      {/* Action sheet. Sits above the bottom nav (z-50), which shares a stacking
          level with it and, being later in the DOM, used to paint over the
          sheet's last row and swallow its taps. */}
      {selectedSong && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end animate-in fade-in duration-200"
          onClick={() => setSelectedSong(null)}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div 
            className="w-full bg-[#1a1a1a] rounded-t-2xl p-6 pb-safe animate-in slide-in-from-bottom-full duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col min-w-0 pr-4">
                <h3 className="text-lg font-bold text-white truncate">{selectedSong.song.title}</h3>
                <p className="text-sm text-white/60 truncate">{selectedSong.song.artist}</p>
              </div>
              <button onClick={() => setSelectedSong(null)} className="p-2 bg-white/10 rounded-full text-white/70 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={handleStarToggle}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-white font-medium"
              >
                <Star size={22} fill={selectedSong.song.starred ? "currentColor" : "none"} className={selectedSong.song.starred ? "text-primary" : ""} />
                {selectedSong.song.starred ? "Remove Star" : "Star Song"}
              </button>
              
              <button 
                onClick={() => {
                  removeFromQueue(selectedSong.index);
                  setSelectedSong(null);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all font-medium"
              >
                <Trash2 size={22} />
                Remove from Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableSongRow({ song, index, onRemove, onPlay, onLongPress }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });
  
  const touchStart = useRef({ x: 0, y: 0 });
  const touchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /* A stationary touch still produces a click on release, so a long press used
   * to open the action sheet AND skip to the track underneath it. */
  const longPressFired = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressFired.current = false;
    touchTimeout.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
      // Vibrate if supported to provide haptic feedback for long press
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(touchTimeout.current);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(touchTimeout.current);
  };

  useEffect(() => {
    return () => clearTimeout(touchTimeout.current);
  }, []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative group touch-manipulation"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        /* Swallows the click the browser synthesises when the finger lifts after
           a long press, so opening the sheet no longer also skips the queue. */
        onClickCapture={(e) => {
          if (!longPressFired.current) return;
          longPressFired.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <SongRow song={song} onPlay={onPlay} />
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-full shadow-sm hidden md:block"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

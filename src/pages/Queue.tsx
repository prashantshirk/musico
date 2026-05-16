import { usePlayerStore } from '../store/playerStore';
import { SongRow } from '../components/SongRow';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePlayer } from '../hooks/usePlayer';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function Queue() {
  const [, setLocation] = useLocation();
  const { queue, queueIndex, removeFromQueue, reorderQueue, clearQueue, playSong } = usePlayerStore();
  const { skipTo } = usePlayer();

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
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        )}
      </main>
    </div>
  );
}

function SortableSongRow({ song, index, onRemove, onPlay }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <SongRow song={song} onPlay={onPlay} />
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-full shadow-sm"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

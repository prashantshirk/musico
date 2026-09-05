import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, GripVertical, Star, Trash2 } from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import { SongRow } from '../components/SongRow';
import { Song } from '../types';
import { star, unstar } from '../api/annotation';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from '../components/ui/drawer';

export default function Queue() {
  /* Narrow selectors. Destructuring the store subscribed this page to every
   * write including the four-times-a-second progress tick, which re-rendered the
   * whole queue and every row in it while a track played. */
  const queue = usePlayerStore(state => state.queue);
  const queueIndex = usePlayerStore(state => state.queueIndex);
  const removeFromQueue = usePlayerStore(state => state.removeFromQueue);
  const reorderQueue = usePlayerStore(state => state.reorderQueue);
  const clearQueue = usePlayerStore(state => state.clearQueue);

  const { skipTo } = usePlayer();
  const [selected, setSelected] = useState<{ song: Song; index: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = queue.findIndex(s => s.id === active.id);
    const to = queue.findIndex(s => s.id === over.id);
    if (from === -1 || to === -1) return;
    reorderQueue(arrayMove(queue, from, to));
  };

  const upNext = queue.slice(queueIndex + 1);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="pt-safe sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-background/95 px-2 py-2 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:text-foreground/70"
          >
            <ArrowLeft size={24} aria-hidden="true" />
          </button>
          <h1 className="truncate font-syne text-xl font-bold text-foreground">Up Next</h1>
        </div>
        <Button
          variant="ghost"
          onClick={clearQueue}
          disabled={queue.length === 0}
          className="min-h-11 shrink-0 px-4 text-sm font-semibold text-muted-foreground"
        >
          Clear
        </Button>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-8 p-4">
        {queue[queueIndex] && (
          <section>
            <h2 className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Now playing
            </h2>
            <div className="rounded-lg border border-border bg-muted/40">
              <SongRow song={queue[queueIndex]} />
            </div>
          </section>
        )}

        {upNext.length > 0 && (
          <section>
            <div className="mb-2 flex items-baseline justify-between px-2">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Next in queue
              </h2>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {upNext.length}
              </span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={upNext.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col gap-1">
                  {upNext.map((song, i) => {
                    const actualIndex = queueIndex + 1 + i;
                    return (
                      <SortableSongRow
                        key={song.id}
                        song={song}
                        onRemove={() => removeFromQueue(actualIndex)}
                        onPlay={() => skipTo(actualIndex)}
                        onLongPress={() => setSelected({ song, index: actualIndex })}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          </section>
        )}

        {queue.length === 0 && (
          <p className="pt-24 text-center text-muted-foreground">Nothing queued.</p>
        )}
      </main>

      {/* A real bottom sheet rather than a fixed div at z-[60]. Because it
          portals to the body it no longer has to out-stack the bottom nav, and
          drag-to-dismiss, escape, focus trapping and scroll locking come from
          the primitive instead of being approximated. */}
      <Drawer
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null); }}
        shouldScaleBackground={false}
      >
        <DrawerContent className="border-border bg-card">
          {selected && (
            <>
              <DrawerHeader className="pb-2 text-left">
                <DrawerTitle className="truncate font-syne text-lg font-bold">
                  {selected.song.title}
                </DrawerTitle>
                <DrawerDescription className="truncate">{selected.song.artist}</DrawerDescription>
              </DrawerHeader>

              <div className="pb-safe-6 flex flex-col gap-1 px-4 pt-2">
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const song = selected.song;
                    setSelected(null);
                    if (song.starred) await unstar(song.id, 'song');
                    else await star(song.id, 'song');
                  }}
                  className="min-h-14 justify-start gap-4 px-4 text-base font-medium [&_svg]:size-5"
                >
                  <Star
                    fill={selected.song.starred ? 'currentColor' : 'none'}
                    className={selected.song.starred ? 'text-primary' : ''}
                  />
                  {selected.song.starred ? 'Remove star' : 'Star song'}
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    removeFromQueue(selected.index);
                    setSelected(null);
                  }}
                  className="min-h-14 justify-start gap-4 px-4 text-base font-medium text-destructive [&_svg]:size-5"
                >
                  <Trash2 />
                  Remove from queue
                </Button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

interface SortableSongRowProps {
  song: Song;
  onRemove: () => void;
  onPlay: () => void;
  onLongPress: () => void;
}

const LONG_PRESS_MS = 500;

function SortableSongRow({ song, onRemove, onPlay, onLongPress }: SortableSongRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id });

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
      if (typeof window.navigator?.vibrate === 'function') window.navigator.vibrate(50);
    }, LONG_PRESS_MS);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = Math.abs(e.touches[0].clientX - touchStart.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (dx > 10 || dy > 10) clearTimeout(touchTimeout.current);
  };

  const handleTouchEnd = () => clearTimeout(touchTimeout.current);

  useEffect(() => () => clearTimeout(touchTimeout.current), []);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative flex items-center rounded-md bg-background',
        isDragging ? 'z-10 opacity-80 shadow-lg' : 'z-0'
      )}
    >
      {/* The drag listeners live on this handle alone. Spread across the whole
          row they fought the page's own scrolling: any vertical touch past 5px
          either began a drag or got cancelled by the browser taking over, so on
          a phone reordering barely worked and scrolling felt sticky. A handle
          with touch-action:none keeps one gesture per region. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${song.title}`}
        className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors active:cursor-grabbing hover:text-foreground"
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>

      <div
        className="min-w-0 flex-1"
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

      {/* Desktop only: touch gets the same action from the long-press sheet.
          Previously this was absolutely positioned at right-4, directly on top
          of the row's own details button. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label={`Remove ${song.title} from queue`}
        className="mr-1 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 md:flex"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

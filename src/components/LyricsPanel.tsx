import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSyncedLyrics, getLyrics } from '../api/lyrics';
import { usePlayerStore } from '../store/playerStore';
import { SyncedLyricsLine } from '../types';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';
import { Drawer, DrawerContent, DrawerTitle } from './ui/drawer';

interface LyricsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* Widths chosen to look like sung lines rather than a paragraph — a uniform
 * stack of bars reads as a table, not a lyric. */
const SKELETON_WIDTHS = ['72%', '54%', '81%', '46%', '68%', '58%', '77%'];

export function LyricsPanel({ open, onOpenChange }: LyricsPanelProps) {
  /* Narrow selectors: destructuring the whole store made this component
   * re-render on every unrelated write, not just the progress tick it needs.
   *
   * The panel now stays mounted so vaul can run its own close transition, so the
   * progress read is gated on `open` — the selector still runs on every tick,
   * but returns a stable 0 while the panel is shut, which is not a re-render. */
  const currentSong = usePlayerStore((state) => state.currentSong);
  const progress = usePlayerStore((state) => (open ? state.progress : 0));

  const { data: syncedLyrics, isLoading: isLoadingSynced } = useQuery({
    queryKey: ['lyrics', 'synced', currentSong?.id],
    queryFn: () => currentSong ? getSyncedLyrics(currentSong.artist, currentSong.title, currentSong.duration) : Promise.resolve([]),
    // Only when the panel is actually open: mounted-but-shut must not fetch
    // lyrics for every track that plays.
    enabled: !!currentSong && open,
  });

  const { data: unsyncedLyrics, isLoading: isLoadingUnsynced } = useQuery({
    queryKey: ['lyrics', 'unsynced', currentSong?.artist, currentSong?.title],
    queryFn: () => (currentSong ? getLyrics(currentSong.artist, currentSong.title) : Promise.resolve(null)),
    enabled: !!currentSong && open && (!syncedLyrics || syncedLyrics.length === 0) && !isLoadingSynced,
  });

  const isLoading = isLoadingSynced || isLoadingUnsynced;

  let activeIndex = -1;
  const lines = syncedLyrics || [];

  if (lines.length > 0) {
    const msProgress = progress * 1000;
    activeIndex = lines.findIndex((line: SyncedLyricsLine, i: number) => {
      const nextLine = lines[i + 1];
      const start = Number(line.start);
      const nextStart = nextLine ? Number(nextLine.start) : Infinity;
      return msProgress >= start && msProgress < nextStart;
    });
  }

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeIndex === -1) return;
    const scroller = scrollerRef.current;
    const line = scroller?.querySelector<HTMLElement>(`[data-line="${activeIndex}"]`);
    if (!scroller || !line) return;

    /* Scoped to the scroller rather than scrollIntoView on the document: the
     * panel is portalled, and a document-level scroll would also drag whatever
     * is mounted behind it. */
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller.scrollTo({
      top: line.offsetTop - scroller.clientHeight / 2 + line.offsetHeight / 2,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeIndex]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="h-[92vh] border-border bg-background">
        <DrawerTitle className="sr-only">Lyrics</DrawerTitle>

        <div
          ref={scrollerRef}
          className="hide-scrollbar flex-1 overflow-y-auto px-6 pb-24 pt-8"
          /* The fade was previously a `mask-image-fade` class that does not
             exist in the stylesheet, so the lyrics ran hard into the drag
             handle. Declared here instead of relying on a phantom utility. */
          style={{
            maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 82%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 82%, transparent)',
          }}
        >
          {isLoading ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6" aria-label="Loading lyrics">
              {SKELETON_WIDTHS.map((width, i) => (
                <Skeleton key={i} className="h-7 rounded-lg" style={{ width }} />
              ))}
            </div>
          ) : lines.length > 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col gap-6 text-center">
              {lines.map((line: SyncedLyricsLine, i: number) => (
                <p
                  key={i}
                  data-line={i}
                  aria-current={i === activeIndex ? 'true' : undefined}
                  /* Opacity and weight carry the active line; scaling it used to
                     nudge every line below it on each beat. */
                  className={cn(
                    'font-syne text-2xl font-bold transition-colors duration-300 md:text-3xl lg:text-4xl',
                    i === activeIndex ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {line.value || '♪'}
                </p>
              ))}
            </div>
          ) : unsyncedLyrics?.value ? (
            <div className="mx-auto max-w-2xl whitespace-pre-wrap text-center font-syne text-xl font-semibold leading-relaxed text-foreground md:text-2xl">
              {unsyncedLyrics.value}
            </div>
          ) : (
            <p className="pt-16 text-center font-syne text-xl text-muted-foreground">
              No lyrics found
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

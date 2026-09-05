import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Play, Pause, SkipForward } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import { useArtworkAccent, PLAYER_ART_SIZE } from '../hooks/useArtworkAccent';
import { CoverArt } from './CoverArt';

/**
 * The mini bar reads as a small piece of hardware: an opaque, slightly
 * extruded capsule rather than another sheet of glass. The nav directly beneath
 * it is already blurred, and two stacked backdrop-filters is the expensive
 * case, so this one is solid — which also stops scrolling artwork from showing
 * through and muddying the text.
 *
 * Surfaces are semantic tokens rather than the hex values this used to hardcode,
 * so the bar follows the theme toggle on the home screen instead of staying dark
 * underneath a light app.
 */
export function MiniPlayer() {
  const [, setLocation] = useLocation();
  const { togglePlay, next } = usePlayer();

  // Narrow selectors. `currentSong` is referentially stable for the life of a
  // track, so this only re-renders on a track or play-state change.
  const currentSong = usePlayerStore(state => state.currentSong);
  const isPlaying = usePlayerStore(state => state.isPlaying);

  const artId = currentSong?.albumId || currentSong?.id;
  const accent = useArtworkAccent(artId);

  /* Progress is written straight to the node instead of through state: at 4
   * ticks a second a React render here is pure waste, and scaleX is
   * compositor-only where animating `width` is not. */
  const traceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const apply = (progress: number, duration: number) => {
      const node = traceRef.current;
      if (!node) return;
      const ratio = duration > 0 ? Math.min(1, Math.max(0, progress / duration)) : 0;
      node.style.transform = `scaleX(${ratio})`;
    };
    const initial = usePlayerStore.getState();
    apply(initial.progress, initial.duration);
    return usePlayerStore.subscribe(state => apply(state.progress, state.duration));
  }, []);

  if (!currentSong) return null;

  const open = () => setLocation('/now-playing');

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Now playing: ${currentSong.title} by ${currentSong.artist}. Open player.`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        open();
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      }}
      className="fixed left-2 right-2 z-40 flex h-14 cursor-pointer select-none items-center overflow-hidden rounded-[14px] bg-card pl-2 pr-1.5 ring-1 ring-border transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 0.5rem)',
        /* A plain drop shadow, not the white inset highlight this used to carry —
           that highlight only made sense against a permanently dark surface. */
        boxShadow: '0 12px 28px -8px rgba(0, 0, 0, 0.45)',
      }}
    >
      <CoverArt
        id={artId || ''}
        alt={currentSong.album || ''}
        size={PLAYER_ART_SIZE}
        className="h-10 w-10 shrink-0 rounded-lg bg-muted ring-1 ring-border"
      />

      <div className="ml-3 min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium leading-tight text-foreground">
          {currentSong.title}
        </p>
        <p className="truncate text-[11.5px] leading-tight text-muted-foreground">
          {currentSong.artist}
        </p>
      </div>

      {/* Press feedback is colour, not scale: a transform here nudged the text
          beside it and made the whole capsule feel loose. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:text-foreground/50"
      >
        {isPlaying
          ? <Pause size={20} fill="currentColor" aria-hidden="true" />
          : <Play size={20} fill="currentColor" aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); next(); }}
        aria-label="Next track"
        className="flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:text-foreground"
      >
        <SkipForward size={20} fill="currentColor" aria-hidden="true" />
      </button>

      {/* The capsule's bottom edge is the progress readout — no separate row of
          chrome for it. Clipped by the container's radius at both ends. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-foreground/10">
        <div
          ref={traceRef}
          className="h-full w-full origin-left"
          style={{ backgroundColor: accent, transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  );
}

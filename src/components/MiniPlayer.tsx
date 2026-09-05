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
      className="fixed left-2 right-2 z-40 flex h-14 cursor-pointer select-none items-center overflow-hidden rounded-[14px] bg-[#141416] pl-2 pr-1.5 transition-colors active:bg-[#1b1b1e]"
      style={{
        bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 0.5rem)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(255,255,255,0.07), 0 12px 28px -8px rgba(0,0,0,0.7)',
      }}
    >
      <CoverArt
        id={artId || ''}
        alt={currentSong.album || ''}
        size={PLAYER_ART_SIZE}
        className="h-10 w-10 shrink-0 rounded-lg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      />

      <div className="ml-3 min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium leading-tight text-white">
          {currentSong.title}
        </p>
        <p className="truncate text-[11.5px] leading-tight text-white/55">
          {currentSong.artist}
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-90"
      >
        {isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        aria-label="Next track"
        className="flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-white/60 transition-transform active:scale-90"
      >
        <SkipForward size={17} fill="currentColor" />
      </button>

      {/* The capsule's bottom edge is the progress readout — no separate row of
          chrome for it. Clipped by the container's radius at both ends. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.07]">
        <div
          ref={traceRef}
          className="h-full w-full origin-left"
          style={{ backgroundColor: accent, transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  );
}

import { useState } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/time';
import { withAlpha } from '../utils/color';
import { cn } from '../lib/utils';

interface ProgressBarProps {
  onSeek: (seconds: number) => void;
  /** Artwork-derived accent used for the elapsed fill. */
  accent: string;
}

/**
 * Owns the scrubber and its two timecodes. It subscribes to progress itself so
 * that the four-times-a-second tick re-renders this leaf only, instead of the
 * whole player screen.
 *
 * Built on Radix Slider rather than hand-rolled pointer math: it brings pointer
 * capture, touch handling, keyboard stepping (arrows / Home / End / PageUp) and
 * the full range ARIA contract, none of which the previous bespoke version got
 * entirely right.
 */
export function ProgressBar({ onSeek, accent }: ProgressBarProps) {
  const progress = usePlayerStore(state => state.progress);
  const duration = usePlayerStore(state => state.duration);

  /* While the thumb is held, the store keeps ticking underneath us — so the
   * dragged value has to live here and win, or the handle fights the playhead. */
  const [dragSeconds, setDragSeconds] = useState<number | null>(null);
  const isDragging = dragSeconds !== null;

  const seekable = duration > 0;
  const shown = Math.min(dragSeconds ?? progress, duration);
  const remaining = Math.max(0, duration - shown);

  return (
    <div>
      <SliderPrimitive.Root
        value={[shown]}
        max={seekable ? duration : 1}
        step={1}
        disabled={!seekable}
        aria-label="Seek"
        onValueChange={([next]) => setDragSeconds(next)}
        onValueCommit={([next]) => {
          setDragSeconds(null);
          if (seekable) onSeek(next);
        }}
        /* The player screen listens for drags to dismiss itself; without this
           a scrub would also start pulling the whole sheet down. */
        onPointerDown={(e) => e.stopPropagation()}
        className="relative flex h-11 w-full touch-none select-none items-center data-[disabled]:opacity-50"
      >
        <SliderPrimitive.Track
          className={cn(
            'relative w-full grow overflow-hidden rounded-full bg-foreground/15 transition-[height] duration-150',
            isDragging ? 'h-[5px]' : 'h-[3px]'
          )}
        >
          <SliderPrimitive.Range
            className="absolute h-full rounded-full"
            style={{ backgroundColor: accent }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          /* Hidden at rest so the bar reads as a hairline, but it stays in the
             DOM so keyboard focus and the ARIA range never disappear. */
          className={cn(
            'block rounded-full bg-foreground transition-[width,height] duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            isDragging ? 'h-3.5 w-3.5' : 'h-1 w-1 opacity-0 focus-visible:h-3.5 focus-visible:w-3.5 focus-visible:opacity-100'
          )}
          style={isDragging ? { boxShadow: `0 0 0 4px ${withAlpha(accent, 0.25)}` } : undefined}
        />
      </SliderPrimitive.Root>

      <div className="flex items-baseline justify-between font-mono text-[11px] tabular-nums tracking-[0.06em]">
        <span
          className={isDragging ? '' : 'text-muted-foreground'}
          style={isDragging ? { color: accent } : undefined}
        >
          {formatTime(shown)}
        </span>
        <span className="text-muted-foreground">-{formatTime(remaining)}</span>
      </div>
    </div>
  );
}

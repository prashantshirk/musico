import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/time';
import { withAlpha } from '../utils/color';

interface ProgressBarProps {
  onSeek: (seconds: number) => void;
  /** Artwork-derived accent used for the elapsed fill. */
  accent: string;
}

/**
 * Owns the scrubber and its two timecodes. It subscribes to progress itself so
 * that the four-times-a-second tick re-renders this leaf only, instead of the
 * whole player screen.
 */
export function ProgressBar({ onSeek, accent }: ProgressBarProps) {
  const progress = usePlayerStore(state => state.progress);
  const duration = usePlayerStore(state => state.duration);

  const barRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const [dragSeconds, setDragSeconds] = useState<number | null>(null);
  const isDragging = dragSeconds !== null;

  const shown = dragSeconds ?? progress;
  const percent = duration > 0 ? Math.min(100, Math.max(0, (shown / duration) * 100)) : 0;
  const remaining = Math.max(0, duration - shown);

  const secondsAt = (clientX: number) => {
    const node = barRef.current;
    if (!node) return 0;
    const rect = node.getBoundingClientRect();
    const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
    return Math.min(1, Math.max(0, ratio)) * durationRef.current;
  };

  useEffect(() => {
    if (!isDragging) return;

    const move = (e: PointerEvent) => setDragSeconds(secondsAt(e.clientX));
    const finish = (e: PointerEvent) => {
      const target = secondsAt(e.clientX);
      setDragSeconds(null);
      if (durationRef.current > 0) onSeek(target);
    };
    // A cancelled pointer means the browser took the gesture away (scroll
    // takeover, incoming call). Abandon the drag rather than seeking somewhere
    // the listener never actually released.
    const abandon = () => setDragSeconds(null);

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', abandon);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', abandon);
    };
  }, [isDragging, onSeek]);

  const nudge = (delta: number) => {
    if (duration <= 0) return;
    onSeek(Math.min(duration, Math.max(0, progress + delta)));
  };

  return (
    <div>
      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={`${formatTime(shown)} of ${formatTime(duration)}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          setDragSeconds(secondsAt(e.clientX));
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); nudge(5); }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-5); }
          else if (e.key === 'Home') { e.preventDefault(); onSeek(0); }
        }}
        className="flex h-11 w-full cursor-pointer touch-none items-center outline-none"
      >
        <div className="relative w-full">
          <div
            className="w-full rounded-full bg-white/[0.14] transition-[height] duration-150"
            style={{ height: isDragging ? 5 : 3 }}
          />
          <div
            className="absolute top-0 rounded-full transition-[height] duration-150"
            style={{
              height: isDragging ? 5 : 3,
              width: `${percent}%`,
              backgroundColor: accent,
            }}
          />
          {isDragging && (
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              style={{ left: `${percent}%`, boxShadow: `0 0 0 4px ${withAlpha(accent, 0.25)}` }}
            />
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between font-mono text-[11px] tabular-nums tracking-[0.06em]">
        <span style={{ color: isDragging ? accent : undefined }} className={isDragging ? '' : 'text-white/45'}>
          {formatTime(shown)}
        </span>
        <span className="text-white/35">-{formatTime(remaining)}</span>
      </div>
    </div>
  );
}

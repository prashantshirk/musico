import * as SliderPrimitive from '@radix-ui/react-slider';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';

interface VolumeSliderProps {
  volume: number;
  onVolumeChange: (vol: number) => void;
}

/**
 * Radix Slider handles pointer capture, touch and keyboard stepping, so this is
 * purely presentational — there is no local drag state to keep in sync. Volume
 * applies live on every change rather than only on release, because you judge a
 * volume by hearing it, not by watching the bar.
 */
export function VolumeSlider({ volume, onVolumeChange }: VolumeSliderProps) {
  const muted = volume === 0;
  const VolumeIcon = muted ? VolumeX : volume < 0.3 ? Volume : volume < 0.7 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onVolumeChange(muted ? 1 : 0)}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <VolumeIcon size={20} aria-hidden="true" />
      </button>

      <SliderPrimitive.Root
        value={[Math.round(volume * 100)]}
        max={100}
        step={1}
        aria-label="Volume"
        onValueChange={([next]) => onVolumeChange(next / 100)}
        onPointerDown={(e) => e.stopPropagation()}
        className="group relative flex h-11 w-24 touch-none select-none items-center md:w-32"
      >
        <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-foreground/15 transition-[height] duration-150 group-hover:h-1">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-foreground/70" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full bg-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
      </SliderPrimitive.Root>
    </div>
  );
}

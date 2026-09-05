import { useState, useRef, useEffect } from 'react';
import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react';

interface VolumeSliderProps {
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export function VolumeSlider({ volume, onVolumeChange }: VolumeSliderProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragVol, setDragVol] = useState(volume);

  const currentPercent = (isDragging ? dragVol : volume) * 100;
  const currentVol = isDragging ? dragVol : volume;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateVolume(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (isDragging) {
      updateVolume(e.clientX);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        const rawPercent = (e.clientX - rect.left) / rect.width;
        const percent = Math.max(0, Math.min(1, rawPercent));
        onVolumeChange(percent);
      }
    }
  };

  const updateVolume = (clientX: number) => {
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      const rawPercent = (clientX - rect.left) / rect.width;
      const percent = Math.max(0, Math.min(1, rawPercent));
      setDragVol(percent);
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    // Without pointercancel the drag never ends when the browser takes the
    // pointer away (scroll takeover, incoming call, tab switch): isDragging
    // stays true, the slider freezes at the dragged value, and the document
    // listeners leak.
    document.addEventListener('pointercancel', handlePointerUp);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging]);

  const VolumeIcon = currentVol === 0 ? VolumeX : currentVol < 0.3 ? Volume : currentVol < 0.7 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onVolumeChange(currentVol === 0 ? 1 : 0)}
        aria-label={currentVol === 0 ? 'Unmute' : 'Mute'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:text-white active:text-white"
      >
        <VolumeIcon size={18} />
      </button>
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(currentPercent)}
        className="group flex h-11 w-24 cursor-pointer touch-none items-center md:w-32"
      >
        <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/15 transition-all group-hover:h-1">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/70"
            style={{ width: `${currentPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

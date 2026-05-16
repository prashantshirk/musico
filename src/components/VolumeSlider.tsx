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
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    } else {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  const VolumeIcon = currentVol === 0 ? VolumeX : currentVol < 0.3 ? Volume : currentVol < 0.7 ? Volume1 : Volume2;

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={() => onVolumeChange(currentVol === 0 ? 1 : 0)} 
        className="text-white/70 hover:text-white transition-colors p-1 -m-1"
      >
        <VolumeIcon size={18} />
      </button>
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        className="w-24 md:w-32 h-6 flex items-center cursor-pointer touch-none group"
      >
        <div className="w-full h-1 bg-white/20 rounded-full relative overflow-hidden group-hover:h-1.5 transition-all">
          <div 
            className="absolute top-0 left-0 h-full bg-white rounded-full"
            style={{ width: `${currentPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

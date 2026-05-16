import { useState, useRef, useEffect, TouchEvent, MouseEvent } from 'react';

interface ProgressBarProps {
  progress: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

export function ProgressBar({ progress, duration, onSeek }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const currentPercent = duration > 0 ? (isDragging ? dragProgress : progress) / duration * 100 : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateProgress(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (isDragging) {
      updateProgress(e.clientX);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        const rawPercent = (e.clientX - rect.left) / rect.width;
        const percent = Math.max(0, Math.min(1, rawPercent));
        onSeek(percent * duration);
      }
    }
  };

  const updateProgress = (clientX: number) => {
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      const rawPercent = (clientX - rect.left) / rect.width;
      const percent = Math.max(0, Math.min(1, rawPercent));
      setDragProgress(percent * duration);
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
  }, [isDragging, duration]);

  return (
    <div
      ref={barRef}
      onPointerDown={handlePointerDown}
      className="w-full h-8 flex items-center cursor-pointer touch-none group"
    >
      <div className="w-full h-1.5 bg-white/20 rounded-full relative overflow-hidden group-hover:h-2 transition-all">
        <div 
          className="absolute top-0 left-0 h-full bg-white rounded-full"
          style={{ width: `${currentPercent}%` }}
        />
      </div>
    </div>
  );
}

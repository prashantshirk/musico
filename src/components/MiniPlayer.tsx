import { Link } from 'wouter';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import { coverArtUrl } from '../api/client';
import { Play, Pause, SkipForward } from 'lucide-react';
import { useLocation } from 'wouter';

export function MiniPlayer() {
  const { currentSong, isPlaying, progress, duration } = usePlayerStore();
  const { togglePlay, next } = usePlayer();
  const [, setLocation] = useLocation();

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div 
      className="fixed left-2 right-2 h-14 bg-card/70 backdrop-blur-xl border border-white/10 rounded-xl z-40 cursor-pointer overflow-hidden flex flex-col shadow-2xl transition-transform active:scale-95"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 0.5rem)' }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setLocation('/now-playing');
      }}
    >
      <div className="flex-1 flex items-center px-2 gap-3">
        <img 
          src={coverArtUrl(currentSong.id, 100)} 
          alt={currentSong.album} 
          className="w-10 h-10 rounded-md object-cover bg-muted shadow-md"
        />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-sm font-semibold truncate text-foreground">{currentSong.title}</p>
          <p className="text-xs text-muted-foreground truncate">{currentSong.artist}</p>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
            className="p-4 -m-2 text-foreground hover:text-primary active:scale-90 transition-all"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); next(); }} 
            className="p-4 -m-2 text-foreground hover:text-primary active:scale-90 transition-all mr-1"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
      </div>
      <div className="h-0.5 bg-white/5 w-full absolute bottom-0 left-0">
        <div 
          className="h-full bg-primary" 
          style={{ width: `${progressPercent}%`, transition: 'width 0.1s linear' }}
        />
      </div>
    </div>
  );
}

import { Song } from '../types';
import { CoverArt } from './CoverArt';
import { formatTime } from '../utils/time';
import { Star, MoreVertical } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useState } from 'react';
import { star, unstar } from '../api/annotation';

interface SongRowProps {
  song: Song;
  index?: number;
  onPlay?: () => void;
  showCover?: boolean;
}

export function SongRow({ song, index, onPlay, showCover = true }: SongRowProps) {
  const { currentSong, isPlaying } = usePlayerStore();
  const isCurrent = currentSong?.id === song.id;
  const [isStarred, setIsStarred] = useState(!!song.starred);
  const [showInfo, setShowInfo] = useState(false);

  const handleStar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStarred) {
      unstar(song.id, 'song');
      setIsStarred(false);
    } else {
      star(song.id, 'song');
      setIsStarred(true);
    }
  };

  return (
    <div 
      className="flex items-center gap-3 p-2 hover:bg-white/5 active:bg-white/10 rounded-md cursor-pointer group select-none transition-colors"
      onClick={onPlay}
    >
      {index !== undefined && !showCover && (
        <div className="w-6 text-center text-sm text-muted-foreground">
          {isCurrent && isPlaying ? (
            <div className="flex items-end justify-center gap-0.5 h-4">
              <div className="w-1 bg-primary animate-[pulse-bars_1s_ease-in-out_infinite]" />
              <div className="w-1 bg-primary animate-[pulse-bars_1s_ease-in-out_0.2s_infinite]" />
              <div className="w-1 bg-primary animate-[pulse-bars_1s_ease-in-out_0.4s_infinite]" />
            </div>
          ) : (
            <span className={isCurrent ? "text-primary" : ""}>{index + 1}</span>
          )}
        </div>
      )}

      {showCover && (
        <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
          <CoverArt
            id={song.albumId || song.id}
            alt={song.album || ''}
            size={80}
            className="w-full h-full"
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium truncate ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
          {song.title}
        </p>
        <p className="text-sm text-muted-foreground truncate">
          {song.artist}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={handleStar}
          className={`p-2 rounded-full ${isStarred ? 'text-primary' : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100'} transition-all`}
        >
          <Star size={18} fill={isStarred ? "currentColor" : "none"} />
        </button>
        <div className="text-sm text-muted-foreground min-w-[3ch] text-right">
          {formatTime(song.duration)}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowInfo(true); }}
          className="p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {showInfo && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-default animate-in fade-in duration-200"
          onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
        >
          <div 
            className="bg-card border border-border w-full max-w-sm rounded-xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-md overflow-hidden shadow-md flex-shrink-0">
                <CoverArt
                  id={song.albumId || song.id}
                  alt={song.album || ''}
                  size={200}
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-syne font-bold text-xl text-foreground mb-1">{song.title}</h3>
                <p className="text-primary font-medium text-sm">{song.artist}</p>
                <p className="text-muted-foreground text-sm truncate">{song.album}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
                <p className="font-mono text-sm">{formatTime(song.duration)}</p>
              </div>
              {song.year && (
                <div className="bg-white/5 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Year</p>
                  <p className="text-sm">{song.year}</p>
                </div>
              )}
              {song.genre && (
                <div className="bg-white/5 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Genre</p>
                  <p className="text-sm">{song.genre}</p>
                </div>
              )}
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
              className="mt-2 w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

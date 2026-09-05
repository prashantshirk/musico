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
  // Boolean selectors, not the whole store. A library page renders hundreds of
  // these; subscribing to the full store re-rendered every row on every
  // progress tick instead of just the row that actually changed.
  const isCurrent = usePlayerStore(state => state.currentSong?.id === song.id);
  const isPlaying = usePlayerStore(state => state.isPlaying);
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay?.(); }
      }}
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

      <div className="flex items-center gap-1">
        {/* These were `opacity-0 group-hover:opacity-100`. There is no hover on a
            phone, so they stayed invisible while still absorbing every tap in the
            right ~80px of the row — which is most of "touch doesn't work". Now
            they are dim but present, and sized to the 44px minimum target. */}
        <button
          onClick={handleStar}
          aria-label={isStarred ? `Unstar ${song.title}` : `Star ${song.title}`}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            isStarred ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground active:text-foreground'
          }`}
        >
          <Star size={18} fill={isStarred ? 'currentColor' : 'none'} />
        </button>
        <div className="text-sm text-muted-foreground min-w-[4ch] text-right font-mono tabular-nums">
          {formatTime(song.duration)}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowInfo(true); }}
          aria-label={`Details for ${song.title}`}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground active:text-foreground transition-colors"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {showInfo && (
        <div
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-default animate-in fade-in duration-200"
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

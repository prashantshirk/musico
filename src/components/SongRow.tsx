import { useState } from 'react';
import { Song } from '../types';
import { CoverArt } from './CoverArt';
import { formatTime } from '../utils/time';
import { Star, MoreVertical } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useSongMenuStore } from '../store/songMenuStore';
import { star, unstar } from '../api/annotation';
import { cn } from '../lib/utils';

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
  const openSongMenu = useSongMenuStore(state => state.openSongMenu);
  const [isStarred, setIsStarred] = useState(!!song.starred);

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
      /* hover-elevate/active-elevate-2 are this project's own interaction
         overlays; they tint via ::after, so the press state never moves the row
         and it reads correctly in both themes. */
      className="hover-elevate active-elevate-2 group flex cursor-pointer select-none items-center gap-3 rounded-md p-2"
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
            <div className="flex h-4 items-end justify-center gap-0.5" aria-label="Now playing">
              <div className="w-1 bg-primary animate-[pulse-bars_1s_ease-in-out_infinite]" />
              <div className="w-1 bg-primary animate-[pulse-bars_1s_ease-in-out_0.2s_infinite]" />
              <div className="w-1 bg-primary animate-[pulse-bars_1s_ease-in-out_0.4s_infinite]" />
            </div>
          ) : (
            <span className={isCurrent ? 'text-primary' : ''}>{index + 1}</span>
          )}
        </div>
      )}

      {showCover && (
        <CoverArt
          id={song.albumId || song.id}
          alt={song.album || ''}
          size={80}
          className="h-12 w-12 shrink-0 rounded bg-muted"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-base font-medium', isCurrent ? 'text-primary' : 'text-foreground')}>
          {song.title}
        </p>
        <p className="truncate text-sm text-muted-foreground">{song.artist}</p>
      </div>

      <div className="flex items-center gap-1">
        {/* These were `opacity-0 group-hover:opacity-100`. There is no hover on a
            phone, so they stayed invisible while still absorbing every tap in the
            right ~80px of the row — which is most of "touch doesn't work". Now
            they are dim but present, and sized to the 44px minimum target. */}
        <button
          type="button"
          onClick={handleStar}
          aria-label={isStarred ? `Unstar ${song.title}` : `Star ${song.title}`}
          aria-pressed={isStarred}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
            isStarred ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:text-foreground'
          )}
        >
          <Star size={20} fill={isStarred ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        <span className="min-w-[4ch] text-right font-mono text-sm tabular-nums text-muted-foreground">
          {formatTime(song.duration)}
        </span>
        <button
          type="button"
          /* Also stops the pointer stream, not just the click: this row is a
             role="button" that starts playback, and on a phone a tap that ends
             on the glyph would otherwise reach both handlers. */
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openSongMenu(song); }}
          aria-label={`More options for ${song.title}`}
          aria-haspopup="menu"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
        >
          <MoreVertical size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

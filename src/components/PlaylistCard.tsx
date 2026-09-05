import { Link } from 'wouter';
import { ListMusic } from 'lucide-react';
import { Playlist } from '../types';
import { CoverArt } from './CoverArt';
import { cn } from '../lib/utils';

interface PlaylistCardProps {
  playlist: Playlist;
  className?: string;
}

/**
 * Same treatment as AlbumCard — art fills the cell, the frame is a single hairline
 * ring, and the label sits under it rather than in a panel. The difference is the
 * fallback: a playlist often has no artwork at all, and a grey square with a glyph
 * is more honest than a broken image request.
 *
 * Width lives on the caller via `className` (tailwind-merge lets `w-full` beat the
 * default), so the same card works in a rail and in a grid.
 */
export function PlaylistCard({ playlist, className }: PlaylistCardProps) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className={cn('group block w-36 shrink-0 md:w-44', className)}
    >
      <div className="hover-elevate active-elevate-2 relative aspect-square w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        {playlist.coverArt ? (
          <CoverArt
            id={playlist.id}
            alt={playlist.name}
            size={300}
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ListMusic size={30} className="text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="mt-2.5 truncate text-[13px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
        {playlist.name}
      </p>
      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {playlist.songCount} {playlist.songCount === 1 ? 'track' : 'tracks'}
      </p>
    </Link>
  );
}

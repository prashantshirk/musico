import { Link } from 'wouter';
import { Artist } from '../types';
import { CoverArt } from './CoverArt';
import { cn } from '@/lib/utils';

interface ArtistCardProps {
  artist: Artist;
  /** Callers own the width. Merged through `cn`, so `w-full` beats the default. */
  className?: string;
}

/** Same change as the album sleeve: the panel around the portrait is gone, so
 *  the portrait itself gets the full width of the cell. */
export function ArtistCard({ artist, className }: ArtistCardProps) {
  return (
    <Link
      href={`/artist/${artist.id}`}
      className={cn('group block w-28 shrink-0 md:w-32', className)}
    >
      <div className="hover-elevate active-elevate-2 relative aspect-square w-full overflow-hidden rounded-full bg-muted ring-1 ring-border transition-shadow group-hover:ring-foreground/20">
        {artist.coverArt || artist.id ? (
          <CoverArt
            id={artist.id}
            alt={artist.name}
            size={300}
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary font-syne text-2xl font-bold text-secondary-foreground">
            {artist.name.charAt(0)}
          </div>
        )}
      </div>
      <p className="mt-2.5 truncate text-center text-[13px] font-semibold leading-snug text-foreground">
        {artist.name}
      </p>
    </Link>
  );
}

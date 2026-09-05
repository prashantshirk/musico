import { Link } from 'wouter';
import { Album } from '../types';
import { CoverArt } from './CoverArt';
import { cn } from '@/lib/utils';

interface AlbumCardProps {
  album: Album;
  /** Callers own the width. Merged through `cn`, so `w-full` beats the default. */
  className?: string;
}

/**
 * The sleeve is the card. This used to wrap the artwork in a bordered,
 * blurred, shadowed panel which then framed a *second* rounded rectangle — a
 * double frame that shrank the art by the width of its own padding and added
 * two borders' worth of noise to every item in the app. Now the art is the
 * object, at full cell width, and the type sits directly beneath it on the page.
 */
export function AlbumCard({ album, className }: AlbumCardProps) {
  return (
    <Link
      href={`/album/${album.id}`}
      className={cn('group block w-36 shrink-0 md:w-44', className)}
    >
      {/* Press feedback is the project's own overlay, painted by ::after on this
          element and clipped by its radius. A transform would nudge the
          neighbouring sleeves in a rail. */}
      <div className="hover-elevate active-elevate-2 relative aspect-square w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        <CoverArt
          id={album.id}
          alt={album.name}
          size={300}
          className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <p className="mt-2.5 truncate text-[13px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
        {album.name}
      </p>
      {/* Mono at a small size and wide tracking reads as metadata rather than as
          a second, competing title — the same treatment as the eyebrow on the
          album page. */}
      <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {album.artist}
      </p>
    </Link>
  );
}

import { Link } from 'wouter';
import { Artist } from '../types';
import { CoverArt } from './CoverArt';

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link href={`/artist/${artist.id}`}>
      <div className="flex flex-col items-center gap-3 cursor-pointer group w-28 md:w-36 bg-card/20 hover:bg-card/40 backdrop-blur-sm p-3 rounded-2xl transition-all active:scale-95">
        <div className="relative aspect-square w-full rounded-full overflow-hidden bg-muted shadow-lg ring-1 ring-white/10 group-hover:ring-primary/50 transition-all">
          {artist.coverArt || artist.id ? (
            <CoverArt
              id={artist.id}
              alt={artist.name}
              size={300}
              className="w-full h-full transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary text-secondary-foreground text-3xl font-bold font-syne">
              {artist.name.charAt(0)}
            </div>
          )}
        </div>
        <p className="font-semibold text-sm truncate text-foreground w-full text-center group-hover:text-primary transition-colors">{artist.name}</p>
      </div>
    </Link>
  );
}


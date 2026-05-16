import { Link } from 'wouter';
import { Album } from '../types';
import { coverArtUrl } from '../api/client';

interface AlbumCardProps {
  album: Album;
}

export function AlbumCard({ album }: AlbumCardProps) {
  return (
    <Link href={`/album/${album.id}`}>
      <div className="flex flex-col gap-2 cursor-pointer group w-32 md:w-40 lg:w-48 bg-card/40 backdrop-blur-md p-2 rounded-xl border border-white/5 shadow-lg transition-transform active:scale-95">
        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted shadow-sm">
          <img 
            src={coverArtUrl(album.id, 300)} 
            alt={album.name} 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <div className="px-1 mt-1">
          <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">{album.name}</p>
          <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
        </div>
      </div>
    </Link>
  );
}

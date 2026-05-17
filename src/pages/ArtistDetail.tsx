import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { getArtist, getArtistInfo, getTopSongs } from '../api/browsing';
import { coverArtUrl } from '../api/client';
import { AlbumCard } from '../components/AlbumCard';
import { SongRow } from '../components/SongRow';
import { ArrowLeft } from 'lucide-react';
import { ArtistCard } from '../components/ArtistCard';
import { usePlayer } from '../hooks/usePlayer';

export default function ArtistDetail() {
  const [, params] = useRoute('/artist/:id');
  const id = params?.id;
  const { playAlbum } = usePlayer();

  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => getArtist(id!),
    enabled: !!id,
  });

  const { data: topSongs } = useQuery({
    queryKey: ['artist-top-songs', artist?.name],
    queryFn: () => getTopSongs(artist!.name, 5),
    enabled: !!artist?.name,
  });

  const { data: artistInfo } = useQuery({
    queryKey: ['artist-info', id],
    queryFn: () => getArtistInfo(id!),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background pb-32">
      <div className="relative h-64 md:h-80 w-full bg-muted overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-6 left-6 md:left-12">
          <div className="h-12 w-64 bg-white/10 rounded mb-2" />
          <div className="h-4 w-24 bg-white/10 rounded" />
        </div>
      </div>
      <main className="p-4 md:p-8 max-w-screen-xl mx-auto flex flex-col gap-12">
        <section>
          <div className="h-8 w-32 bg-white/5 rounded mb-4 animate-pulse" />
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 w-full bg-white/5 rounded-md animate-pulse" />
            ))}
          </div>
        </section>
        <section>
          <div className="h-8 w-32 bg-white/5 rounded mb-4 animate-pulse" />
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-40 h-56 bg-white/5 rounded-lg animate-pulse shrink-0" />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
  if (!artist) return null;

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      <div className="relative h-64 md:h-80 w-full bg-muted overflow-hidden">
        <button 
          onClick={() => window.history.back()}
          className="absolute top-safe mt-4 left-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white z-20 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        
        {artistInfo?.largeImageUrl || artist.id ? (
          <img 
            src={artistInfo?.largeImageUrl || coverArtUrl(artist.id, 800)}
            alt={artist.name}
            className="w-full h-full object-cover opacity-60"
          />
        ) : null}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute bottom-6 left-6 md:left-12">
          <h1 className="text-5xl md:text-7xl font-syne font-bold text-white drop-shadow-lg">
            {artist.name}
          </h1>
          <p className="text-white/80 mt-2 font-medium">
            {artist.albumCount} albums
          </p>
        </div>
      </div>

      <main className="p-4 md:p-8 max-w-screen-xl mx-auto flex flex-col gap-12">
        {topSongs && topSongs.length > 0 && (
          <section>
            <h2 className="text-2xl font-syne font-bold mb-4">Popular</h2>
            <div className="flex flex-col gap-1">
              {topSongs.map((song: any, index: number) => (
                <SongRow 
                  key={song.id} 
                  song={song} 
                  index={index}
                  onPlay={() => playAlbum(topSongs, index)}
                />
              ))}
            </div>
          </section>
        )}

        {artist.album && artist.album.length > 0 && (
          <section>
            <h2 className="text-2xl font-syne font-bold mb-4">Albums</h2>
            <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4">
              {artist.album.map((album: any) => (
                <div key={album.id} className="flex-shrink-0">
                  <AlbumCard album={album} />
                </div>
              ))}
            </div>
          </section>
        )}

        {artistInfo?.similarArtist && artistInfo.similarArtist.length > 0 && (
          <section>
            <h2 className="text-2xl font-syne font-bold mb-4">Fans Also Like</h2>
            <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4">
              {artistInfo.similarArtist.map((sim: any) => (
                <div key={sim.id} className="flex-shrink-0">
                  <ArtistCard artist={sim} />
                </div>
              ))}
            </div>
          </section>
        )}

        {artistInfo?.biography && (
          <section className="pt-8 border-t border-border/50">
            <h2 className="text-2xl font-syne font-bold mb-4">About</h2>
            <div 
              className="text-muted-foreground leading-relaxed text-sm md:text-base"
              dangerouslySetInnerHTML={{ __html: artistInfo.biography }}
            />
          </section>
        )}
      </main>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { getArtist, getArtistInfo, getTopSongs } from '../api/browsing';
import { coverArtUrl } from '../api/client';
import { AlbumCard } from '../components/AlbumCard';
import { SongRow } from '../components/SongRow';
import { ArrowLeft } from 'lucide-react';
import { ArtistCard } from '../components/ArtistCard';
import { usePlayer } from '../hooks/usePlayer';
import { Skeleton } from '../components/ui/skeleton';

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
      <div className="relative h-64 w-full overflow-hidden bg-muted md:h-80">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-6 left-6 md:left-12">
          <Skeleton className="mb-2 h-12 w-64" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <main className="mx-auto flex max-w-screen-xl flex-col gap-12 p-4 md:p-8">
        <section>
          <Skeleton className="mb-4 h-8 w-32" />
          <div className="flex flex-col gap-2">
            {['86%', '74%', '92%', '68%', '80%'].map((w, i) => (
              <div key={i} className="flex h-16 items-center">
                <Skeleton className="h-4 flex-none" style={{ width: w }} />
              </div>
            ))}
          </div>
        </section>
        <section>
          <Skeleton className="mb-4 h-8 w-32" />
          <div className="flex gap-4">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-56 w-40 shrink-0 rounded-lg" />
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
        {/* This one keeps the black scrim: it sits at the top of the hero where
            the gradient is transparent, so it really is on top of the photo. */}
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Back"
          className="absolute top-safe left-2 z-20 mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors active:bg-black/60"
        >
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        
        {artistInfo?.largeImageUrl || artist.id ? (
          <img 
            src={artistInfo?.largeImageUrl || coverArtUrl(artist.id, 800)}
            alt={artist.name}
            className="w-full h-full object-cover opacity-60"
          />
        ) : null}
        
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {/* The name sits in the bottom of the hero, where that gradient has
            already resolved to the page background — so it follows the theme
            rather than being permanently white. */}
        <div className="absolute bottom-6 left-6 md:left-12">
          <h1 className="font-syne text-5xl font-bold leading-[0.95] tracking-[-0.03em] text-foreground md:text-7xl">
            {artist.name}
          </h1>
          <p className="mt-2 font-medium text-muted-foreground">
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

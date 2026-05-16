import { useQuery } from '@tanstack/react-query';
import { getAlbumList, getStarred, getRandomSongs } from '../api/browsing';
import { AlbumCard } from '../components/AlbumCard';
import { SongRow } from '../components/SongRow';
import { usePlayer } from '../hooks/usePlayer';

export default function Home() {
  const { playAlbum } = usePlayer();

  const { data: recentAlbums, isLoading: loadingRecent } = useQuery({
    queryKey: ['albums', 'recent'],
    queryFn: () => getAlbumList('recent', 10),
  });

  const { data: newAlbums, isLoading: loadingNew } = useQuery({
    queryKey: ['albums', 'newest'],
    queryFn: () => getAlbumList('newest', 10),
  });

  const { data: frequentAlbums, isLoading: loadingFrequent } = useQuery({
    queryKey: ['albums', 'frequent'],
    queryFn: () => getAlbumList('frequent', 10),
  });

  const { data: starred, isLoading: loadingStarred } = useQuery({
    queryKey: ['starred'],
    queryFn: getStarred,
  });

  const { data: randomSongs, isLoading: loadingRandom } = useQuery({
    queryKey: ['random-mix'],
    queryFn: () => getRandomSongs(10),
    staleTime: 1000 * 60 * 5, // Keep random mix for 5 mins
  });

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-xl font-syne font-bold mb-4 px-4">{children}</h2>
  );

  const AlbumRow = ({ albums, loading }: { albums?: any[], loading: boolean }) => (
    <div className="flex overflow-x-auto px-4 pb-4 gap-4 hide-scrollbar">
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 w-32 md:w-40 lg:w-48 flex-shrink-0 animate-pulse">
            <div className="aspect-square bg-muted rounded-md" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))
      ) : albums?.length ? (
        albums.map(album => (
          <div key={album.id} className="flex-shrink-0">
            <AlbumCard album={album} />
          </div>
        ))
      ) : (
        <p className="text-muted-foreground text-sm">No albums found.</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      <header className="pt-safe pb-4 px-4 sticky top-0 bg-background/80 backdrop-blur-xl z-10 border-b border-border">
        <h1 className="text-3xl font-syne font-bold text-foreground mt-4">Home</h1>
      </header>

      <main className="flex flex-col gap-8 pt-6">
        <section>
          <SectionTitle>Recently Played</SectionTitle>
          <AlbumRow albums={recentAlbums} loading={loadingRecent} />
        </section>

        <section>
          <SectionTitle>Recently Added</SectionTitle>
          <AlbumRow albums={newAlbums} loading={loadingNew} />
        </section>

        {starred?.song && starred.song.length > 0 && (
          <section className="px-4">
            <SectionTitle>Starred Songs</SectionTitle>
            <div className="flex flex-col gap-1">
              {starred.song.slice(0, 10).map((song: any) => (
                <SongRow 
                  key={song.id} 
                  song={song} 
                  onPlay={() => playAlbum(starred.song, starred.song.findIndex((s: any) => s.id === song.id))} 
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle>Most Played</SectionTitle>
          <AlbumRow albums={frequentAlbums} loading={loadingFrequent} />
        </section>

        {randomSongs && randomSongs.length > 0 && (
          <section className="px-4">
            <SectionTitle>Random Mix</SectionTitle>
            <div className="flex flex-col gap-1">
              {randomSongs.map((song: any) => (
                <SongRow 
                  key={song.id} 
                  song={song} 
                  onPlay={() => playAlbum(randomSongs, randomSongs.findIndex((s: any) => s.id === song.id))} 
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

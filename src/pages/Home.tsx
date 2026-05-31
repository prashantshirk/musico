import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAlbumList, getStarred, getRandomSongs } from '../api/browsing';
import { AlbumCard } from '../components/AlbumCard';
import { SongRow } from '../components/SongRow';
import { usePlayer } from '../hooks/usePlayer';
import { Moon, Sun } from 'lucide-react';

const THEME_STORAGE_KEY = 'musico-theme';

export default function Home() {
  const { playAlbum } = usePlayer();
  const [loadExtraSections, setLoadExtraSections] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadExtraSections(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  const { data: recentAlbums, isLoading: loadingRecent } = useQuery({
    queryKey: ['albums', 'recent'],
    queryFn: () => getAlbumList('recent', 8),
  });

  const { data: newAlbums, isLoading: loadingNew } = useQuery({
    queryKey: ['albums', 'newest'],
    queryFn: () => getAlbumList('newest', 8),
  });

  const { data: frequentAlbums, isLoading: loadingFrequent } = useQuery({
    queryKey: ['albums', 'frequent'],
    queryFn: () => getAlbumList('frequent', 8),
    enabled: loadExtraSections,
  });

  const { data: starred, isLoading: loadingStarred } = useQuery({
    queryKey: ['starred'],
    queryFn: getStarred,
    enabled: loadExtraSections,
  });

  const { data: randomSongs, isLoading: loadingRandom } = useQuery({
    queryKey: ['random-mix'],
    queryFn: () => getRandomSongs(8),
    staleTime: 1000 * 60 * 5, // Keep random mix for 5 mins
    enabled: loadExtraSections,
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

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
        <div className="flex items-center justify-between mt-4">
          <h1 className="text-3xl font-syne font-bold text-foreground">Home</h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
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

        {loadExtraSections && loadingStarred && (
          <section className="px-4">
            <SectionTitle>Starred Songs</SectionTitle>
            <div className="h-24 bg-muted/50 rounded-md animate-pulse" />
          </section>
        )}

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

        {loadExtraSections && (
          <section>
            <SectionTitle>Most Played</SectionTitle>
            <AlbumRow albums={frequentAlbums} loading={loadingFrequent} />
          </section>
        )}

        {loadExtraSections && loadingRandom && (
          <section className="px-4">
            <SectionTitle>Random Mix</SectionTitle>
            <div className="h-24 bg-muted/50 rounded-md animate-pulse" />
          </section>
        )}

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

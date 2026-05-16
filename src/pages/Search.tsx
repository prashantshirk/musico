import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { search } from '../api/search';
import { Search as SearchIcon } from 'lucide-react';
import { SongRow } from '../components/SongRow';
import { AlbumCard } from '../components/AlbumCard';
import { ArtistCard } from '../components/ArtistCard';
import { usePlayer } from '../hooks/usePlayer';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { playAlbum } = usePlayer();

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  });

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      <header className="pt-safe sticky top-0 bg-background/95 backdrop-blur-xl z-20 border-b border-border p-4">
        <h1 className="text-3xl font-syne font-bold text-foreground mb-4">Search</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="search"
            autoFocus
            placeholder="Songs, Artists, Albums..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-md bg-input text-foreground border-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>
      </header>

      <main className="p-4">
        {isLoading && query.length > 1 && (
          <div className="flex justify-center mt-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        )}

        {!isLoading && results && debouncedQuery.length > 1 && (
          <div className="flex flex-col gap-8">
            {results.songs.length > 0 && (
              <section>
                <h2 className="text-xl font-syne font-bold mb-4">Songs</h2>
                <div className="flex flex-col gap-1">
                  {results.songs.map((song: any, index: number) => (
                    <SongRow 
                      key={song.id} 
                      song={song} 
                      onPlay={() => playAlbum(results.songs, index)} 
                    />
                  ))}
                </div>
              </section>
            )}

            {results.artists.length > 0 && (
              <section>
                <h2 className="text-xl font-syne font-bold mb-4">Artists</h2>
                <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-2">
                  {results.artists.map((artist: any) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            )}

            {results.albums.length > 0 && (
              <section>
                <h2 className="text-xl font-syne font-bold mb-4">Albums</h2>
                <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-2">
                  {results.albums.map((album: any) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
              </section>
            )}

            {results.songs.length === 0 && results.artists.length === 0 && results.albums.length === 0 && (
              <div className="text-center mt-12 text-muted-foreground font-medium">
                No results found for "{debouncedQuery}"
              </div>
            )}
          </div>
        )}

        {debouncedQuery.length <= 1 && (
          <div className="text-center mt-24 text-muted-foreground font-syne">
            Find your favorite music
          </div>
        )}
      </main>
    </div>
  );
}

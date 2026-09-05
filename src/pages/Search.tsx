import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { search } from '../api/search';
import { Search as SearchIcon } from 'lucide-react';
import { SongRow } from '../components/SongRow';
import { AlbumCard } from '../components/AlbumCard';
import { ArtistCard } from '../components/ArtistCard';
import { usePlayer } from '../hooks/usePlayer';
import { Skeleton } from '../components/ui/skeleton';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/** Same section mark as the home rails, so the two pages read as one app. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-3">
      <h2 className="font-syne text-[13px] font-bold uppercase tracking-[0.14em] text-foreground">
        {children}
      </h2>
      <div className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}

export default function Search() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { playAlbum, playIndividualSong } = usePlayer();

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => search(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  });

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      <header className="pt-safe sticky top-0 z-20 border-b border-border bg-background/95 p-4 backdrop-blur-xl">
        {/* The field is the page. A 3xl "Search" heading sitting directly above a
            search input is a label for something that already labels itself, so
            the weight goes to the input instead. */}
        <div className="relative mt-1">
          <SearchIcon
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
            aria-hidden="true"
          />
          <input
            type="search"
            autoFocus
            aria-label="Search your library"
            placeholder="Songs, artists, albums"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-full border border-border bg-secondary pl-11 pr-4 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/30"
          />
        </div>
      </header>

      <main className="p-4">
        {isLoading && query.length > 1 && (
          /* Was a hand-rolled spinning ring. Skeletons in the shape of the rows
             that are about to arrive are the language the rest of the app uses. */
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        )}

        {!isLoading && results && debouncedQuery.length > 1 && (
          <div className="flex flex-col gap-8">
            {results.songs.length > 0 && (
              <section>
                <SectionTitle>Songs</SectionTitle>
                <div className="flex flex-col gap-1">
                  {results.songs.map((song: any, index: number) => (
                    <SongRow 
                      key={song.id} 
                      song={song} 
                      onPlay={() => playIndividualSong(song)} 
                    />
                  ))}
                </div>
              </section>
            )}

            {results.artists.length > 0 && (
              <section>
                <SectionTitle>Artists</SectionTitle>
                <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-2">
                  {results.artists.map((artist: any) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            )}

            {results.albums.length > 0 && (
              <section>
                <SectionTitle>Albums</SectionTitle>
                <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-2">
                  {results.albums.map((album: any) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
              </section>
            )}

            {results.songs.length === 0 && results.artists.length === 0 && results.albums.length === 0 && (
              <div className="mt-16 text-center">
                <p className="font-syne text-base font-bold text-foreground">No matches</p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Nothing in your library matches "{debouncedQuery}".
                </p>
              </div>
            )}
          </div>
        )}

        {debouncedQuery.length <= 1 && (
          /* "Find your favorite music" was mood, not direction. */
          <p className="mt-20 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Start typing to search your library
          </p>
        )}
      </main>
    </div>
  );
}

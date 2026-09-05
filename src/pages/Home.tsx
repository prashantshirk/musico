import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getAlbumList, getStarred, getRandomSongs } from '../api/browsing';
import { getPlaylists } from '../api/playlists';
import { AlbumCard } from '../components/AlbumCard';
import { PlaylistCard } from '../components/PlaylistCard';
import { CoverArt } from '../components/CoverArt';
import { SongRow } from '../components/SongRow';
import { usePlayer } from '../hooks/usePlayer';
import { useArtworkAccent } from '../hooks/useArtworkAccent';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, getInitialTheme, ThemeMode } from '../utils/theme';
import { Skeleton } from '../components/ui/skeleton';

export default function Home() {
  const { playAlbum, playIndividualSong } = usePlayer();
  const [loadExtraSections, setLoadExtraSections] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadExtraSections(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  const { data: recentAlbums, isLoading: loadingRecent } = useQuery({
    queryKey: ['albums', 'recent'],
    queryFn: () => getAlbumList('recent', 8),
    placeholderData: keepPreviousData,
  });

  const { data: newAlbums, isLoading: loadingNew } = useQuery({
    queryKey: ['albums', 'newest'],
    queryFn: () => getAlbumList('newest', 8),
    placeholderData: keepPreviousData,
  });

  const { data: frequentAlbums, isLoading: loadingFrequent } = useQuery({
    queryKey: ['albums', 'frequent'],
    queryFn: () => getAlbumList('frequent', 8),
    enabled: loadExtraSections,
    placeholderData: keepPreviousData,
  });

  const { data: starred, isLoading: loadingStarred } = useQuery({
    queryKey: ['starred'],
    queryFn: getStarred,
    enabled: loadExtraSections,
    placeholderData: keepPreviousData,
  });

  /* Same query key the library tab and the action sheet's playlist picker use, so
   * whichever one you reach first warms the other two. Deferred with the rest of
   * the below-the-fold rails. */
  const { data: playlists, isLoading: loadingPlaylists } = useQuery({
    queryKey: ['playlists'],
    queryFn: getPlaylists,
    enabled: loadExtraSections,
  });

  const { data: randomSongs, isLoading: loadingRandom } = useQuery({
    queryKey: ['random-mix'],
    queryFn: () => getRandomSongs(8),
    staleTime: 1000 * 60 * 5, // Keep random mix for 5 mins
    enabled: loadExtraSections,
    placeholderData: keepPreviousData,
  });

  /* The hero is whatever record you were last on — the one thing on this page
   * that is specific to this library rather than to music apps in general. Falls
   * back to the newest release until the recents land. Both queries already
   * exist above, so this costs no extra request, and the accent is read from the
   * sleeve that is already in the cover-art cache. */
  const feature = recentAlbums?.[0] ?? newAlbums?.[0];
  const accent = useArtworkAccent(feature?.id);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  /* Was `text-xl font-bold` — the same rail label every music app ships. Small
   * uppercase Syne with a rule running out to the right edge reads as an
   * editorial section mark, and gives the page a horizontal rhythm that four
   * identically-weighted headings did not. */
  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-3.5 flex items-center gap-3 px-4">
      <h2 className="font-syne text-[13px] font-bold uppercase tracking-[0.14em] text-foreground">
        {children}
      </h2>
      <div className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );

  /* `wide` exists so the first rail can outrank the ones below it. Four rails of
   * identical cards is the layout that makes this page look generated. */
  const AlbumRow = ({ albums, loading, wide }: { albums?: any[], loading: boolean, wide?: boolean }) => (
    <div className="hide-scrollbar flex gap-3.5 overflow-x-auto px-4 pb-4">
      {albums?.length ? (
        albums.map(album => (
          <AlbumCard key={album.id} album={album} className={wide ? 'w-44 md:w-52' : undefined} />
        ))
      ) : loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex shrink-0 flex-col gap-2.5 ${wide ? 'w-44 md:w-52' : 'w-36 md:w-44'}`}>
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        ))
      ) : (
        <p className="px-1 text-sm text-muted-foreground">No albums found.</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      {/* The page opens on the record you were last playing rather than on the
          word "Home" set over a rail of identical squares. That album's title is
          the largest type on the screen and the only colour on the screen is
          sampled from its sleeve, so the page looks like this library rather
          than like a music app. The sticky bar is gone with it — the bottom nav
          already says which tab you are on. */}
      <header className="relative overflow-hidden pt-safe">
        {/* No `blur` filter here: the radial stop is already soft, and a
            full-width filter pass on a header that scrolls is the one thing on
            this page that would cost frames on a phone. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{ background: `radial-gradient(115% 75% at 12% 0%, ${accent} 0%, transparent 68%)` }}
        />

        <div className="relative px-4 pb-7 pt-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {recentAlbums?.length ? 'Continue listening' : 'Newest in your library'}
            </p>
            <button
              type="button"
              onClick={toggleTheme}
              className="hover-elevate active-elevate-2 -mr-2 -mt-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark'
                ? <Sun size={20} aria-hidden="true" />
                : <Moon size={20} aria-hidden="true" />}
            </button>
          </div>
          {feature ? (
            <Link href={`/album/${feature.id}`} className="group flex items-end gap-4">
              <div className="hover-elevate active-elevate-2 relative h-28 w-28 shrink-0 overflow-hidden rounded-xl shadow-xl ring-1 ring-border md:h-36 md:w-36">
                <CoverArt id={feature.id} alt={feature.name} size={300} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <h1 className="line-clamp-3 font-syne text-[1.9rem] font-bold leading-[0.98] tracking-[-0.03em] text-foreground md:text-5xl">
                  {feature.name}
                </h1>
                <p className="mt-2 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {feature.artist}{feature.year ? ` · ${feature.year}` : ''}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-end gap-4">
              <Skeleton className="h-28 w-28 shrink-0 rounded-xl md:h-36 md:w-36" />
              <div className="flex-1 pb-1">
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="mt-3 h-2.5 w-1/3" />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex flex-col gap-9 pt-1">
        <section>
          <SectionTitle>Recently Played</SectionTitle>
          <AlbumRow albums={recentAlbums} loading={loadingRecent} wide />
        </section>

        <section>
          <SectionTitle>Recently Added</SectionTitle>
          <AlbumRow albums={newAlbums} loading={loadingNew} />
        </section>

        {/* Playlists are the one shelf in the library the listener built by hand,
            so they sit above the generated rails. Hidden entirely when the server
            has none rather than printing an empty-state next to full rails. */}
        {loadExtraSections && (playlists?.length || loadingPlaylists) && (
          <section>
            <SectionTitle>Your Playlists</SectionTitle>
            <div className="hide-scrollbar flex gap-3.5 overflow-x-auto px-4 pb-4">
              {playlists?.length
                ? playlists.map((playlist: any) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                  ))
                : Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex w-36 shrink-0 flex-col gap-2.5 md:w-44">
                      <Skeleton className="aspect-square w-full rounded-xl" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  ))}
            </div>
          </section>
        )}

        {loadExtraSections && loadingStarred && !starred?.song?.length && (
          <section>
            <SectionTitle>Starred Songs</SectionTitle>
            {/* The section used to carry `px-4` on top of the title's own `px-4`,
                which indented every heading eight pixels past the rails. */}
            <div className="px-4">
              <Skeleton className="h-24" />
            </div>
          </section>
        )}

        {starred?.song && starred.song.length > 0 && (
          <section>
            <SectionTitle>Starred Songs</SectionTitle>
            <div className="flex flex-col gap-1 px-4">
              {starred.song.slice(0, 10).map((song: any) => (
                <SongRow 
                  key={song.id} 
                  song={song} 
                  onPlay={() => playIndividualSong(song)} 
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

        {loadExtraSections && loadingRandom && !randomSongs?.length && (
          <section>
            <SectionTitle>Random Mix</SectionTitle>
            <div className="px-4">
              <Skeleton className="h-24" />
            </div>
          </section>
        )}

        {randomSongs && randomSongs.length > 0 && (
          <section>
            <SectionTitle>Random Mix</SectionTitle>
            <div className="flex flex-col gap-1 px-4">
              {randomSongs.map((song: any) => (
                <SongRow 
                  key={song.id} 
                  song={song} 
                  onPlay={() => playIndividualSong(song)} 
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getArtists, getAlbumList, getGenres, getRandomSongs, getSongsByGenre } from '../api/browsing';
import { getPlaylists } from '../api/playlists';
import { AlbumCard } from '../components/AlbumCard';
import { ArtistCard } from '../components/ArtistCard';
import { SongRow } from '../components/SongRow';
import { usePlayer } from '../hooks/usePlayer';
import { useVirtual } from 'react-virtual';
import { Link } from 'wouter';
import { ChevronLeft, Music2 } from 'lucide-react';
import { coverArtUrl } from '../api/client';
import { Skeleton } from '../components/ui/skeleton';

type Tab = 'songs' | 'albums' | 'artists' | 'playlists' | 'genres';

export default function Library() {
  const [activeTab, setActiveTab] = useState<Tab>('artists');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'artists', label: 'Artists' },
    { id: 'albums', label: 'Albums' },
    { id: 'songs', label: 'Songs' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'genres', label: 'Genres' },
  ];

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      <header className="pt-safe sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="px-4 pb-4 pt-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Browse
          </p>
          <h1 className="mt-1 font-syne text-[2.1rem] font-bold leading-none tracking-[-0.03em] text-foreground">
            Library
          </h1>
        </div>
        {/* Pills of a fixed height. The old tabs were a bare line of text with an
            underline rendered *only* on the active one, so every tab change
            altered the row's height and nudged the content below it — and a 20px
            line of text is not a target. */}
        <div
          role="tablist"
          aria-label="Library sections"
          className="hide-scrollbar flex gap-2 overflow-x-auto px-4 pb-3"
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`hover-elevate active-elevate-2 flex h-10 shrink-0 items-center rounded-full px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="p-4" role="tabpanel">
        {activeTab === 'artists' && <ArtistsTab />}
        {activeTab === 'albums' && <AlbumsTab />}
        {activeTab === 'songs' && <SongsTab />}
        {activeTab === 'playlists' && <PlaylistsTab />}
        {activeTab === 'genres' && <GenresTab />}
      </main>
    </div>
  );
}

function ArtistsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['artists'],
    queryFn: getArtists,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const estimateSize = useCallback((i: number) => {
    if (!data) return 200;
    const group = data[i];
    const artistCount = group?.artist?.length || 0;
    return 52 + Math.ceil(artistCount / 3) * 140 + 32;
  }, [data]);

  const rowVirtualizer = useVirtual({
    size: data?.length || 0,
    parentRef,
    estimateSize,
    overscan: 3,
  });

  // Derive the letter currently at the top of the visible range for the sticky header.
  const firstVisibleIndex = rowVirtualizer.virtualItems[0]?.index ?? 0;
  const stickyLetter = data?.[firstVisibleIndex]?.name ?? '';

  if (isLoading) return <LoadingGrid type="artist" />;
  if (!data?.length) return <EmptyState message="No artists found" />;

  return (
    <div className="relative">
      {/* Floating sticky header — shows the topmost visible letter group */}
      {stickyLetter && (
        <div
          className="sticky top-0 z-10 bg-background/90 backdrop-blur py-2 px-0 pointer-events-none"
          aria-hidden="true"
        >
          <h2 className="text-xl font-syne font-bold text-foreground">{stickyLetter}</h2>
        </div>
      )}

      <div
        ref={parentRef}
        className="scroll-dvh overflow-auto w-full hide-scrollbar"
      >
        <div
          className="w-full relative"
          style={{ height: `${rowVirtualizer.totalSize}px` }}
        >
          {rowVirtualizer.virtualItems.map((virtualRow) => {
            const group = data[virtualRow.index];
            if (!group) return null;
            // The sticky header already shows this letter when this group is
            // topmost. Render a spacer div of the same height to prevent the
            // grid from jumping up — but suppress the visible text.
            const isActiveGroup = virtualRow.index === firstVisibleIndex;
            return (
              <div
                key={group.name}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {isActiveGroup
                  ? <div className="mb-4 py-2" style={{ height: '2rem' }} aria-hidden="true" />
                  : <h2 className="text-xl font-syne font-bold mb-4 py-2 text-foreground">{group.name}</h2>
                }
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {group.artist?.map((artist: any) => (
                    <ArtistCard key={artist.id} artist={artist} className="w-full" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AlbumsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['albums', 'alphabeticalByName'],
    queryFn: () => getAlbumList('alphabeticalByName', 100),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  // Grid: 2 cols on mobile. Virtualise by row (each row = 2 albums).
  const COLS = 2;
  const albums = data || [];
  const rowCount = Math.ceil(albums.length / COLS);
  const estimateSize = useCallback(() => 200, []); // approx card height + gap

  const rowVirtualizer = useVirtual({
    size: rowCount,
    parentRef,
    estimateSize,
    overscan: 5,
  });

  if (isLoading) return <LoadingGrid type="album" />;
  if (!data?.length) return <EmptyState message="No albums found" />;

  return (
    <div
      ref={parentRef}
      className="scroll-dvh overflow-auto w-full hide-scrollbar"
    >
      <div
        className="w-full relative"
        style={{ height: `${rowVirtualizer.totalSize}px` }}
      >
        {rowVirtualizer.virtualItems.map((virtualRow) => {
          const startIdx = virtualRow.index * COLS;
          const rowAlbums = albums.slice(startIdx, startIdx + COLS);
          return (
            <div
              key={virtualRow.index}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 h-full">
                {rowAlbums.map((album: any) => (
                  <AlbumCard key={album.id} album={album} className="w-full" />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SongsTab() {
  const { playAlbum, playIndividualSong } = usePlayer();
  const { data: songs, isLoading } = useQuery({
    queryKey: ['all-songs'],
    queryFn: () => getRandomSongs(500),
    staleTime: 1000 * 60 * 10,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const estimateSize = useCallback(() => 64, []);

  const rowVirtualizer = useVirtual({
    size: songs?.length || 0,
    parentRef,
    estimateSize,
    overscan: 10,
  });

  if (isLoading) return (
    <div className="space-y-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-14" />
      ))}
    </div>
  );

  if (!songs?.length) return <EmptyState message="No songs found" />;

  return (
    <div ref={parentRef} className="h-[calc(100vh-200px)] overflow-auto w-full hide-scrollbar">
      <div
        className="w-full relative"
        style={{ height: `${rowVirtualizer.totalSize}px` }}
      >
        {rowVirtualizer.virtualItems.map((virtualRow) => {
          const song = songs[virtualRow.index];
          if (!song) return null;
          return (
            <div
              key={virtualRow.index}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <SongRow
                song={song}
                onPlay={() => playIndividualSong(song)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlaylistsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: getPlaylists,
  });

  if (isLoading) return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
  if (!data?.length) return <EmptyState message="No playlists yet" />;

  return (
    <div className="flex flex-col gap-1">
      {data.map((playlist: any) => (
        <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
          <div className="hover-elevate active-elevate-2 flex cursor-pointer items-center gap-4 rounded-md p-3">
            {playlist.coverArt ? (
              <img
                src={coverArtUrl(playlist.id, 128)}
                alt={playlist.name}
                loading="lazy"
                decoding="async"
                className="w-14 h-14 rounded-md object-cover bg-muted flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                <Music2 size={24} className="text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{playlist.name}</p>
              <p className="text-sm text-muted-foreground">{playlist.songCount} songs</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function GenresTab() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const { playAlbum } = usePlayer();

  const { data: genres, isLoading: loadingGenres } = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
  });

  const { data: genreSongs, isLoading: loadingSongs } = useQuery({
    queryKey: ['genre-songs', selectedGenre],
    queryFn: () => getSongsByGenre(selectedGenre!, 100),
    enabled: !!selectedGenre,
  });

  if (loadingGenres) return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );

  if (selectedGenre) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedGenre(null)}
          className="-ml-2 mb-4 flex min-h-11 items-center gap-2 rounded-md px-2 text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
        >
          <ChevronLeft size={20} aria-hidden="true" />
          <span className="font-semibold">{selectedGenre}</span>
        </button>

        {loadingSongs ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : genreSongs?.length ? (
          <div className="flex flex-col gap-1">
            {genreSongs.map((song: any, index: number) => (
              <SongRow
                key={song.id}
                song={song}
                onPlay={() => playAlbum(genreSongs, index)}
              />
            ))}
          </div>
        ) : (
          <EmptyState message={`No songs found in ${selectedGenre}`} />
        )}
      </div>
    );
  }

  if (!genres?.length) return <EmptyState message="No genres found" />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {genres.map((genre: any) => (
        <button
          key={genre.value}
          type="button"
          onClick={() => setSelectedGenre(genre.value)}
          /* In a grid, `hover:scale-[1.02]` on one tile overlaps its neighbours
             and `active:scale-[0.98]` makes the whole row look unstable. */
          className="hover-elevate active-elevate-2 rounded-xl border border-border bg-card p-5 text-left"
        >
          <p className="truncate font-syne text-base font-bold">{genre.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{genre.songCount} songs</p>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Music2 size={48} className="mb-4 opacity-30" />
      <p className="font-syne font-semibold">{message}</p>
    </div>
  );
}

function LoadingGrid({ type }: { type: 'artist' | 'album' }) {
  const isArtist = type === 'artist';
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex w-full flex-col gap-2">
          <Skeleton className={`aspect-square w-full ${isArtist ? 'rounded-full' : 'rounded-xl'}`} />
          <Skeleton className={`h-4 w-3/4 ${isArtist ? 'mx-auto' : ''}`} />
        </div>
      ))}
    </div>
  );
}

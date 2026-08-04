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
      <header className="pt-safe sticky top-0 bg-background/95 backdrop-blur-xl z-20 border-b border-border">
        <h1 className="text-3xl font-syne font-bold text-foreground px-4 mt-4 mb-4">Library</h1>
        <div className="flex overflow-x-auto hide-scrollbar px-4 pb-3 gap-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="h-0.5 w-full bg-primary mt-1 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4">
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

  if (isLoading) return <LoadingGrid type="artist" />;
  if (!data?.length) return <EmptyState message="No artists found" />;

  return (
    <div className="flex flex-col gap-8">
      {data.map((index: any) => (
        <div key={index.name}>
          <h2 className="text-xl font-syne font-bold mb-4 sticky top-[104px] bg-background/90 backdrop-blur py-2 z-10">{index.name}</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {index.artist?.map((artist: any) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AlbumsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['albums', 'alphabeticalByName'],
    queryFn: () => getAlbumList('alphabeticalByName', 100),
  });

  if (isLoading) return <LoadingGrid type="album" />;
  if (!data?.length) return <EmptyState message="No albums found" />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {data.map((album: any) => (
        <AlbumCard key={album.id} album={album} />
      ))}
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
        <div key={i} className="h-14 bg-muted rounded-md animate-pulse" />
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
        <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
      ))}
    </div>
  );
  if (!data?.length) return <EmptyState message="No playlists yet" />;

  return (
    <div className="flex flex-col gap-1">
      {data.map((playlist: any) => (
        <Link key={playlist.id} href={`/playlist/${playlist.id}`}>
          <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-md cursor-pointer transition-colors">
            {playlist.coverArt ? (
              <img
                src={coverArtUrl(playlist.id, 128)}
                alt={playlist.name}
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
        <div key={i} className="h-20 bg-muted rounded-md animate-pulse" />
      ))}
    </div>
  );

  if (selectedGenre) {
    return (
      <div>
        <button
          onClick={() => setSelectedGenre(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-semibold">{selectedGenre}</span>
        </button>

        {loadingSongs ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-md animate-pulse" />
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
          onClick={() => setSelectedGenre(genre.value)}
          className="bg-card p-5 rounded-xl border border-border hover:bg-accent cursor-pointer transition-all hover:scale-[1.02] text-left active:scale-[0.98]"
        >
          <p className="font-syne font-bold text-base truncate">{genre.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{genre.songCount} songs</p>
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 animate-pulse w-full">
          <div className={`aspect-square w-full bg-muted ${isArtist ? 'rounded-full' : 'rounded-md'}`} />
          <div className={`h-4 bg-muted rounded w-3/4 ${isArtist ? 'mx-auto' : ''}`} />
        </div>
      ))}
    </div>
  );
}

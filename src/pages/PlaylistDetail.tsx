import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { getPlaylist } from '../api/playlists';
import { coverArtUrl } from '../api/client';
import { SongRow } from '../components/SongRow';
import { ArrowLeft, Play, ListMusic } from 'lucide-react';
import { formatDuration } from '../utils/time';
import { usePlayer } from '../hooks/usePlayer';
import { Skeleton } from '../components/ui/skeleton';

export default function PlaylistDetail() {
  const [, params] = useRoute('/playlist/:id');
  const id = params?.id;
  const { playAlbum } = usePlayer();

  const { data: playlist, isLoading } = useQuery({
    queryKey: ['playlist', id],
    queryFn: () => getPlaylist(id!),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background pb-32">
      <div className="relative pt-safe bg-gradient-to-b from-card to-background">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-12 pt-20">
          <Skeleton className="h-56 w-56 md:h-64 md:w-64" />
          <div className="flex w-full max-w-md flex-col items-center text-center md:items-start md:text-left">
            <Skeleton className="mb-4 h-4 w-16" />
            <Skeleton className="mb-4 h-10 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-screen-xl p-4 md:p-8">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          {['88%', '72%', '90%', '65%', '80%', '76%'].map((w, i) => (
            <div key={i} className="flex h-16 items-center">
              <Skeleton className="h-4 flex-none" style={{ width: w }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
  if (!playlist) return null;

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      <div className="relative pt-safe bg-gradient-to-b from-card to-background">
        {/* Unlike the album hero, this gradient is `from-card` rather than a
            colour sampled off artwork — so it is light in the light theme, and
            the white text and black scrim this block used to carry disappeared
            into it. Tokens instead. */}
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Back"
          className="hover-elevate active-elevate-2 absolute top-safe left-2 z-10 mt-4 flex h-11 w-11 items-center justify-center rounded-full text-foreground"
        >
          <ArrowLeft size={24} aria-hidden="true" />
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-12 pt-20">
          {playlist.coverArt ? (
            <img 
              src={coverArtUrl(playlist.id, 500)} 
              alt={playlist.name}
              loading="lazy"
              decoding="async"
              className="w-56 h-56 md:w-64 md:h-64 rounded-xl ring-1 ring-border shadow-2xl"
            />
          ) : (
            <div className="w-56 h-56 md:w-64 md:h-64 rounded-xl ring-1 ring-border shadow-2xl bg-muted flex items-center justify-center">
              <ListMusic size={64} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <span className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Playlist</span>
            <h1 className="mb-2 line-clamp-2 font-syne text-4xl font-bold leading-[0.98] tracking-[-0.03em] text-foreground md:text-6xl">
              {playlist.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {playlist.owner} • {playlist.songCount} songs, {formatDuration(playlist.duration)}
            </p>
          </div>
        </div>
      </div>

      <main className="p-4 md:p-8 max-w-screen-xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => playlist.entry && playAlbum(playlist.entry, 0)}
            disabled={!playlist.entry?.length}
            aria-label={`Play ${playlist.name}`}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity active:opacity-80 disabled:opacity-50"
          >
            <Play fill="currentColor" size={28} className="ml-1" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {playlist.entry?.map((song: any, index: number) => (
            <SongRow 
              key={song.id} 
              song={song} 
              index={index}
              onPlay={() => playAlbum(playlist.entry, index)}
            />
          ))}
          {!playlist.entry?.length && (
            <div className="text-center py-12 text-muted-foreground">
              This playlist is empty.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

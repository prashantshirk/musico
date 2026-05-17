import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { getPlaylist } from '../api/playlists';
import { coverArtUrl } from '../api/client';
import { SongRow } from '../components/SongRow';
import { ArrowLeft, Play, ListMusic } from 'lucide-react';
import { formatDuration } from '../utils/time';
import { usePlayer } from '../hooks/usePlayer';

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
          <div className="w-56 h-56 md:w-64 md:h-64 rounded-md bg-white/5 animate-pulse" />
          <div className="flex flex-col items-center md:items-start text-center md:text-left w-full max-w-md">
            <div className="h-4 w-16 bg-white/5 rounded mb-4 animate-pulse" />
            <div className="h-10 w-3/4 bg-white/5 rounded mb-4 animate-pulse" />
            <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <main className="p-4 md:p-8 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-white/5 rounded-full animate-pulse" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 w-full bg-white/5 rounded-md animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
  if (!playlist) return null;

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      <div className="relative pt-safe bg-gradient-to-b from-card to-background">
        <button 
          onClick={() => window.history.back()}
          className="absolute top-safe mt-4 left-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white z-10 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-12 pt-20">
          {playlist.coverArt ? (
            <img 
              src={coverArtUrl(playlist.id, 500)} 
              alt={playlist.name}
              className="w-56 h-56 md:w-64 md:h-64 rounded-md shadow-2xl"
            />
          ) : (
            <div className="w-56 h-56 md:w-64 md:h-64 rounded-md shadow-2xl bg-muted flex items-center justify-center">
              <ListMusic size={64} className="text-muted-foreground" />
            </div>
          )}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-2">Playlist</span>
            <h1 className="text-4xl md:text-6xl font-syne font-bold text-white mb-2 line-clamp-2 leading-tight">
              {playlist.name}
            </h1>
            <p className="text-sm text-white/60 mt-2">
              {playlist.owner} • {playlist.songCount} songs, {formatDuration(playlist.duration)}
            </p>
          </div>
        </div>
      </div>

      <main className="p-4 md:p-8 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => playlist.entry && playAlbum(playlist.entry, 0)}
            disabled={!playlist.entry?.length}
            className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg disabled:opacity-50 disabled:scale-100"
          >
            <Play fill="currentColor" size={28} className="ml-1" />
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

import { useQuery } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { getAlbum, getAlbumInfo } from '../api/browsing';
import { coverArtUrl } from '../api/client';
import { SongRow } from '../components/SongRow';
import { formatDuration } from '../utils/time';
import { Play, Shuffle, ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getDominantColor } from '../utils/color';
import { usePlayer } from '../hooks/usePlayer';
import { usePlayerStore } from '../store/playerStore';
import { Skeleton } from '../components/ui/skeleton';

export default function AlbumDetail() {
  const [, params] = useRoute('/album/:id');
  const [, setLocation] = useLocation();
  const id = params?.id;
  const { playAlbum } = usePlayer();
  /* Starts transparent so the hero is just the page background until the cover
   * has been sampled. The previous default was a hardcoded dark rgba, which
   * flashed a dark band across the top of the page in the light theme. */
  const [dominantColor, setDominantColor] = useState<string>('transparent');

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', id],
    queryFn: () => getAlbum(id!),
    enabled: !!id,
  });

  const { data: albumInfo } = useQuery({
    queryKey: ['albumInfo', id],
    queryFn: () => getAlbumInfo(id!),
    enabled: !!id,
  });

  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = () => {
    if (imgRef.current) {
      const color = getDominantColor(imgRef.current);
      setDominantColor(color);
    }
  };

  /* Skeletons were hand-rolled `bg-white/5 animate-pulse` divs, which are
   * invisible against a light background — the app has a working theme toggle.
   * `Skeleton` tints with `bg-primary/10`, and primary is achromatic in both
   * themes, so it reads as a grey placeholder either way. */
  if (isLoading) return (
    <div className="min-h-screen bg-background pb-32">
      <div className="relative pt-safe bg-background/50">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-12 pt-20">
          <Skeleton className="h-56 w-56 rounded-xl md:h-64 md:w-64" />
          <div className="flex w-full max-w-md flex-col items-center text-center md:items-start md:text-left">
            <Skeleton className="mb-4 h-4 w-16" />
            <Skeleton className="mb-4 h-10 w-3/4" />
            <Skeleton className="mb-4 h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-screen-xl p-4 md:p-8">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
        {/* Staggered widths so the block reads as a track list rather than a
            stack of identical bars. */}
        <div className="flex flex-col gap-2">
          {['92%', '78%', '85%', '70%', '88%', '74%'].map((w, i) => (
            <div key={i} className="flex h-16 items-center gap-3">
              <Skeleton className="h-4 flex-none" style={{ width: w }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
  if (!album) return null;

  return (
    <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-300">
      {/* Dynamic Header */}
      <div 
        className="relative pt-safe"
        style={{
          background: `linear-gradient(to bottom, ${dominantColor} 0%, var(--color-background) 100%)`
        }}
      >
        {/* The scrim carries the contrast for this glyph, not the artwork: the
            gradient starts from a colour sampled off the cover, which can be
            pale. A 40% black plate keeps the white arrow legible either way. */}
        <button
          type="button"
          onClick={() => window.history.back()}
          aria-label="Back"
          className="absolute top-safe left-2 z-10 mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors active:bg-black/60"
        >
          <ArrowLeft size={24} aria-hidden="true" />
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-12 pt-20">
          <img 
            ref={imgRef}
            src={coverArtUrl(album.id, 500)} 
            alt={album.name}
            crossOrigin="anonymous"
            onLoad={handleImageLoad}
            className="w-56 h-56 md:w-64 md:h-64 rounded-xl ring-1 ring-border shadow-2xl album-art-enter"
          />
          {/* Tokens, not white. On a phone this block stacks *below* the cover,
              which puts it at the tail of the gradient where the colour has
              already resolved to the page background — so in the light theme the
              white text it used to carry sat on near-white. */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left">
            <span className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Album</span>
            <h1 className="mb-2 line-clamp-2 font-syne text-4xl font-bold leading-[0.98] tracking-[-0.03em] text-foreground md:text-6xl">
              {album.name}
            </h1>
            <p className="text-lg font-medium text-foreground/80">
              {album.artist}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {album.year ? `${album.year} • ` : ''}{album.songCount} songs, {formatDuration(album.duration)}
            </p>
          </div>
        </div>
      </div>

      <main className="p-4 md:p-8 max-w-screen-xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => playAlbum(album.song, 0)}
            aria-label={`Play ${album.name}`}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity active:opacity-80"
          >
            <Play fill="currentColor" size={28} className="ml-1" aria-hidden="true" />
          </button>
          {/* Was `bg-white/10 text-white`. That row sits on the page background,
              not on the artwork gradient above it, so in light mode it was a
              white glyph on a near-white surface. */}
          <button
            type="button"
            onClick={() => {
              usePlayerStore.getState().toggleShuffle();
              playAlbum(album.song, 0);
            }}
            aria-label={`Shuffle ${album.name}`}
            className="hover-elevate active-elevate-2 flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            <Shuffle size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {album.song?.map((song: any, index: number) => (
            <SongRow 
              key={song.id} 
              song={song} 
              index={index}
              showCover={false}
              onPlay={() => playAlbum(album.song, index)}
            />
          ))}
        </div>
        
        {albumInfo?.notes && (
          <div className="mt-12 pt-8 border-t border-border/50">
            <h3 className="text-lg font-syne font-bold mb-4">About the Album</h3>
            <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
              {albumInfo.notes}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

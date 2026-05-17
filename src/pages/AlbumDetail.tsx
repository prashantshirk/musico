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

export default function AlbumDetail() {
  const [, params] = useRoute('/album/:id');
  const [, setLocation] = useLocation();
  const id = params?.id;
  const { playAlbum } = usePlayer();
  const [dominantColor, setDominantColor] = useState<string>('rgba(24,24,27,0.5)');

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

  if (isLoading) return (
    <div className="min-h-screen bg-background pb-32">
      <div className="relative pt-safe bg-background/50">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-12 pt-20">
          <div className="w-56 h-56 md:w-64 md:h-64 rounded-md bg-white/5 animate-pulse" />
          <div className="flex flex-col items-center md:items-start text-center md:text-left w-full max-w-md">
            <div className="h-4 w-16 bg-white/5 rounded mb-4 animate-pulse" />
            <div className="h-10 w-3/4 bg-white/5 rounded mb-4 animate-pulse" />
            <div className="h-6 w-1/2 bg-white/5 rounded mb-4 animate-pulse" />
            <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <main className="p-4 md:p-8 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-white/5 rounded-full animate-pulse" />
          <div className="w-10 h-10 bg-white/5 rounded-full animate-pulse" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-16 w-full bg-white/5 rounded-md animate-pulse" />
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
        <button 
          onClick={() => window.history.back()}
          className="absolute top-safe mt-4 left-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white z-10 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 p-6 md:p-12 pt-20">
          <img 
            ref={imgRef}
            src={coverArtUrl(album.id, 500)} 
            alt={album.name}
            crossOrigin="anonymous"
            onLoad={handleImageLoad}
            className="w-56 h-56 md:w-64 md:h-64 rounded-md shadow-2xl album-art-enter"
          />
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="text-sm font-semibold uppercase tracking-wider text-white/70 mb-2">Album</span>
            <h1 className="text-4xl md:text-6xl font-syne font-bold text-white mb-2 line-clamp-2 leading-tight">
              {album.name}
            </h1>
            <p className="text-lg text-white/80 font-medium">
              {album.artist}
            </p>
            <p className="text-sm text-white/60 mt-2">
              {album.year ? `${album.year} • ` : ''}{album.songCount} songs, {formatDuration(album.duration)}
            </p>
          </div>
        </div>
      </div>

      <main className="p-4 md:p-8 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => playAlbum(album.song, 0)}
            className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
          >
            <Play fill="currentColor" size={28} className="ml-1" />
          </button>
          <button 
            onClick={() => {
              usePlayerStore.getState().toggleShuffle();
              playAlbum(album.song, 0);
            }}
            className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <Shuffle size={20} />
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

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import { coverArtUrl } from '../api/client';
import { formatTime } from '../utils/time';
import { getDominantColor } from '../utils/color';
import { ProgressBar } from '../components/ProgressBar';
import { VolumeSlider } from '../components/VolumeSlider';
import { LyricsPanel } from '../components/LyricsPanel';
import { SongInfoModal } from '../components/SongInfoModal';
import { 
  ChevronDown, Info, Play, Pause, SkipBack, SkipForward, 
  Repeat, Repeat1, Shuffle, Star, ListMusic, MessageSquare 
} from 'lucide-react';
import { star, unstar } from '../api/annotation';

export default function NowPlaying() {
  const [, setLocation] = useLocation();
  const { currentSong, isPlaying, progress, duration, volume, isMuted, repeat, shuffle } = usePlayerStore();
  const { togglePlay, next, previous, seek, setVolume, toggleMute } = usePlayer();
  const [dominantColor, setDominantColor] = useState<string>('rgb(15,15,15)');
  const [showLyrics, setShowLyrics] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (currentSong) {
      setIsStarred(!!currentSong.starred);
    } else {
      setLocation('/home');
    }
  }, [currentSong, setLocation]);

  if (!currentSong) return null;

  const handleImageLoad = () => {
    if (imgRef.current) {
      const color = getDominantColor(imgRef.current);
      setDominantColor(color);
    }
  };

  const handleStar = () => {
    if (isStarred) {
      unstar(currentSong.id, 'song');
      setIsStarred(false);
    } else {
      star(currentSong.id, 'song');
      setIsStarred(true);
    }
  };

  const cycleRepeat = usePlayerStore.getState().cycleRepeat;
  const toggleShuffle = usePlayerStore.getState().toggleShuffle;

  const bgUrl = coverArtUrl(currentSong.id, 600);

  // Swipe handlers for skip/close
  let touchStartX = 0;
  let touchStartY = 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffY) > 100 && diffY > Math.abs(diffX)) {
      // Swipe down to close
      window.history.back();
    } else if (Math.abs(diffX) > 70 && Math.abs(diffX) > Math.abs(diffY)) {
      // Swipe horizontal
      if (diffX > 0) previous();
      else next();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden animate-in slide-in-from-bottom-full duration-300"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic blurred background */}
      <div 
        className="absolute inset-0 z-0 opacity-40 transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.3) scale(1.1)'
        }}
      />
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 z-0 transition-colors duration-1000"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${dominantColor} 100%)`,
          opacity: 0.8
        }}
      />

      <div className="relative z-10 flex flex-col h-full pt-safe">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 shrink-0">
          <button onClick={() => window.history.back()} className="p-2 -ml-2 text-white/80 hover:text-white transition-colors">
            <ChevronDown size={28} />
          </button>
          <div className="text-center text-xs font-semibold tracking-widest text-white/70 uppercase">
            {currentSong.album}
          </div>
          <button 
            onClick={() => setShowInfo(true)}
            className="p-2 -mr-2 text-white/80 hover:text-white transition-colors"
          >
            <Info size={24} />
          </button>
        </header>

        {/* Artwork */}
        <div className="flex-1 flex items-center justify-center px-8 py-4 min-h-0">
          <img 
            ref={imgRef}
            src={bgUrl} 
            alt={currentSong.album}
            crossOrigin="anonymous"
            onLoad={handleImageLoad}
            className={`w-full h-full max-h-[50vh] max-w-sm aspect-square object-contain rounded-xl shadow-2xl transition-transform duration-500 ease-out ${isPlaying ? 'scale-100' : 'scale-95 opacity-90'}`}
          />
        </div>

        {/* Controls Container */}
        <div className="px-6 pb-safe shrink-0">
          {/* Metadata */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col min-w-0 pr-4">
              <h1 className="text-2xl font-syne font-bold text-white truncate mb-1">
                {currentSong.title}
              </h1>
              <p className="text-lg text-white/70 truncate">
                {currentSong.artist}
              </p>
            </div>
            <button 
              onClick={handleStar}
              className={`p-2 shrink-0 rounded-full transition-colors ${isStarred ? 'text-primary' : 'text-white/70 hover:text-white'}`}
            >
              <Star size={24} fill={isStarred ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <ProgressBar progress={progress} duration={duration} onSeek={seek} />
            <div className="flex justify-between text-xs text-white/60 font-medium mt-2 tabular-nums">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={toggleShuffle}
              className={`p-2 transition-colors ${shuffle ? 'text-primary' : 'text-white/60 hover:text-white'}`}
            >
              <Shuffle size={20} />
            </button>
            
            <div className="flex items-center justify-center gap-6 md:gap-8">
              <button 
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={previous}
                className="p-2 text-white/90 hover:text-white hover:scale-110 transition-all"
              >
                <SkipBack size={32} fill="currentColor" />
              </button>
              
              <button 
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
              >
                {isPlaying ? (
                  <Pause size={32} fill="currentColor" />
                ) : (
                  <Play size={32} fill="currentColor" className="ml-1" />
                )}
              </button>
              
              <button 
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={next}
                className="p-2 text-white/90 hover:text-white hover:scale-110 transition-all"
              >
                <SkipForward size={32} fill="currentColor" />
              </button>
            </div>

            <button 
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={cycleRepeat}
              className={`p-2 transition-colors ${repeat !== 'none' ? 'text-primary' : 'text-white/60 hover:text-white'}`}
            >
              {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex items-center justify-between py-4 opacity-80">
            <VolumeSlider volume={isMuted ? 0 : volume} onVolumeChange={setVolume} />
            <div className="flex items-center gap-4 ml-6 shrink-0">
              <button 
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={() => setShowLyrics(true)}
                className="p-2 text-white/70 hover:text-white transition-colors"
              >
                <MessageSquare size={20} />
              </button>
              <button 
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={() => setLocation('/queue')}
                className="p-2 text-white/70 hover:text-white transition-colors"
              >
                <ListMusic size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showLyrics && <LyricsPanel onClose={() => setShowLyrics(false)} />}
      {showInfo && <SongInfoModal onClose={() => setShowInfo(false)} />}
    </div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import { coverArtUrl } from '../api/client';
import { formatTime } from '../utils/time';
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
  const { currentSong, isPlaying, progress, duration, volume, isMuted, repeat, shuffle, isAiRadioSession } = usePlayerStore();
  const { togglePlay, next, previous, seek, setVolume, toggleMute } = usePlayer();
  const [showLyrics, setShowLyrics] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  useEffect(() => {
    if (currentSong) {
      setIsStarred(!!currentSong.starred);
    } else {
      setLocation('/home');
    }
  }, [currentSong, setLocation]);

  if (!currentSong) return null;

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
      className="fixed inset-0 z-50 flex flex-col bg-background dark:bg-black/95 overflow-hidden animate-in slide-in-from-bottom-full duration-300"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      <div className="relative z-10 flex flex-col h-full pt-safe">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-4 shrink-0">
          <button onClick={() => window.history.back()} className="p-2 -ml-2 text-foreground/80 hover:text-foreground transition-colors">
            <ChevronDown size={28} />
          </button>
          <div className="text-center flex flex-col items-center">
            {isAiRadioSession && (
              <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider mb-1">
                AI Radio
              </span>
            )}
            <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase max-w-[200px] truncate">
              {currentSong.album}
            </div>
          </div>
          <button 
            onClick={() => setShowInfo(true)}
            className="p-2 -mr-2 text-foreground/80 hover:text-foreground transition-colors"
          >
            <Info size={24} />
          </button>
        </header>

        {/* Artwork */}
        <div className="flex-1 flex items-center justify-center px-8 py-4 min-h-0">
          <img 
            src={bgUrl} 
            alt={currentSong.album}
            crossOrigin="anonymous"
            className={`w-full h-full max-h-[50vh] max-w-sm aspect-square object-cover rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-out ${isPlaying ? 'scale-100' : 'scale-95 opacity-90'}`}
          />
        </div>

        {/* Controls Container */}
        <div className="px-6 pb-safe shrink-0">
          {/* Metadata */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col min-w-0 pr-4">
              <h1 className="text-2xl font-syne font-bold text-foreground truncate mb-1">
                {currentSong.title}
              </h1>
              <p className="text-lg text-muted-foreground truncate">
                {currentSong.artist}
              </p>
            </div>
            <button 
              onClick={handleStar}
              className={`p-2 shrink-0 rounded-full transition-colors ${isStarred ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Star size={24} fill={isStarred ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <ProgressBar progress={progress} duration={duration} onSeek={seek} />
            <div className="flex justify-between text-xs text-muted-foreground font-medium mt-2 tabular-nums">
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
              className={`p-2 transition-colors ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Shuffle size={20} />
            </button>
            
            <div className="flex items-center justify-center gap-6 md:gap-8">
              <button 
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={previous}
                className="p-2 text-foreground/90 hover:text-foreground hover:scale-110 transition-all"
              >
                <SkipBack size={32} fill="currentColor" />
              </button>
              
              <button 
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
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
                className="p-2 text-foreground/90 hover:text-foreground hover:scale-110 transition-all"
              >
                <SkipForward size={32} fill="currentColor" />
              </button>
            </div>

            <button 
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onClick={cycleRepeat}
              className={`p-2 transition-colors ${repeat !== 'none' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          </div>

          {/* Bottom Actions Row */}
          <div className="flex items-center justify-between py-4">
            <VolumeSlider volume={isMuted ? 0 : volume} onVolumeChange={setVolume} />
            <div className="flex items-center gap-4 ml-6 shrink-0">
              <button 
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={() => setShowLyrics(true)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare size={20} />
              </button>
              <button 
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onClick={() => setLocation('/queue')}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
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

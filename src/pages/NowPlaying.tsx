import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../hooks/usePlayer';
import { useArtworkAccent } from '../hooks/useArtworkAccent';
import { withAlpha } from '../utils/color';
import { CoverArt } from '../components/CoverArt';
import { ProgressBar } from '../components/ProgressBar';
import { VolumeSlider } from '../components/VolumeSlider';
import { LyricsPanel } from '../components/LyricsPanel';
import { SongInfoModal } from '../components/SongInfoModal';
import {
  ChevronDown, Info, Play, Pause, SkipBack, SkipForward,
  Repeat, Repeat1, Shuffle, Star, ListMusic, MessageSquare,
} from 'lucide-react';
import { star, unstar } from '../api/annotation';

/* A gesture has to travel this far before it counts as a swipe at all. Below
 * it there is no axis, and with no axis nothing fires — which is what stops a
 * plain tap from skipping a track or dismissing the screen. */
const DEAD_ZONE = 12;
const NON_SWIPE = 'button, a, input, [role="slider"], [data-no-swipe]';

/** Matches the album page's hero request so the two share one cache entry. */
const ART_SIZE = 500;

export default function NowPlaying() {
  const [, setLocation] = useLocation();

  // Deliberately narrow selectors: progress and duration are read by the
  // scrubber itself, so the tick no longer re-renders this whole screen.
  const currentSong = usePlayerStore(state => state.currentSong);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const volume = usePlayerStore(state => state.volume);
  const isMuted = usePlayerStore(state => state.isMuted);
  const repeat = usePlayerStore(state => state.repeat);
  const shuffle = usePlayerStore(state => state.shuffle);
  const isAiRadioSession = usePlayerStore(state => state.isAiRadioSession);
  const cycleRepeat = usePlayerStore(state => state.cycleRepeat);
  const toggleShuffle = usePlayerStore(state => state.toggleShuffle);

  const { togglePlay, next, previous, seek, setVolume } = usePlayer();

  const [showLyrics, setShowLyrics] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  const artId = currentSong?.albumId || currentSong?.id;
  const accent = useArtworkAccent(artId);

  const sheetRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const axisRef = useRef<'none' | 'x' | 'y'>('none');

  useEffect(() => {
    if (currentSong) setIsStarred(!!currentSong.starred);
    else setLocation('/home');
  }, [currentSong, setLocation]);

  const close = () => {
    // Landing straight on /now-playing (a shared link, a restored session)
    // leaves nothing to go back to, and history.back() would exit the app.
    if (window.history.length > 1) window.history.back();
    else setLocation('/home');
  };

  const dragTo = (dy: number) => {
    const node = sheetRef.current;
    if (!node) return;
    node.style.transition = '';
    node.style.transform = dy > 0 ? `translate3d(0, ${dy * 0.55}px, 0)` : '';
    node.style.opacity = dy > 0 ? String(Math.max(0.55, 1 - dy / 700)) : '1';
  };

  const settle = () => {
    const node = sheetRef.current;
    if (!node) return;
    node.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease';
    node.style.transform = '';
    node.style.opacity = '1';
  };

  const onTouchStart = (e: React.TouchEvent) => {
    axisRef.current = 'none';
    // Multi-touch is a pinch or a stray palm, and a touch that starts on a
    // control belongs to that control.
    if (e.touches.length !== 1 || (e.target as HTMLElement | null)?.closest(NON_SWIPE)) {
      startRef.current = null;
      return;
    }
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const start = startRef.current;
    if (!start || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;

    if (axisRef.current === 'none') {
      if (Math.abs(dx) < DEAD_ZONE && Math.abs(dy) < DEAD_ZONE) return;
      axisRef.current = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    }
    if (axisRef.current === 'y') dragTo(dy);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = startRef.current;
    const axis = axisRef.current;
    startRef.current = null;
    axisRef.current = 'none';
    settle();

    const touch = e.changedTouches[0];
    if (!start || axis === 'none' || !touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const elapsed = Date.now() - start.t;

    if (axis === 'y') {
      if (dy > 120 || (dy > 56 && elapsed < 240)) close();
    } else if (Math.abs(dx) > 84 || (Math.abs(dx) > 44 && elapsed < 240)) {
      if (dx > 0) previous();
      else next();
    }
  };

  const onTouchCancel = () => {
    startRef.current = null;
    axisRef.current = 'none';
    settle();
  };

  if (!currentSong) return null;

  const handleStar = () => {
    if (isStarred) unstar(currentSong.id, 'song');
    else star(currentSong.id, 'song');
    setIsStarred(!isStarred);
  };

  /* Built only from fields already on the track — nothing extra is fetched.
   * Segments that are missing simply don't appear. */
  const specs = [
    currentSong.bitRate ? `${currentSong.bitRate} kbps` : null,
    currentSong.size ? `${(currentSong.size / 1048576).toFixed(1)} MB` : null,
    currentSong.year ? String(currentSong.year) : null,
    currentSong.genre || null,
  ].filter((value): value is string => !!value);

  return (
    <div
      ref={sheetRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#08080a] animate-in slide-in-from-bottom-full duration-300"
    >
      <div className="pt-safe shrink-0" />
      {/* Teaches the drag-down gesture, and is the only ornament up here. */}
      <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-white/20" />

      <header className="flex shrink-0 items-center justify-between px-3 pb-1 pt-1">
        <button
          onClick={close}
          aria-label="Close player"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-colors active:text-white"
        >
          <ChevronDown size={26} />
        </button>

        <div className="flex min-w-0 flex-col items-center">
          {isAiRadioSession && (
            <span
              className="mb-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em]"
              style={{ color: accent, backgroundColor: withAlpha(accent, 0.14) }}
            >
              AI Radio
            </span>
          )}
          <span className="max-w-[58vw] truncate font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/40">
            {currentSong.album}
          </span>
        </div>

        <button
          onClick={() => setShowInfo(true)}
          aria-label="Track details"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-colors active:text-white"
        >
          <Info size={22} />
        </button>
      </header>

      {/* Artwork. The accent bloom behind it is light spilling off the record —
          it is the reason the rest of the screen can stay achromatic. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-2">
        {/* The 42vh term matters: without a height cap the square derives its
            height from the width and pushes the transport off a short screen. */}
        <div className="relative aspect-square w-full" style={{ maxWidth: 'min(74vw, 42vh, 336px)' }}>
          {/* Static opacity on purpose: a blurred layer this large has to be
              re-rasterised whenever it animates, and the artwork's own scale
              already signals paused. */}
          <div
            aria-hidden
            className="absolute -inset-5 rounded-[44px] blur-2xl"
            style={{ backgroundColor: accent, opacity: 0.3 }}
          />
          <CoverArt
            id={artId || ''}
            alt={currentSong.album || currentSong.title}
            size={ART_SIZE}
            className={`relative h-full w-full rounded-2xl transition-transform duration-500 ease-out ${
              isPlaying ? 'scale-100' : 'scale-[0.965]'
            }`}
          />
        </div>
      </div>

      <div className="shrink-0 px-6">
        {/* Title block. The album is already in the header, so the second line
            carries the artist alone rather than repeating it. */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-syne text-[26px] font-bold leading-tight tracking-[-0.01em] text-white">
              {currentSong.title}
            </h1>
            <p className="mt-0.5 truncate text-[15px] text-white/55">{currentSong.artist}</p>
          </div>
          <button
            onClick={handleStar}
            aria-label={isStarred ? 'Remove from favourites' : 'Add to favourites'}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors"
            style={{ color: isStarred ? accent : 'rgba(255,255,255,0.45)' }}
          >
            <Star size={22} fill={isStarred ? 'currentColor' : 'none'} />
          </button>
        </div>

        <ProgressBar onSeek={seek} accent={accent} />

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={toggleShuffle}
            aria-label="Shuffle"
            aria-pressed={shuffle}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors"
            style={{ color: shuffle ? accent : 'rgba(255,255,255,0.42)' }}
          >
            <Shuffle size={19} />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={previous}
              aria-label="Previous track"
              className="flex h-12 w-12 items-center justify-center rounded-full text-white/90 transition-transform active:scale-90"
            >
              <SkipBack size={26} fill="currentColor" />
            </button>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition-transform active:scale-95"
              style={{ boxShadow: isPlaying ? `0 0 28px -6px ${withAlpha(accent, 0.85)}` : 'none' }}
            >
              {isPlaying
                ? <Pause size={26} fill="currentColor" />
                : <Play size={26} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              onClick={next}
              aria-label="Next track"
              className="flex h-12 w-12 items-center justify-center rounded-full text-white/90 transition-transform active:scale-90"
            >
              <SkipForward size={26} fill="currentColor" />
            </button>
          </div>

          <button
            onClick={cycleRepeat}
            aria-label={`Repeat: ${repeat}`}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors"
            style={{ color: repeat !== 'none' ? accent : 'rgba(255,255,255,0.42)' }}
          >
            {repeat === 'one' ? <Repeat1 size={19} /> : <Repeat size={19} />}
          </button>
        </div>

        {/* The plate: what this file actually is, in the same monospace as the
            timecodes. Only the fields the track already carries. */}
        {specs.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <span aria-hidden className="h-px flex-1 bg-white/[0.07]" />
            <span className="truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-white/30">
              {specs.slice(0, 3).join('  ·  ')}
            </span>
            <span aria-hidden className="h-px flex-1 bg-white/[0.07]" />
          </div>
        )}

        <div className="pb-safe-6 flex items-center justify-between pt-2">
          <VolumeSlider volume={isMuted ? 0 : volume} onVolumeChange={setVolume} />
          <div className="flex items-center">
            <button
              onClick={() => setShowLyrics(true)}
              aria-label="Lyrics"
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/45 transition-colors active:text-white"
            >
              <MessageSquare size={19} />
            </button>
            <button
              onClick={() => setLocation('/queue')}
              aria-label="Queue"
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/45 transition-colors active:text-white"
            >
              <ListMusic size={19} />
            </button>
          </div>
        </div>
      </div>

      {/* Both overlays live inside the gesture root, so without this a vertical
          drag to scroll lyrics would dismiss the player behind them. */}
      {showLyrics && <div data-no-swipe><LyricsPanel onClose={() => setShowLyrics(false)} /></div>}
      {showInfo && <div data-no-swipe><SongInfoModal onClose={() => setShowInfo(false)} /></div>}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { usePlayerStore } from '../store/playerStore';
import { useSongMenuStore } from '../store/songMenuStore';
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
  Repeat, Repeat1, Shuffle, Star, ListMusic, MessageSquare, MoreHorizontal,
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
  const openSongMenu = useSongMenuStore(state => state.openSongMenu);

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
      /* `inset-0` alone sizes to the *large* viewport, which on a mobile browser
         is taller than what you can see and taller than what you can touch — the
         lyrics and queue buttons at the bottom of this column were rendering
         underneath Safari's toolbar, so taps went to the browser instead of the
         app. `100svh` is the viewport with the browser chrome showing, so the
         whole column stays reachable; `inset-0` is kept so the background still
         covers the strip that appears when the URL bar retracts. */
      className="fixed inset-0 z-[60] flex h-[100svh] flex-col overflow-hidden bg-background animate-in slide-in-from-bottom-full duration-300"
    >
      <div className="pt-safe shrink-0" />
      {/* Teaches the drag-down gesture, and is the only ornament up here. */}
      <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-foreground/20" />

      <header className="flex shrink-0 items-center justify-between px-3 pb-1 pt-1">
        <button
          type="button"
          onClick={close}
          aria-label="Close player"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors active:text-foreground"
        >
          <ChevronDown size={24} aria-hidden="true" />
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
          {/* Was text-white/40 — about 3.7:1 on this surface, under the 4.5:1
              floor for normal text. The muted token measures 7.4:1. */}
          <span className="max-w-[58vw] truncate font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
            {currentSong.album}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowInfo(true)}
          aria-label="Track details"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors active:text-foreground"
        >
          <Info size={20} aria-hidden="true" />
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
            <h1 className="truncate font-syne text-[26px] font-bold leading-tight tracking-[-0.01em] text-foreground">
              {currentSong.title}
            </h1>
            <p className="mt-0.5 truncate text-[15px] text-muted-foreground">{currentSong.artist}</p>
          </div>
          <div className="-mr-2 flex shrink-0 items-center">
            <button
              type="button"
              onClick={handleStar}
              aria-label={isStarred ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={isStarred}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                isStarred ? '' : 'text-muted-foreground'
              }`}
              style={isStarred ? { color: accent } : undefined}
            >
              <Star size={20} fill={isStarred ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
            {/* The same sheet the song rows open, seeded with the current track —
                so play next, add to queue, AI radio, playlist filing and the jump
                to album or artist are all reachable from the player too. */}
            <button
              type="button"
              onClick={() => openSongMenu(currentSong)}
              aria-label={`More options for ${currentSong.title}`}
              aria-haspopup="menu"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:text-foreground"
            >
              <MoreHorizontal size={20} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Marked so the screen's own drag-to-dismiss ignores touches that begin
            on the scrubber — the slider stops pointer events, but this root
            listens on touch events, which are a separate stream. */}
        <div data-no-swipe>
          <ProgressBar onSeek={seek} accent={accent} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-label="Shuffle"
            aria-pressed={shuffle}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              shuffle ? '' : 'text-muted-foreground'
            }`}
            style={shuffle ? { color: accent } : undefined}
          >
            <Shuffle size={20} aria-hidden="true" />
          </button>

          {/* Press feedback is opacity rather than scale throughout: a transform
              on a 64px control visibly shifts the two beside it. */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={previous}
              aria-label="Previous track"
              className="flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-opacity active:opacity-50"
            >
              <SkipBack size={24} fill="currentColor" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background transition-opacity active:opacity-80"
              style={{ boxShadow: isPlaying ? `0 0 28px -6px ${withAlpha(accent, 0.85)}` : 'none' }}
            >
              {isPlaying
                ? <Pause size={28} fill="currentColor" aria-hidden="true" />
                : <Play size={28} fill="currentColor" className="ml-0.5" aria-hidden="true" />}
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next track"
              className="flex h-12 w-12 items-center justify-center rounded-full text-foreground transition-opacity active:opacity-50"
            >
              <SkipForward size={24} fill="currentColor" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={cycleRepeat}
            aria-label={`Repeat: ${repeat}`}
            aria-pressed={repeat !== 'none'}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              repeat !== 'none' ? '' : 'text-muted-foreground'
            }`}
            style={repeat !== 'none' ? { color: accent } : undefined}
          >
            {repeat === 'one'
              ? <Repeat1 size={20} aria-hidden="true" />
              : <Repeat size={20} aria-hidden="true" />}
          </button>
        </div>

        {/* The plate: what this file actually is, in the same monospace as the
            timecodes. Only the fields the track already carries. */}
        {specs.length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <span aria-hidden className="h-px flex-1 bg-border" />
            <span className="truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
              {specs.slice(0, 3).join('  ·  ')}
            </span>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>
        )}

        <div className="pb-safe-6 flex items-center justify-between pt-2">
          <div data-no-swipe>
            <VolumeSlider volume={isMuted ? 0 : volume} onVolumeChange={setVolume} />
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setShowLyrics(true)}
              aria-label="Lyrics"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors active:text-foreground"
            >
              <MessageSquare size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setLocation('/queue')}
              aria-label="Queue"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors active:text-foreground"
            >
              <ListMusic size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Both panels stay mounted and are driven by `open`. Rendering them
          conditionally meant a vaul drawer appeared already-open (so it never
          animated in) and was torn out of the tree mid-close (so its teardown
          never ran, leaving `pointer-events: none` on <body> — which is why the
          (i), lyrics and queue buttons all stopped responding after one use). */}
      <LyricsPanel open={showLyrics} onOpenChange={setShowLyrics} />
      <SongInfoModal open={showInfo} onOpenChange={setShowInfo} />
    </div>
  );
}

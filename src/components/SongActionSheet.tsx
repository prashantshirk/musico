import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore } from '../store/playerStore';
import { useSongMenuStore } from '../store/songMenuStore';
import { getPlaylists, updatePlaylist } from '../api/playlists';
import { star, unstar } from '../api/annotation';
import { toast } from '../hooks/use-toast';
import { formatTime } from '../utils/time';
import { cn } from '../lib/utils';
import { CoverArt } from './CoverArt';
import { Skeleton } from './ui/skeleton';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from './ui/drawer';
import {
  ChevronLeft, ChevronRight, CornerDownRight, Disc3, Info, ListMusic,
  ListPlus, Play, Plus, Radio, Star, User,
} from 'lucide-react';

type View = 'actions' | 'details' | 'playlists';

/** One tappable line. 56px tall, which is the row height the rest of the app uses. */
function ActionRow({
  icon, label, hint, onClick, chevron, tinted, disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  chevron?: boolean;
  tinted?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="hover-elevate active-elevate-2 flex h-14 w-full items-center gap-3.5 rounded-xl px-3 text-left disabled:opacity-50"
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          tinted ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-tight text-foreground">
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      {chevron && <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
    </button>
  );
}
/**
 * The one song menu in the app, mounted above the router.
 *
 * It used to be a Radix dialog rendered *inside* each SongRow, which had two
 * problems on a phone. The row is itself a `role="button"` that starts
 * playback, so the menu had to fight its way out with stopPropagation; and song
 * lists are virtualized, so a row can unmount while its overlay is still
 * closing — leaving `pointer-events: none` on <body> and killing every tap in
 * the app until the next full re-render. Both go away once the sheet lives here
 * and rows only push a song into `songMenuStore`.
 *
 * It also does more than the old one, which only printed facts: queue actions,
 * an AI radio seed, playlist filing, and navigation to the album or artist.
 */
export function SongActionSheet() {
  const song = useSongMenuStore(state => state.song);
  const open = useSongMenuStore(state => state.open);
  const requestedView = useSongMenuStore(state => state.view);
  const setOpen = useSongMenuStore(state => state.setOpen);

  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>('actions');
  const [isStarred, setIsStarred] = useState(false);
  const [savingTo, setSavingTo] = useState<string | null>(null);

  /* Every opening starts from the view the caller asked for, with the star flag
   * re-read off the track just handed over — the sheet outlives the rows, so it
   * cannot carry the previous song's state into the next opening. */
  useEffect(() => {
    if (!open || !song) return;
    setView(requestedView);
    setIsStarred(!!song.starred);
    setSavingTo(null);
  }, [open, song, requestedView]);

  /* Only fetched when the playlist view is actually reached, and shared with
   * Library's playlists tab under the same key. */
  const { data: playlists, isLoading: loadingPlaylists } = useQuery({
    queryKey: ['playlists'],
    queryFn: getPlaylists,
    enabled: open && view === 'playlists',
  });

  if (!song) return null;
  const close = () => setOpen(false);
  const player = () => usePlayerStore.getState();

  const playNow = () => {
    /* No queue argument: this drops the track in at the cursor and leaves the
     * rest of the queue standing, rather than replacing what you were playing. */
    player().playSong(song);
    close();
  };

  const playNext = () => {
    player().addNextInQueue(song);
    toast({ title: 'Playing next', description: song.title });
    close();
  };

  const addToQueue = () => {
    player().addToQueue(song);
    toast({ title: 'Added to queue', description: song.title });
    close();
  };

  const startAiRadio = () => {
    /* Hands the seed to the recommendation service: the queue starts as this one
     * track and useAutoQueue refills it from getSimilarSongs as it drains. */
    player().startAiRadio(song);
    toast({ title: 'AI radio', description: `Building a queue around "${song.title}".` });
    close();
  };

  const toggleStar = () => {
    const next = !isStarred;
    setIsStarred(next);
    (next ? star : unstar)(song.id, 'song')
      .then(() => queryClient.invalidateQueries({ queryKey: ['starred'] }))
      .catch(() => {
        setIsStarred(!next);
        toast({ variant: 'destructive', title: 'Could not update favourites' });
      });
  };

  const goTo = (path: string) => {
    close();
    setLocation(path);
  };
  const addToPlaylist = async (playlistId: string, playlistName: string) => {
    setSavingTo(playlistId);
    try {
      await updatePlaylist(playlistId, { songIdsToAdd: [song.id] });
      queryClient.invalidateQueries({ queryKey: ['playlist', playlistId] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast({ title: 'Added to playlist', description: `${song.title} → ${playlistName}` });
      close();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not add to playlist',
        description: 'The server rejected the change.',
      });
    } finally {
      setSavingTo(null);
    }
  };

  /* Grouped by what the field describes, and a group with nothing in it is
   * dropped rather than printing "Unknown" three times. */
  const specs: { heading: string; rows: [string, string | null][] }[] = [
    {
      heading: 'Track',
      rows: [
        ['Artist', song.artist],
        ['Album', song.album || null],
        ['Position', song.track ? `#${song.track}` : null],
        ['Duration', formatTime(song.duration)],
      ],
    },
    {
      heading: 'Release',
      rows: [
        ['Year', song.year ? String(song.year) : null],
        ['Genre', song.genre || null],
      ],
    },
    {
      heading: 'File',
      rows: [
        ['Bitrate', song.bitRate ? `${song.bitRate} kbps` : null],
        ['Size', song.size ? `${(song.size / 1048576).toFixed(2)} MB` : null],
      ],
    },
  ];
  const heading =
    view === 'details' ? 'Track details' : view === 'playlists' ? 'Add to playlist' : song.title;

  return (
    /* Mounted for the life of the app and driven by `open`, never by whether the
     * element exists. vaul needs the close transition to run to put <body> back
     * the way it found it. */
    <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[88vh] border-border bg-card">
        <div className="flex items-center gap-3 px-4 pb-3 pt-3">
          {view === 'actions' ? (
            <CoverArt
              id={song.albumId || song.id}
              alt={song.album || song.title}
              size={200}
              className="h-14 w-14 shrink-0 rounded-lg bg-muted"
            />
          ) : (
            <button
              type="button"
              onClick={() => setView('actions')}
              aria-label="Back"
              className="hover-elevate active-elevate-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground"
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <DrawerTitle className="truncate font-syne text-[17px] font-bold leading-tight">
              {heading}
            </DrawerTitle>
            <DrawerDescription className="truncate text-[13px]">
              {view === 'actions' ? song.artist : song.title}
            </DrawerDescription>
          </div>
        </div>

        <div className="pb-safe-6 hide-scrollbar overflow-y-auto px-2">
          {view === 'actions' && (
            <div className="flex flex-col">
              <ActionRow
                icon={<Play size={17} fill="currentColor" aria-hidden="true" />}
                label="Play now"
                onClick={playNow}
                tinted
              />
              <ActionRow
                icon={<CornerDownRight size={18} aria-hidden="true" />}
                label="Play next"
                onClick={playNext}
              />
              <ActionRow
                icon={<ListPlus size={18} aria-hidden="true" />}
                label="Add to queue"
                onClick={addToQueue}
              />
              <ActionRow
                icon={<Radio size={18} aria-hidden="true" />}
                label="Start AI radio"
                hint="Similar tracks from your library"
                onClick={startAiRadio}
              />

              <div className="my-1.5 h-px bg-border" aria-hidden="true" />

              <ActionRow
                icon={<Star size={18} fill={isStarred ? 'currentColor' : 'none'} aria-hidden="true" />}
                label={isStarred ? 'Remove from favourites' : 'Add to favourites'}
                onClick={toggleStar}
              />
              <ActionRow
                icon={<Plus size={18} aria-hidden="true" />}
                label="Add to playlist"
                onClick={() => setView('playlists')}
                chevron
              />

              <div className="my-1.5 h-px bg-border" aria-hidden="true" />
              {song.albumId && (
                <ActionRow
                  icon={<Disc3 size={18} aria-hidden="true" />}
                  label="Go to album"
                  hint={song.album || undefined}
                  onClick={() => goTo(`/album/${song.albumId}`)}
                  chevron
                />
              )}
              {song.artistId && (
                <ActionRow
                  icon={<User size={18} aria-hidden="true" />}
                  label="Go to artist"
                  hint={song.artist}
                  onClick={() => goTo(`/artist/${song.artistId}`)}
                  chevron
                />
              )}
              <ActionRow
                icon={<Info size={18} aria-hidden="true" />}
                label="Track details"
                onClick={() => setView('details')}
                chevron
              />
            </div>
          )}
          {view === 'details' && (
            <div className="px-2 pb-2">
              {specs.map(section => {
                const rows = section.rows.filter((row): row is [string, string] => !!row[1]);
                if (rows.length === 0) return null;

                return (
                  <section key={section.heading} className="mt-5 first:mt-1">
                    <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {section.heading}
                    </h3>
                    <dl className="divide-y divide-border">
                      {rows.map(([label, value]) => (
                        <div key={label} className="flex items-baseline justify-between gap-6 py-2.5">
                          <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
                          <dd className="min-w-0 truncate text-right font-mono text-[13px] tabular-nums text-foreground">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                );
              })}
            </div>
          )}

          {view === 'playlists' && (
            <div className="flex flex-col pb-2">
              {loadingPlaylists && !playlists?.length &&
                [0, 1, 2, 3].map(i => <Skeleton key={i} className="mx-1 mb-2 h-14 rounded-xl" />)}

              {playlists?.map((playlist: any) => (
                <ActionRow
                  key={playlist.id}
                  icon={<ListMusic size={18} aria-hidden="true" />}
                  label={playlist.name}
                  hint={`${playlist.songCount} songs`}
                  disabled={savingTo !== null}
                  onClick={() => addToPlaylist(playlist.id, playlist.name)}
                />
              ))}

              {!loadingPlaylists && !playlists?.length && (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No playlists on the server yet.
                </p>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}


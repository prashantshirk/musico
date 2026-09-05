import { create } from 'zustand';
import { Song } from '../types';

/**
 * The song action sheet lives at the top of the app, not inside the row that
 * opened it — so it needs somewhere outside the list to keep "which song".
 *
 * Why it can't live in the row: song lists are virtualized, so a row unmounts
 * the moment it scrolls out of the window. A Radix/vaul overlay that unmounts
 * mid-close never runs its own teardown, which leaves `pointer-events: none`
 * on <body> and makes the whole app stop responding to taps. Mounting the
 * sheet once, above the router, removes that failure mode entirely.
 *
 * Not persisted: a half-open menu is not state worth restoring.
 */
interface SongMenuState {
  song: Song | null;
  open: boolean;
  /** Where the sheet opens. Rows want the actions; the player's (i) wants specs. */
  view: 'actions' | 'details';
  openSongMenu: (song: Song, view?: 'actions' | 'details') => void;
  setOpen: (open: boolean) => void;
  setView: (view: 'actions' | 'details') => void;
}

export const useSongMenuStore = create<SongMenuState>((set) => ({
  song: null,
  open: false,
  view: 'actions',

  openSongMenu: (song, view = 'actions') => set({ song, view, open: true }),

  /* `song` is deliberately kept on close so the sheet still has something to
   * render while vaul animates it out. */
  setOpen: (open) => set({ open }),

  setView: (view) => set({ view }),
}));

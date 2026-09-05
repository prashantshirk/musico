import { useEffect, useState } from 'react';
import { coverArtUrl } from '../api/client';
import { getDominantColor } from '../utils/color';

/* Both the mini bar and the full-screen player sample this size, and the mini
 * bar displays it, so the accent costs no extra network request — the image is
 * already in the cover-art cache by the time we read it. Every distinct size is
 * a separate cache entry, so sharing one constant matters. */
export const PLAYER_ART_SIZE = 96;

const FALLBACK_ACCENT = 'rgb(122, 122, 128)';

/* Bounded, insertion-ordered LRU. Artwork colour never changes for a given
 * album, so it is worth keeping, but an unbounded Map keyed on album id grows
 * for the life of the session on a large library. */
const MAX_CACHED = 60;
const cache = new Map<string, string>();

function remember(key: string, value: string) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/**
 * Returns a single accent colour sampled from a release's artwork, as an
 * `rgb(...)` string. The player chrome is deliberately achromatic so that this
 * is the only saturated thing on screen, which makes the record itself the
 * source of the interface's colour.
 */
export function useArtworkAccent(artId: string | undefined): string {
  const [accent, setAccent] = useState(
    () => (artId ? cache.get(artId) : undefined) ?? FALLBACK_ACCENT
  );

  useEffect(() => {
    if (!artId) { setAccent(FALLBACK_ACCENT); return; }

    const cached = cache.get(artId);
    if (cached) { setAccent(cached); return; }

    const url = coverArtUrl(artId, PLAYER_ART_SIZE);
    if (!url) return;

    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';

    const read = () => {
      if (cancelled) return;
      const color = getDominantColor(img);
      remember(artId, color);
      setAccent(color);
    };

    const fail = () => { if (!cancelled) setAccent(FALLBACK_ACCENT); };

    img.addEventListener('load', read, { once: true });
    img.addEventListener('error', fail, { once: true });
    img.src = url;
    if (img.complete && img.naturalWidth > 0) read();

    return () => {
      cancelled = true;
      // Drop the decoded bitmap and abort any in-flight fetch.
      img.removeEventListener('load', read);
      img.removeEventListener('error', fail);
      img.src = '';
    };
  }, [artId]);

  return accent;
}

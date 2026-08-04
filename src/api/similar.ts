import { subsonicGet } from './client';

export async function getSimilarSongs(songId: string, count = 10) {
  const url = new URL('/api/ai-recommendations/rest/getSimilarSongs.view', window.location.origin);
  url.searchParams.set('u', 'admin');
  url.searchParams.set('t', 'x');
  url.searchParams.set('s', 'x');
  url.searchParams.set('v', '1.16.1');
  url.searchParams.set('c', 'test');
  url.searchParams.set('f', 'json');
  url.searchParams.set('id', songId);
  url.searchParams.set('count', String(count));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

  const data = await res.json();
  const response = data['subsonic-response'];
  const songs = response?.similarSongs?.song || response?.similarSongs2?.song || [];
  return Array.isArray(songs) ? songs : [songs];
}

export async function getTopSongsForArtist(artistName: string, count = 5) {
  try {
    const res = await subsonicGet<any>('getTopSongs.view', { artist: artistName, count });
    return res.topSongs?.song || [];
  } catch {
    return [];
  }
}

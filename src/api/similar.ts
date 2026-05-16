import { subsonicGet } from './client';
import { getRandomSongs } from './browsing';

export async function getSimilarSongs(songId: string, count = 10) {
  try {
    const res = await subsonicGet<any>('getSimilarSongs2.view', { id: songId, count });
    return res.similarSongs2?.song || [];
  } catch {
    return getRandomSongs(count);
  }
}

export async function getTopSongsForArtist(artistName: string, count = 5) {
  try {
    const res = await subsonicGet<any>('getTopSongs.view', { artist: artistName, count });
    return res.topSongs?.song || [];
  } catch {
    return [];
  }
}

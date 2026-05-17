import { subsonicGet } from './client';
import { getRandomSongs } from './browsing';

export async function getSimilarSongs(songId: string, count = 10) {
  try {
    const res = await subsonicGet<any>('getSimilarSongs2.view', { id: songId, count });
    const songs = res.similarSongs2?.song || [];
    if (songs.length > 0) return songs;
    
    // Fallback if server has no similar songs data (e.g. missing Last.fm integration)
    return await getRandomSongs(count);
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

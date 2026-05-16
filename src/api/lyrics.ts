import { subsonicGet } from './client';

export async function getLyrics(artist: string, title: string) {
  const res = await subsonicGet<any>('getLyrics.view', { artist, title });
  return res.lyrics;
}

export async function getSyncedLyrics(songId: string) {
  try {
    const res = await subsonicGet<any>('getLyricsBySongId.view', { id: songId });
    return res.lyricsList?.structuredLyrics || [];
  } catch {
    return [];
  }
}

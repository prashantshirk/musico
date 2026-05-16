import { subsonicGet } from './client';

export async function search(
  query: string,
  songCount = 20,
  albumCount = 10,
  artistCount = 10
) {
  const res = await subsonicGet<any>('search3.view', {
    query,
    songCount,
    albumCount,
    artistCount,
    songOffset: 0,
    albumOffset: 0,
    artistOffset: 0,
  });
  return {
    songs: res.searchResult3?.song || [],
    albums: res.searchResult3?.album || [],
    artists: res.searchResult3?.artist || [],
  };
}

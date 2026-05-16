import { subsonicGet } from './client';

export async function getArtists() {
  const res = await subsonicGet<any>('getArtists.view');
  const items = res.artists?.index || res.indexes?.index || [];
  return Array.isArray(items) ? items : [items];
}

export async function getArtist(id: string) {
  const res = await subsonicGet<any>('getArtist.view', { id });
  return res.artist;
}

export async function getArtistInfo(id: string) {
  const res = await subsonicGet<any>('getArtistInfo2.view', { id, count: 20 });
  return res.artistInfo2;
}

export async function getAlbum(id: string) {
  const res = await subsonicGet<any>('getAlbum.view', { id });
  return res.album;
}

export async function getAlbumInfo(id: string) {
  const res = await subsonicGet<any>('getAlbumInfo2.view', { id });
  return res.albumInfo;
}

export async function getSong(id: string) {
  const res = await subsonicGet<any>('getSong.view', { id });
  return res.song;
}

export async function getAlbumList(
  type: string,
  size = 20,
  offset = 0,
  extra: Record<string, string | number> = {}
) {
  const res = await subsonicGet<any>('getAlbumList2.view', { type, size, offset, ...extra });
  const items = res.albumList2?.album || res.albumList?.album || [];
  return Array.isArray(items) ? items : [items];
}

export async function getRandomSongs(size = 50, genre?: string) {
  const params: Record<string, string | number> = { size };
  if (genre) params.genre = genre;
  const res = await subsonicGet<any>('getRandomSongs.view', params);
  const items = res.randomSongs?.song || [];
  return Array.isArray(items) ? items : [items];
}

export async function getStarred() {
  const res = await subsonicGet<any>('getStarred2.view');
  return res.starred2;
}

export async function getGenres() {
  const res = await subsonicGet<any>('getGenres.view');
  const items = res.genres?.genre || [];
  return Array.isArray(items) ? items : [items];
}

export async function getSongsByGenre(genre: string, count = 50) {
  const res = await subsonicGet<any>('getSongsByGenre.view', { genre, count });
  const items = res.songsByGenre?.song || [];
  return Array.isArray(items) ? items : [items];
}

export async function getTopSongs(artistName: string, count = 10) {
  const res = await subsonicGet<any>('getTopSongs.view', { artist: artistName, count });
  const items = res.topSongs?.song || [];
  return Array.isArray(items) ? items : [items];
}

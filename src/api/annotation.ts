import { subsonicGet } from './client';

export async function star(id: string, type: 'song' | 'album' | 'artist' = 'song') {
  const paramKey = type === 'song' ? 'id' : type === 'album' ? 'albumId' : 'artistId';
  await subsonicGet('star.view', { [paramKey]: id });
}

export async function unstar(id: string, type: 'song' | 'album' | 'artist' = 'song') {
  const paramKey = type === 'song' ? 'id' : type === 'album' ? 'albumId' : 'artistId';
  await subsonicGet('unstar.view', { [paramKey]: id });
}

export async function setRating(id: string, rating: number) {
  await subsonicGet('setRating.view', { id, rating });
}

export async function scrobble(songId: string) {
  await subsonicGet('scrobble.view', {
    id: songId,
    submission: true,
    time: Date.now(),
  });
}

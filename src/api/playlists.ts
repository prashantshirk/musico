import { subsonicGet } from './client';
import { useAuthStore } from '../store/authStore';
import { generateAuth } from '../utils/auth';

const BASE = '/api/navidrome';

export async function getPlaylists() {
  const res = await subsonicGet<any>('getPlaylists.view');
  const items = res.playlists?.playlist || [];
  return Array.isArray(items) ? items : [items];
}

export async function getPlaylist(id: string) {
  const res = await subsonicGet<any>('getPlaylist.view', { id });
  return res.playlist;
}

export async function createPlaylist(name: string, songIds: string[]) {
  const { username, password } = useAuthStore.getState();
  if (!username || !password) throw new Error('Not authenticated');
  
  const auth = generateAuth(username, password);
  const params = new URLSearchParams({ ...auth, name });
  songIds.forEach(id => params.append('songId', id));
  
  const res = await fetch(`${BASE}/rest/createPlaylist.view?${params}`);
  const data = await res.json();
  return data['subsonic-response'].playlist;
}

export async function updatePlaylist(
  playlistId: string,
  opts: {
    name?: string;
    songIdsToAdd?: string[];
    songIndexesToRemove?: number[];
  }
) {
  const { username, password } = useAuthStore.getState();
  if (!username || !password) throw new Error('Not authenticated');
  
  const auth = generateAuth(username, password);
  const params = new URLSearchParams({ ...auth, playlistId });
  
  if (opts.name) params.set('name', opts.name);
  opts.songIdsToAdd?.forEach(id => params.append('songIdToAdd', id));
  opts.songIndexesToRemove?.forEach(i => params.append('songIndexToRemove', String(i)));
  
  await fetch(`${BASE}/rest/updatePlaylist.view?${params}`);
}

export async function deletePlaylist(id: string) {
  await subsonicGet('deletePlaylist.view', { id });
}

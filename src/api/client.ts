import { useAuthStore } from '../store/authStore';
import { generateAuth, buildParams } from '../utils/auth';

const BASE = '/api/navidrome';

export async function subsonicGet<T>(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const { username, password } = useAuthStore.getState();
  if (!username || !password) throw new Error('Not authenticated');

  const auth = generateAuth(username, password);
  const urlParams = buildParams(auth, params);
  let res: Response;
  try {
    res = await fetch(`${BASE}/rest/${endpoint}?${urlParams}`);
  } catch (e) {
    throw new Error('Cannot reach server — check your network connection');
  }

  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

  const data = await res.json();
  const response = data['subsonic-response'];
  
  // Debug logging for troubleshooting
  if (import.meta.env.DEV) {
    console.log(`[API ${endpoint}]`, JSON.stringify(response));
  }

  if (!response) throw new Error('Unexpected response from server');
  if (response.status !== 'ok') {
    throw new Error(response.error?.message || 'API error');
  }
  return response;
}

export function streamUrl(songId: string, maxBitRate = 320): string {
  const { username, password } = useAuthStore.getState();
  if (!username || !password) return '';
  const auth = generateAuth(username, password);
  const params = buildParams(auth, { id: songId, maxBitRate, format: 'mp3' });
  return `${BASE}/rest/stream.view?${params}`;
}

export function coverArtUrl(id: string, size = 300): string {
  if (!id) return '';
  const { username, password } = useAuthStore.getState();
  if (!username || !password) return '';
  const auth = generateAuth(username, password);
  const params = buildParams(auth, { id, size });
  return `${BASE}/rest/getCoverArt.view?${params}`;
}

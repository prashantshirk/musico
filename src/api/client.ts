import { useAuthStore } from '../store/authStore';
import { generateAuth, buildParams } from '../utils/auth';
import { getApiCache, setApiCache } from '../utils/storage';

const BASE = '/api/navidrome';

// Endpoints that should never be cached (real-time or large binary)
const NO_CACHE_ENDPOINTS = new Set(['stream.view', 'scrobble.view', 'star.view', 'unstar.view']);

export async function subsonicGet<T>(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
  const { username, password } = useAuthStore.getState();
  if (!username || !password) throw new Error('Not authenticated');

  const auth = generateAuth(username, password);
  const urlParams = buildParams(auth, params);

  const shouldCache = !NO_CACHE_ENDPOINTS.has(endpoint);
  // Build a stable cache key from endpoint + params (excluding auth which changes per session)
  const cacheKey = shouldCache
    ? `api:${endpoint}:${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()}`
    : null;

  let res: Response;
  try {
    res = await fetch(`${BASE}/rest/${endpoint}?${urlParams}`);
  } catch (e) {
    // Network failed — try IDB fallback
    if (cacheKey) {
      const cached = await getApiCache<T>(cacheKey);
      if (cached) return cached;
    }
    throw new Error('Cannot reach server — check your network connection');
  }

  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

  const data = await res.json();
  const response = data['subsonic-response'];

  if (!response) throw new Error('Unexpected response from server');
  if (response.status !== 'ok') {
    throw new Error(response.error?.message || 'API error');
  }

  // Persist successful response to IDB for offline / future fast-start
  if (cacheKey) {
    setApiCache(cacheKey, response); // fire-and-forget
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

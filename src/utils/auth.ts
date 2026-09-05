import md5 from 'md5';

export interface SubsonicAuth {
  u: string;
  t: string;
  s: string;
  v: string;
  c: string;
  f: string;
}

// Auth cache: generate one salt+token per user and keep reusing it.
//
// Every cover-art / metadata URL embeds `t` and `s`, so if the salt changes the
// URL changes and every cache keyed on that URL misses. This used to live in
// sessionStorage, which is dropped when the PWA is closed — so each cold launch
// minted a fresh salt and re-downloaded every image the app had already cached.
// localStorage keeps the salt stable across launches.
//
// Note this stores a salted md5 of the password, not the password itself — and
// the auth store already persists the credentials to localStorage in order to
// derive it, so this doesn't widen what's on disk.
const AUTH_STORAGE_KEY = 'nt-auth';

let _cachedAuth: SubsonicAuth | null = null;
let _cachedForUser: string | null = null;

function readStoredAuth(username: string): SubsonicAuth | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const stored = store.getItem(AUTH_STORAGE_KEY);
      if (!stored) continue;
      const parsed = JSON.parse(stored) as SubsonicAuth & { _user?: string };
      if (parsed._user !== username || !parsed.t || !parsed.s) continue;
      return { u: parsed.u, t: parsed.t, s: parsed.s, v: parsed.v, c: parsed.c, f: parsed.f };
    } catch {
      // malformed entry — fall through and mint a new salt
    }
  }
  return null;
}

export function generateAuth(username: string, password: string): SubsonicAuth {
  // Return cached auth if same user (stable for the full session)
  if (_cachedAuth && _cachedForUser === username) {
    return _cachedAuth;
  }

  const restored = readStoredAuth(username);
  if (restored) {
    _cachedAuth = restored;
    _cachedForUser = username;
    return _cachedAuth;
  }

  // Generate a new salt+token, then keep it for good
  const salt = Math.random().toString(36).substring(2, 10);
  const token = md5(password + salt);
  const auth: SubsonicAuth = { u: username, t: token, s: salt, v: '1.16.1', c: 'Musico', f: 'json' };

  _cachedAuth = auth;
  _cachedForUser = username;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...auth, _user: username }));
  } catch {
    // Private mode / quota — in-memory cache still keeps URLs stable this session
  }

  return auth;
}

/** Call on logout to clear the cached auth token */
export function clearAuthCache() {
  _cachedAuth = null;
  _cachedForUser = null;
  try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
}

export function buildParams(auth: SubsonicAuth, extra: Record<string, string | number | boolean> = {}): URLSearchParams {
  return new URLSearchParams({ ...auth, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) });
}

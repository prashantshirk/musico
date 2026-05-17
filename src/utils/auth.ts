import md5 from 'md5';

export interface SubsonicAuth {
  u: string;
  t: string;
  s: string;
  v: string;
  c: string;
  f: string;
}

// Session-stable auth cache: generate once per session, reuse for all URLs.
// This is critical for HTTP cache and Service Worker cache to work — every
// URL must be identical for the same resource across renders.
let _cachedAuth: SubsonicAuth | null = null;
let _cachedForUser: string | null = null;

export function generateAuth(username: string, password: string): SubsonicAuth {
  // Return cached auth if same user (stable for the full session)
  if (_cachedAuth && _cachedForUser === username) {
    return _cachedAuth;
  }

  // Try to restore from sessionStorage (survives component remounts, not page reload)
  const stored = sessionStorage.getItem('nt-auth');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as SubsonicAuth & { _user: string };
      if (parsed._user === username) {
        _cachedAuth = { u: parsed.u, t: parsed.t, s: parsed.s, v: parsed.v, c: parsed.c, f: parsed.f };
        _cachedForUser = username;
        return _cachedAuth;
      }
    } catch {
      // ignore malformed session data
    }
  }

  // Generate a new salt+token for this session
  const salt = Math.random().toString(36).substring(2, 10);
  const token = md5(password + salt);
  const auth: SubsonicAuth = { u: username, t: token, s: salt, v: '1.16.1', c: 'Musico', f: 'json' };

  _cachedAuth = auth;
  _cachedForUser = username;
  sessionStorage.setItem('nt-auth', JSON.stringify({ ...auth, _user: username }));

  return auth;
}

/** Call on logout to clear the cached auth token */
export function clearAuthCache() {
  _cachedAuth = null;
  _cachedForUser = null;
  sessionStorage.removeItem('nt-auth');
}

export function buildParams(auth: SubsonicAuth, extra: Record<string, string | number | boolean> = {}): URLSearchParams {
  return new URLSearchParams({ ...auth, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) });
}

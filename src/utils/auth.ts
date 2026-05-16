import md5 from 'md5';

export interface SubsonicAuth {
  u: string;
  t: string;
  s: string;
  v: string;
  c: string;
  f: string;
}

export function generateAuth(username: string, password: string): SubsonicAuth {
  const salt = Math.random().toString(36).substring(2, 10);
  const token = md5(password + salt);
  return { u: username, t: token, s: salt, v: '1.16.1', c: 'Musico', f: 'json' };
}

export function buildParams(auth: SubsonicAuth, extra: Record<string, string | number | boolean> = {}): URLSearchParams {
  return new URLSearchParams({ ...auth, ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])) });
}

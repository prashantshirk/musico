import { generateAuth, buildParams } from '../utils/auth';

const BASE = '/api/navidrome';

export async function ping(username: string, password: string): Promise<boolean> {
  const auth = generateAuth(username, password);
  const params = buildParams(auth);
  let res: Response;
  try {
    res = await fetch(`${BASE}/rest/ping.view?${params}`);
  } catch (e) {
    throw new Error('Cannot reach server — check your network connection');
  }
  if (!res.ok) {
    throw new Error(`Server returned ${res.status}`);
  }
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Unexpected response from server');
  }
  const subsonicResponse = data['subsonic-response'];
  if (!subsonicResponse) throw new Error('Unexpected response from server');
  if (subsonicResponse.status !== 'ok') {
    const msg = subsonicResponse.error?.message;
    throw new Error(msg || 'Invalid username or password');
  }
  return true;
}

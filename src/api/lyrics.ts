import { subsonicGet } from './client';

export async function getLyrics(artist: string, title: string) {
  const res = await subsonicGet<any>('getLyrics.view', { artist, title });
  return res.lyrics;
}

export async function getSyncedLyrics(artist: string, title: string, duration?: number) {
  try {
    const params = new URLSearchParams({
      artist_name: artist,
      track_name: title,
    });
    if (duration) params.append('duration', duration.toString());
    
    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
    if (!res.ok) return [];
    
    const data = await res.json();
    if (!data.syncedLyrics) return [];

    const lines = data.syncedLyrics.split('\n');
    const parsed: { start: number; value: string }[] = [];

    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    for (const line of lines) {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        let millis = parseInt(match[3], 10);
        if (match[3].length === 2) millis *= 10;
        
        const text = line.replace(timeRegex, '').trim();
        parsed.push({
          start: minutes * 60000 + seconds * 1000 + millis,
          value: text
        });
      }
    }
    return parsed;
  } catch {
    return [];
  }
}

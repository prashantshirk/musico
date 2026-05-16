import { subsonicGet } from './client';

export async function scrobble(id: string, submission: boolean = true) {
  try {
    await subsonicGet<any>('scrobble', {
      id,
      time: new Date().getTime(),
      submission,
    });
  } catch (error) {
    console.error('Failed to scrobble:', error);
  }
}

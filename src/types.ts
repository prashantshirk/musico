export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  coverArt?: string;
  duration: number; // seconds
  track?: number;
  year?: number;
  genre?: string;
  bitRate?: number;
  size?: number;
  starred?: string; // ISO date string if starred
  userRating?: number; // 1-5
}

export interface Album {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  coverArt?: string;
  songCount: number;
  duration: number;
  year?: number;
  genre?: string;
  starred?: string;
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  coverArt?: string;
  starred?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songCount: number;
  duration: number;
  coverArt?: string;
  owner: string;
  public: boolean;
}

export interface SyncedLyricsLine {
  start: number; // milliseconds
  value: string;
}

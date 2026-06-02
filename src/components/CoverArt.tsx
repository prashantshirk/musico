import { useState, useEffect, useRef, memo } from 'react';
import { Music } from 'lucide-react';
import { coverArtUrl } from '../api/client';

interface CoverArtProps {
  /** The Navidrome item ID (album, song, artist) */
  id: string;
  alt: string;
  className?: string;
  /** Full resolution size in px (default 300) */
  size?: number;
}

/**
 * Progressive cover art loader with:
 * - IntersectionObserver: only load images visible on screen
 * - Crossfade: smooth transition when full res loads
 */
export const CoverArt = memo(function CoverArt({ id, alt, className = '', size = 300 }: CoverArtProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!id || error) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <Music size={Math.max(size / 4, 20)} />
      </div>
    );
  }

  const fullUrl = coverArtUrl(id, size);

  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {/* Full-resolution image — native lazy load */}
      <img
        src={fullUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
      />
      
      {/* Placeholder Icon while loading */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
           <Music size={Math.max(size / 4, 20)} />
        </div>
      )}
    </div>
  );
});


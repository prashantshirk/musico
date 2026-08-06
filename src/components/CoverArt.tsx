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

// Global set of URLs that have successfully loaded during this session.
// Prevents flash-to-invisible on component remounts / React Query refetches.
const loadedUrls = new Set<string>();

/**
 * Progressive cover art loader with:
 * - Session-level loaded URL cache (instant display on remount)
 * - Crossfade: smooth transition when full res loads first time
 */
export const CoverArt = memo(function CoverArt({ id, alt, className = '', size = 300 }: CoverArtProps) {
  const fullUrl = id ? coverArtUrl(id, size) : '';
  const [loaded, setLoaded] = useState(() => loadedUrls.has(fullUrl));
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (loadedUrls.has(fullUrl)) {
      setLoaded(true);
    } else if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      loadedUrls.add(fullUrl);
      setLoaded(true);
    }
  }, [fullUrl]);

  if (!id || error) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <Music size={Math.max(size / 4, 20)} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {/* Full-resolution image — native lazy load */}
      <img
        ref={imgRef}
        src={fullUrl}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => {
          if (fullUrl) loadedUrls.add(fullUrl);
          setLoaded(true);
        }}
        onError={() => setError(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
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



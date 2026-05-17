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
  const [isVisible, setIsVisible] = useState(false);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Observe when this element enters the viewport
  useEffect(() => {
    if (!id) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // start loading 200px before it enters view
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [id]);

  if (!id || error) {
    return (
      <div ref={containerRef} className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <Music size={Math.max(size / 4, 20)} />
      </div>
    );
  }

  const fullUrl  = coverArtUrl(id, size);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-muted ${className}`}>
      {/* Full-resolution image — loaded only when visible */}
      {isVisible && (
        <img
          src={fullUrl}
          alt={alt}
          onLoad={() => setFullLoaded(true)}
          onError={() => setError(true)}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: fullLoaded ? 1 : 0, transition: 'opacity 0.4s ease' }}
          decoding="async"
        />
      )}
      
      {/* Placeholder Icon while loading */}
      {!fullLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
           <Music size={Math.max(size / 4, 20)} />
        </div>
      )}
    </div>
  );
});


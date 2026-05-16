import { useState } from 'react';
import { Music } from 'lucide-react';

interface CoverArtProps {
  src: string;
  alt: string;
  className?: string;
  size?: number;
}

export function CoverArt({ src, alt, className = "", size = 300 }: CoverArtProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <Music size={size / 4} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}

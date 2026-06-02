import { X, Info, FileAudio, Clock, HardDrive, Calendar, Disc, ListMusic } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/time';

interface SongInfoModalProps {
  onClose: () => void;
}

export function SongInfoModal({ onClose }: SongInfoModalProps) {
  const currentSong = usePlayerStore((state) => state.currentSong);

  if (!currentSong) return null;

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const statRows = [
    { label: 'Title', value: currentSong.title, icon: Info },
    { label: 'Artist', value: currentSong.artist, icon: Info },
    { label: 'Album', value: currentSong.album, icon: Disc },
    { label: 'Track #', value: currentSong.track || 'Unknown', icon: ListMusic },
    { label: 'Duration', value: formatTime(currentSong.duration), icon: Clock },
    { label: 'Year', value: currentSong.year || 'Unknown', icon: Calendar },
    { label: 'Genre', value: currentSong.genre || 'Unknown', icon: Info },
    { label: 'Bitrate', value: currentSong.bitRate ? `${currentSong.bitRate} kbps` : 'Unknown', icon: FileAudio },
    { label: 'Size', value: formatSize(currentSong.size), icon: HardDrive },
  ];

  return (
    <div 
      className="absolute inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col pt-12 pb-8 px-6 animate-in slide-in-from-bottom-full duration-300"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Info className="text-primary" size={24} />
          <h2 className="text-2xl font-syne font-bold text-foreground">Song Info</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-foreground/60 hover:text-foreground bg-foreground/5 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar">
        <div className="flex flex-col gap-4">
          {statRows.map((stat, i) => (
            <div key={i} className="flex items-center gap-4 bg-foreground/5 p-4 rounded-xl">
              <div className="p-2 bg-primary/20 text-primary rounded-lg shrink-0">
                <stat.icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  {stat.label}
                </div>
                <div className="text-foreground font-medium truncate">
                  {stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

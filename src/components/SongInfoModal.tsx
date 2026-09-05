import { usePlayerStore } from '../store/playerStore';
import { formatTime } from '../utils/time';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';

interface SongInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * A spec sheet, not a list of cards. The previous version gave every row its own
 * icon tile — nine tiles, several of them the same generic glyph — which made the
 * decoration louder than the data. Here the label/value pair does the work, in
 * the same monospace the timecodes use, grouped by what the field describes.
 *
 * Stays mounted and takes `open`: a vaul drawer that is unmounted while it is
 * still closing never restores the body styles it set, which locks out every tap
 * on the page behind it.
 */
export function SongInfoModal({ open, onOpenChange }: SongInfoModalProps) {
  const currentSong = usePlayerStore((state) => state.currentSong);

  if (!currentSong) return null;

  const sections: { heading: string; rows: [string, string | null][] }[] = [
    {
      heading: 'Track',
      rows: [
        ['Title', currentSong.title],
        ['Artist', currentSong.artist],
        ['Album', currentSong.album || null],
        ['Position', currentSong.track ? `#${currentSong.track}` : null],
        ['Duration', formatTime(currentSong.duration)],
      ],
    },
    {
      heading: 'Release',
      rows: [
        ['Year', currentSong.year ? String(currentSong.year) : null],
        ['Genre', currentSong.genre || null],
      ],
    },
    {
      heading: 'File',
      rows: [
        ['Bitrate', currentSong.bitRate ? `${currentSong.bitRate} kbps` : null],
        ['Size', currentSong.size ? `${(currentSong.size / 1048576).toFixed(2)} MB` : null],
      ],
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="max-h-[85vh] border-border bg-card">
        <DrawerHeader className="px-6 pb-2 text-left">
          <DrawerTitle className="font-syne text-xl font-bold">Track details</DrawerTitle>
          <DrawerDescription className="truncate">{currentSong.title}</DrawerDescription>
        </DrawerHeader>

        <div className="pb-safe-6 overflow-y-auto px-6">
          {sections.map((section) => {
            /* A section with nothing in it is not an empty state, it is noise —
               drop the heading too rather than printing "Unknown" three times. */
            const rows = section.rows.filter((row): row is [string, string] => !!row[1]);
            if (rows.length === 0) return null;

            return (
              <section key={section.heading} className="mt-6 first:mt-2">
                <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {section.heading}
                </h3>
                <dl className="divide-y divide-border">
                  {rows.map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-6 py-2.5">
                      <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
                      <dd className="min-w-0 truncate text-right font-mono text-[13px] tabular-nums text-foreground">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

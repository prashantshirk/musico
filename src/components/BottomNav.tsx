import { Link, useLocation } from 'wouter';
import { Home, Search, Library, PlayCircle } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';

export function BottomNav() {
  const [location] = useLocation();
  const currentSong = usePlayerStore(state => state.currentSong);

  const tabs = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Library', path: '/library', icon: Library },
  ];

  if (currentSong) {
    tabs.push({ name: 'Playing', path: '/now-playing', icon: PlayCircle });
  }

  return (
    /* The bar grows by the safe inset instead of padding inwards. With
     * box-sizing: border-box, `h-16` plus `pb-safe` squeezed the icons into
     * 64px minus a 34px home indicator on notched phones. */
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl"
      style={{
        height: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex h-full items-center justify-around px-2">
        {tabs.map(tab => {
          const isActive = location.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <Link key={tab.path} href={tab.path} className="flex-1 h-full">
              <div className={`flex flex-col items-center justify-center h-full gap-1 transition-all active:scale-90 active:opacity-70 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium leading-none">{tab.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

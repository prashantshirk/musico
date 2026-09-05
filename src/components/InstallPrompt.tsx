import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from './ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);

  useEffect(() => {
    // Only show if logged in
    if (!isLoggedIn) return;

    // 1. Detect if already running as installed app (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone;
    
    if (isStandalone) {
      return;
    }

    // Check if they dismissed it permanently
    const dismissed = localStorage.getItem('nt-install-dismissed');
    if (dismissed) {
      return;
    }

    // 2. Detect if user is on mobile browser
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobileDevice) {
      return;
    }

    // 3. Detect iOS specifically
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // iOS doesn't support beforeinstallprompt, so we show the prompt directly
      setIsVisible(true);
    }

    // 4. Handle Android/Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isLoggedIn]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Hide our custom banner
    setIsVisible(false);
    
    // Show the browser's install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user's choice
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Keep it dismissed permanently using localStorage
    localStorage.setItem('nt-install-dismissed', 'true');
  };

  if (!isVisible || !isLoggedIn) return null;

  return (
    // Sits clear of both the bottom nav (4rem) and the mini player (3.5rem plus
    // its own offset). At `bottom-24` it overlapped them, so the banner's
    // backdrop covered the play button until it was dismissed. z-30 keeps it
    // behind the player chrome rather than in front of it.
    <div
      className="fixed left-4 right-4 z-30 animate-in slide-in-from-bottom-6 duration-500"
      style={{ bottom: 'calc(9rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Was a permanently dark card — `bg-black/60` with `text-white` — which
          inverted against the rest of the app whenever the light theme was on.
          `bg-card` keeps it a raised panel in both themes. */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
        {/* Glow effect */}
        <div className="absolute -left-16 -top-16 -z-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />

        <div className="flex gap-3">
          {/* T-Rex Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
            <img
              src="/favicon.png"
              alt=""
              aria-hidden="true"
              className="h-9 w-9 object-contain"
            />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground">Install Musico</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {isIOS
                ? "Tap Share (bottom browser menu) then select 'Add to Home Screen' for background playback."
                : "Install the web app to get locked screen controls and high quality playback."
              }
            </p>
          </div>

          {/* Close button. Was a 24px box — below the 44px minimum, and the
              hardest control on this card to hit given what is behind it. */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Action Button for Android/Chrome */}
        {!isIOS && deferredPrompt && (
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={handleDismiss} className="min-h-11 px-4 text-xs font-semibold">
              Maybe later
            </Button>
            <Button onClick={handleInstallClick} className="min-h-11 gap-1.5 px-4 text-xs font-bold [&_svg]:size-4">
              <Download aria-hidden="true" />
              Install
            </Button>
          </div>
        )}

        {/* Action Hint for iOS */}
        {isIOS && (
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Share size={16} className="text-primary" aria-hidden="true" />
            <span>Tap Share &rarr; Add to Home Screen</span>
          </div>
        )}
      </div>
    </div>
  );
}

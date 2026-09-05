import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl shadow-2xl">
        {/* Glow effect */}
        <div className="absolute -left-16 -top-16 -z-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />

        <div className="flex gap-4">
          {/* T-Rex Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <img 
              src="/favicon.png" 
              alt="Musico T-Rex" 
              className="h-9 w-9 object-contain"
            />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-base">Install Musico</h3>
            <p className="text-white/60 text-xs mt-0.5 leading-relaxed">
              {isIOS 
                ? "Tap Share (bottom browser menu) then select 'Add to Home Screen' for background playback."
                : "Install the web app to get locked screen controls and high quality playback."
              }
            </p>
          </div>

          {/* Close button */}
          <button 
            onClick={handleDismiss}
            className="h-6 w-6 text-white/40 hover:text-white/80 transition-colors flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Button for Android/Chrome */}
        {!isIOS && deferredPrompt && (
          <div className="mt-3 flex gap-2 justify-end">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Maybe later
            </button>
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Download size={14} />
              Install
            </button>
          </div>
        )}

        {/* Action Hint for iOS */}
        {isIOS && (
          <div className="mt-3 flex items-center gap-2 text-white/50 text-[10px] uppercase font-bold tracking-wider border-t border-white/5 pt-2.5">
            <Share size={12} className="text-primary animate-pulse" />
            <span>Tap Share &rarr; Add to Home Screen</span>
          </div>
        )}
      </div>
    </div>
  );
}

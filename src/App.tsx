import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, lazy, Suspense } from "react";
import { useAuthStore } from "./store/authStore";
import { usePlayerStore } from "./store/playerStore";
import { useAutoQueue } from "./hooks/useAutoQueue";
import { useScrobble } from "./hooks/useScrobble";
import { useMediaSession } from "./hooks/useMediaSession";
import { MiniPlayer } from "./components/MiniPlayer";
import { BottomNav } from "./components/BottomNav";
import { InstallPrompt } from "./components/InstallPrompt";

// Route-level code splitting — each page chunk loads only when first visited
const Login       = lazy(() => import('./pages/Login'));
const Home        = lazy(() => import('./pages/Home'));
const Library     = lazy(() => import('./pages/Library'));
const Search      = lazy(() => import('./pages/Search'));
const AlbumDetail = lazy(() => import('./pages/AlbumDetail'));
const ArtistDetail  = lazy(() => import('./pages/ArtistDetail'));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail'));
const NowPlaying  = lazy(() => import('./pages/NowPlaying'));
const Queue       = lazy(() => import('./pages/Queue'));
const NotFound    = lazy(() => import('./pages/not-found'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Keep data fresh for 10 minutes — navigating back to Home is instant
      staleTime: 10 * 60 * 1000,
      // Keep unused data in memory for 30 minutes
      gcTime: 30 * 60 * 1000,
    },
  },
});


function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoggedIn) {
      setLocation('/login');
    }
  }, [isLoggedIn, setLocation]);

  if (!isLoggedIn) return null;
  return <Component />;
}

function AppShell() {
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);
  // Selector subscriptions only. This component wraps every route, so anything
  // it subscribes to re-renders the entire tree — `progress` used to be read
  // here, which meant the whole app re-rendered on every progress tick.
  const currentSong = usePlayerStore(state => state.currentSong);
  const [location, setLocation] = useLocation();
  const [hasHydrated, setHasHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHasHydrated(true));
    setHasHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);

  // Root redirect
  useEffect(() => {
    if (!hasHydrated) return;
    if (location === '/') {
      setLocation(isLoggedIn ? '/home' : '/login');
    }
  }, [location, isLoggedIn, setLocation, hasHydrated]);

  // Prefetch the Queue chunk (heaviest route: 17kB gz, contains dnd-kit) while the
  // browser is idle after the initial page load. Falls back to setTimeout on Safari
  // which doesn't implement requestIdleCallback.
  //
  // Must stay above the `hasHydrated` early return — declaring a hook after a
  // conditional return changes the hook count between renders, which React treats
  // as a fatal error the moment hydration flips.
  useEffect(() => {
    if (!isLoggedIn) return;
    const prefetch = () => { import('./pages/Queue'); };
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(prefetch, 0);
      return () => clearTimeout(id);
    }
  }, [isLoggedIn]);

  // Global hooks
  useAutoQueue();
  useScrobble();
  useMediaSession();

  if (!hasHydrated) {
    return <main className="min-h-screen bg-background" />;
  }

  const isNowPlaying = location === '/now-playing';
  const showChrome = isLoggedIn && !isNowPlaying;

  return (
    <>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/home"><ProtectedRoute component={Home} /></Route>
          <Route path="/library"><ProtectedRoute component={Library} /></Route>
          <Route path="/search"><ProtectedRoute component={Search} /></Route>
          <Route path="/album/:id"><ProtectedRoute component={AlbumDetail} /></Route>
          <Route path="/artist/:id"><ProtectedRoute component={ArtistDetail} /></Route>
          <Route path="/playlist/:id"><ProtectedRoute component={PlaylistDetail} /></Route>
          <Route path="/now-playing"><ProtectedRoute component={NowPlaying} /></Route>
          <Route path="/queue"><ProtectedRoute component={Queue} /></Route>
          <Route component={NotFound} />
        </Switch>
      </Suspense>

      {showChrome && currentSong && <MiniPlayer />}
      {showChrome && <BottomNav />}
      {/* Only over the browsing chrome. It was `fixed bottom-24 z-50` on every
          route, so on the full-screen player it sat directly on top of the
          transport controls and swallowed the taps. */}
      {showChrome && <InstallPrompt />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppShell />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useAuthStore } from "./store/authStore";
import { usePlayerStore } from "./store/playerStore";
import { useAutoQueue } from "./hooks/useAutoQueue";
import { useScrobble } from "./hooks/useScrobble";
import { useMediaSession } from "./hooks/useMediaSession";
import { MiniPlayer } from "./components/MiniPlayer";
import { BottomNav } from "./components/BottomNav";
import { InstallPrompt } from "./components/InstallPrompt";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Library from "./pages/Library";
import Search from "./pages/Search";
import AlbumDetail from "./pages/AlbumDetail";
import ArtistDetail from "./pages/ArtistDetail";
import PlaylistDetail from "./pages/PlaylistDetail";
import NowPlaying from "./pages/NowPlaying";
import Queue from "./pages/Queue";
import NotFound from "./pages/not-found";

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
  const currentSong = usePlayerStore(state => state.currentSong);
  const progress = usePlayerStore(state => state.progress);
  const duration = usePlayerStore(state => state.duration);
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

  // Global hooks
  useAutoQueue();
  useScrobble(currentSong?.id, progress, duration);
  useMediaSession();

  if (!hasHydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  const isNowPlaying = location === '/now-playing';
  const showChrome = isLoggedIn && !isNowPlaying;

  return (
    <>
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

      {showChrome && currentSong && <MiniPlayer />}
      {showChrome && <BottomNav />}
      <InstallPrompt />
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

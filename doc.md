# Musico (Novatune) Comprehensive Technical Documentation

This document provides a highly detailed technical breakdown of the Musico web application, detailing the overall architecture, memory usage, API call frequency, caching mechanisms, service worker configurations, and Javascript bundle sizes.

## 1. System Architecture
Musico is built as a highly responsive Progressive Web Application (PWA).
- **Core Frameworks:** React 18 with TypeScript.
- **Build Tool:** Vite, configured for aggressive dead-code elimination and fast HMR.
- **Routing:** Wouter is used for lightweight, hook-based routing rather than heavier alternatives like React Router.
- **UI & Styling:** Radix UI primitives provide accessible, unstyled components, styled entirely via Tailwind CSS. This keeps CSS payload minimal (only used classes are compiled).

## 2. Memory & State Management Efficiency
To ensure the app does not leak memory or become sluggish on lower-end devices, state management is partitioned strategically:

### 2.1 Zustand (Global State)
- **Stores:** Two primary stores exist: `authStore` and `playerStore`.
- **Persistence:** Zustand state is selectively persisted to `localStorage`. Only critical, non-transient data is saved. For example, `playerStore` saves the queue and current volume but strips `isPlaying` and `progress` from persistence.
- **Memory Footprint:** Extremely small. Zustand operates without context providers, allowing components to subscribe to only specific slices of state, preventing unnecessary React re-renders.

### 2.2 TanStack Query (Server State)
- **Configuration:** `QueryClient` is configured with a 10-minute `staleTime` and a 30-minute `gcTime` (garbage collection). 
- **Effect:** Once a user loads the Home page, albums and artists are kept in memory for 30 minutes. If they navigate away and come back within 10 minutes, zero API calls are made. 

## 3. Storage and Database (IndexedDB)
Musico relies heavily on IndexedDB (`idb` wrapper) via a database named `novatune-db`.
- **`offline-songs` Store:** Stores raw audio blob data for songs the user has explicitly downloaded for offline playback.
- **`api-cache` Store:** Every successful Subsonic API response (except real-time endpoints like streaming or scrobbling) is mirrored to IDB. This ensures the app can start up and populate the UI even if the network is completely down. The cache has a strict 24-hour TTL (Time-To-Live).

## 4. API Calls and Network Footprint
- **Protocol:** Standard REST calls to a Subsonic/Navidrome compatible API.
- **Frequency:** Kept to an absolute minimum. 
  - **Metadata:** Albums, artists, playlists, and search queries are routed through React Query (memory cache) -> IDB (disk cache) -> Network. A network request is only fired if both caches miss or expire.
  - **Cover Art:** Handled via Service Worker Runtime Caching (CacheFirst strategy). Max 500 images, 30-day expiration.
  - **Streaming:** `/rest/stream.view` and `/rest/scrobble.view` are strictly `NetworkOnly` to allow range requests and accurate playback tracking.
- **Authentication:** Token-based (using Subsonic's `md5` salt + token generation) appended to URL parameters.

## 5. Bundle Load and Startup Performance
The production build is heavily optimized via Vite/Rollup.

### 5.1 Bundle Sizes (Production)
- **Javascript (`index.js`):** ~448.10 kB uncompressed (~140.53 kB gzipped). Contains the entire React application, Wouter, Zustand, TanStack Query, and Howler.js.
- **CSS (`index.css`):** ~116.65 kB uncompressed (~18.63 kB gzipped). Contains the purged Tailwind utility classes.
- **Total Initial Payload:** ~160 kB gzipped over the wire.

### 5.2 Service Worker (PWA)
- **Precache Manifest:** Handled by `vite-plugin-pwa` and Workbox. The service worker precaches 8 core assets (HTML, main JS, main CSS, basic icons) totaling ~553.09 KiB.
- **Offline Ready:** Because the core HTML/JS/CSS is precached, the app's shell loads instantly without a network connection. Combined with the `api-cache` in IndexedDB, the user sees their library immediately, even offline.

## 6. Audio Engine & Background Playback
- **Engine:** `howler.js` manages HTML5 Audio context.
- **Media Session API:** Hooked up via `useMediaSession.ts`. It broadcasts the current track metadata (title, artist, album art) to the host operating system, allowing users to control playback from their lock screen, smartwatch, or media keys while the JS bundle is executing in the background.

## Summary of Efficiency
Musico achieves a native-app-like feel by loading the UI shell from the Service Worker cache, populating data from IndexedDB, managing memory via TanStack Query, and only asking the network for raw audio streams or data it hasn't seen in the last 24 hours.

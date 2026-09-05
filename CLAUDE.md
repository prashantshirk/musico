# Musico

A PWA music client for a self-hosted Navidrome/Subsonic backend, targeting mobile browsers. Talks to Navidrome's Subsonic API (streaming, library, search) and a custom FastAPI recommendation service that intercepts `getSimilarSongs` with MuQ-embedding-based results.

> Fill in / correct anything below that doesn't match the actual repo — this was drafted from project history, not a read of the codebase itself.

## Stack assumptions (confirm/correct)
- React + TypeScript, Vite build
- TanStack Query for server state
- Howler.js for audio playback
- Deployed as a PWA (service worker, manifest, installable on mobile)

## Backend contract
- Navidrome Subsonic API — auth via token/salt (`u`, `t`, `s`, `v`, `c`, `f=json` params), not username/password directly
- Recommendation service on the same domain intercepts `rest/getSimilarSongs.view` specifically — everything else passes through to real Navidrome
- Don't assume `getSimilarSongs` results follow the same shape/ordering guarantees as stock Navidrome; it's a proxy returning MuQ cosine-similarity + metadata-bonus scored results

## Memory efficiency — established patterns, keep following these

This app already went through a full memory/performance audit. Any new feature should default to the same patterns rather than reintroducing the problems that audit fixed:

- **Long lists (library, playlists, search results) → always virtualized.** Never render a full list of songs/albums directly; use the existing virtualization approach (windowing) for anything that can grow past ~50 items.
- **Images → lazy-loaded, not eager.** Album art and thumbnails load on viewport entry, not on mount. Check for an existing lazy-image component before adding a new `<img>` pattern.
- **Route/feature code → split via `React.lazy`.** Don't add a new top-level route or heavy feature (e.g. a new full-screen player view, a settings panel) as a static import — follow the existing code-splitting boundaries.
- **Client-side caching → quota-aware LRU, not unbounded.** Any new cache (offline track data, image blobs, API responses) needs an eviction strategy and a size cap — don't add a cache that only grows.
- **Audio playback → Howler.js, and mind its known leak pattern.** The codec fix in this project's history exists because Howler can retain decoded audio buffers if instances aren't properly unloaded — always call `.unload()` on a Howl instance when a track is done with, not just stop playback.
- **TanStack Query → set `placeholderData` deliberately, not by default.** This project already had bugs from placeholderData holding onto stale large objects across query key changes — when adding a new query, think about what it holds onto during refetch, don't just copy-paste an existing query's options blindly.

## When adding anything new

Before implementing a new list, cache, or media-heavy feature, ask: does this reintroduce a pattern the memory audit already removed? Specifically:
- Does it render an unbounded list without virtualization?
- Does it load images/audio eagerly instead of on-demand?
- Does it cache something without an eviction policy?
- Does it hold a large object in query/component state longer than needed?

If yes to any of these, that's the first thing to reconsider before shipping it.

## Profiling workflow

When investigating a memory issue (not just adding a feature defensively):
1. Reproduce with Chrome DevTools → Memory tab → take a heap snapshot before and after the suspected action, diff them
2. For list/scroll-related leaks, check detached DOM nodes specifically (a common virtualization-bug symptom is a windowing library that unmounts visually but leaves listeners attached)
3. For audio-related leaks, check the number of live `Howl`/`AudioContext` instances against the number of tracks actually played this session — should not grow unbounded
4. Report findings with concrete numbers (heap size before/after, retained object counts) rather than "it feels slower"

## Commands
<!-- fill in: dev server, build, lint, test, bundle-analyze commands -->

## Don't
- Don't add a new unbounded in-memory cache "temporarily" — it doesn't get cleaned up later in practice
- Don't bypass the existing virtualized-list component for "just this one list, it's small" — lists that start small tend not to stay that way on a self-hosted library that keeps growing
- Don't introduce a second audio-playback mechanism alongside Howler for a one-off feature
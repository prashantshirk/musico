import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";
const navidromeTarget = process.env.NAVIDROME_PROXY_TARGET || 'https://music.prashantshirke.me';
const aiRecommendationTarget = process.env.AI_RECOMMENDATION_PROXY_TARGET || 'http://104.211.94.130:8001';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Musico Player',
        short_name: 'Musico',
        id: '/?source=pwa',
        description: 'Your personal music streaming app',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f0f0f',
        theme_color: '#0f0f0f',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Don't precache everything — let runtime caching handle API/images
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        runtimeCaching: [
          // ── Cover Art: CacheFirst ──────────────────────────────────────────
          // Once an image is cached, serve it instantly without touching network.
          // 500 images max, expire after 30 days. Mobile-friendly.
          //
          // cacheKeyWillBeUsed strips the Subsonic auth params (t/s/u/c/v/f) from
          // the key. Those change whenever a new salt is minted, and previously
          // made every entry unreachable — the cache filled up and never hit.
          // Keyed on id+size only, the same artwork resolves to one entry for good.
          // NOTE: these functions are stringified into the generated service
          // worker, so they must not reference anything in this module's scope.
          {
            urlPattern: /\/rest\/getCoverArt/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cover-art-v2',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }: { request: Request }) => {
                    const url = new URL(request.url);
                    for (const p of ['t', 's', 'u', 'p', 'c', 'v', 'f']) url.searchParams.delete(p);
                    url.searchParams.sort();
                    return url.href;
                  },
                },
              ],
            },
          },
          // ── API Metadata: NetworkFirst with 4s timeout ─────────────────────
          // Try network first; fall back to cache if offline or slow.
          {
            urlPattern: /\/rest\/(getAlbumList|getArtists|getArtist|getAlbum|getAlbumInfo|getArtistInfo|getPlaylists|getPlaylist|getStarred|getGenres|getSongsByGenre|getRandomSongs|getSong|getTopSongs|getLyrics|search3)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-metadata-v2',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }: { request: Request }) => {
                    const url = new URL(request.url);
                    for (const p of ['t', 's', 'u', 'p', 'c', 'v', 'f']) url.searchParams.delete(p);
                    url.searchParams.sort();
                    return url.href;
                  },
                },
              ],
            },
          },
          // ── Audio Streams: NetworkOnly ─────────────────────────────────────
          // Range requests for seeking don't work with SW caching — skip them.
          {
            urlPattern: /\/rest\/stream/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      '/api/navidrome': {
        target: navidromeTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/navidrome/, ''),
      },
      '/api/ai-recommendations': {
        target: aiRecommendationTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai-recommendations/, ''),
      },
    }
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

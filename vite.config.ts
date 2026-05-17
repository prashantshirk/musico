import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Musico',
        short_name: 'Musico',
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
          {
            urlPattern: /\/rest\/getCoverArt/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cover-art-v1',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // ── API Metadata: NetworkFirst with 4s timeout ─────────────────────
          // Try network first; fall back to cache if offline or slow.
          {
            urlPattern: /\/rest\/(getAlbumList|getArtists|getArtist|getAlbum|getPlaylists|getPlaylist|getStarred|getGenres|getSongsByGenre|getRandomSongs|getSong|search3)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-metadata-v1',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
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
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      '/api/navidrome': {
        target: 'https://music.prashantshirke.me',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/navidrome/, ''),
      }
    }
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

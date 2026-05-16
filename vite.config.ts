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
        runtimeCaching: [
          {
            urlPattern: /\/rest\/getCoverArt/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'cover-art', expiration: { maxEntries: 500 } },
          },
          {
            urlPattern: /\/rest\/(getAlbumList|getArtists|getPlaylists)/,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 },
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

import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '',
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/android-sdk/**', '**/android/**']
      }
    },
    plugins: [
      react(),
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'build-stats.html'
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'TOEFL Quiz',
          short_name: 'TOEFL Quiz',
          description: 'Practice TOEFL with AI-generated quizzes',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 4000000,
          // CRITICAL: Never cache API requests — always go to network
          navigateFallback: null,
          runtimeCaching: [
            {
              // Supabase REST API, Auth, Realtime — NEVER cache
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkOnly',
              options: {
                backgroundSync: {
                  name: 'supabase-queue',
                  options: { maxRetentionTime: 60 }
                }
              }
            },
            {
              // Any other external API calls — NEVER cache
              urlPattern: /^https:\/\/api\..*/i,
              handler: 'NetworkOnly',
            },
            {
              // Google Fonts stylesheets
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
            },
            {
              // Google Fonts webfont files
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        }
      })
    ],
    define: {
      // API Keys should NOT be exposed here. 
      // Use Supabase Edge Functions for all AI calls.
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          // Force completely lowercase filenames for puter.site compatibility
          hashCharacters: 'hex',
          entryFileNames: (chunkInfo) => `assets/${chunkInfo.name.toLowerCase()}-[hash].js`,
          chunkFileNames: (chunkInfo) => `assets/${chunkInfo.name.toLowerCase()}-[hash].js`,
          assetFileNames: (assetInfo) => {
            let name = 'asset';
            if (assetInfo.name) {
              const parts = assetInfo.name.split('.');
              const ext = parts.pop();
              name = parts.join('.').toLowerCase() + '.' + ext;
            }
            return `assets/${name}-[hash][extname]`;
          },
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react', 'react-hot-toast', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'utils-vendor': ['date-fns', 'zod', 'fastest-validator'],
          }
        }
      },
      chunkSizeWarningLimit: 600,
      // Strip all console.log/warn/error in production APK/PWA
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        },
      },
    }
  };
});

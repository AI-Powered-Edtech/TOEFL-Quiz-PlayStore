import path from 'path';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '',
    server: {
      port: 5173,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/android-sdk/**', '**/android/**']
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      },
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8082',
          changeOrigin: true,
          secure: false,
        },
      },
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
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
            },
            {
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      rollupOptions: {
        output: {
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
            'utils-vendor': ['date-fns', 'zod', 'fastest-validator'],
          }
        }
      },
      chunkSizeWarningLimit: 600,
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

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Restaurant Menu',
        short_name: 'Menu',
        description: 'Scan QR, view menu, order food',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallbackDenylist: [/^\/admin/],
        runtimeCaching: [
          {
            urlPattern: /\/api\/menu/,
            handler: 'NetworkFirst',
            options: { cacheName: 'menu-cache', expiration: { maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true, changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})

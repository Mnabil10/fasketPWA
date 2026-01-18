/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.CAPACITOR_BUILD ? './' : '/app/',
  plugins: [
    react(),
    legacy(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/maskable-192.png',
        'icons/maskable-512.png',
      ],
      workbox: {
        navigateFallback: '/app/index.html',
      },
      manifest: {
        name: 'Fasket - Grocery Delivery',
        short_name: 'Fasket',
        description: 'Fasket grocery delivery app for Badr City.',
        start_url: '/app',
        scope: '/app/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ef233c',
        dir: 'auto',
        lang: 'en',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          ionic: ['@ionic/react', '@ionic/react-router'],
          router: ['react-router', 'react-router-dom'],
          state: ['zustand', 'immer'],
          i18n: ['i18next', 'react-i18next'],
          ui: ['lucide-react'],
          radix: [
            '@radix-ui/react-slot',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tabs',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
            '@radix-ui/react-dialog',
            '@radix-ui/react-separator',
            '@radix-ui/react-select',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-progress',
            '@radix-ui/react-popover',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-menubar',
            '@radix-ui/react-label',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-avatar',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-accordion',
          ],
          util: ['dayjs'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})

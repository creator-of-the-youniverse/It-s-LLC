import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: "$5K TO $20K IN 30 DAYS — It's LLC Execution Command Center",
          short_name: '$5K→$20K OS',
          description:
            "Personal business command center for executing the It's LLC 30-day revenue campaign from $5,000 working capital toward a $20,000 collected gross revenue target.",
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: "Today's Mission & 8–10h Schedule",
              short_name: "Today's Mission",
              description: "Open today's priority checklist and 8:00 AM–5:30 PM execution blocks",
              url: '/?tab=mission&autostart=1',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
            {
              name: 'Log Outbound Call / 10-Min Demo',
              short_name: 'Log Call / Demo',
              description: 'Record a targeted outbound call, decision-maker conversation, or booked demo',
              url: '/?tab=calls&autostart=1',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
            {
              name: 'Create $1,500 Proposal & Collect 50% Deposit',
              short_name: 'Proposals & Deals',
              description: 'Build a fixed-scope proposal or record a cleared 50% deposit',
              url: '/?tab=proposals&autostart=1',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
            {
              name: '30-Day Revenue Trajectory & Analytics',
              short_name: 'Analytics',
              description: 'View Revenue Collected vs. $20,000 Target Trajectory and pipeline math',
              url: '/?tab=analytics&autostart=1',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
            {
              name: 'Cash, $2,500 Reserve & Capital Ledger',
              short_name: 'Cash & Reserve',
              description: 'Inspect available business cash, protected reserve, and checkpoint gates',
              url: '/?tab=cash&autostart=1',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
            {
              name: 'Executive Command Center',
              short_name: 'Command Center',
              description: 'Launch the 5-Question Executive Command Center and Next Best Action engine',
              url: '/?tab=command&autostart=1',
              icons: [{src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png'}],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio preview environment.
      hmr: false,
      watch: null,
    },
  };
});


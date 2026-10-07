import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    host: 'localhost',
    hmr: {
      overlay: true,
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'recharts',
      'zustand',
      'i18next',
      'react-i18next',
      '@tanstack/react-table',
    ],
  },
  build: {
    rolldownOptions: {
      output: {
        // Big libraries in their own long-lived files. A higher priority wins
        // when a module could go in two groups, so React never ends up inside
        // the charts file (that made every page download the charts library).
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/, priority: 40 },
            { name: 'vendor-i18n', test: /node_modules[\/](i18next[^\/]*|react-i18next)[\/]/, priority: 30 },
            { name: 'vendor-table', test: /node_modules[\/]@tanstack[\/]/, priority: 20 },
            { name: 'vendor-charts', test: /node_modules[\/](recharts|d3-[^\/]+|victory-vendor)[\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})

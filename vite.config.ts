import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import type { ManifestV3Export } from '@crxjs/vite-plugin'
import manifestJson from './manifest.json'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const manifest = manifestJson as ManifestV3Export

export default defineConfig({
  plugins: [tailwindcss(), react(), crx({ manifest })],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('react-dom') || id.includes('/react/')) {
            return 'vendor-react';
          }
          if (id.includes('@dnd-kit')) {
            return 'vendor-dnd';
          }
          if (id.includes('@radix-ui') || id.includes('radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-i18n';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
})

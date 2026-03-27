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
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
})

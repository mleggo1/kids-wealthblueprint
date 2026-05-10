import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // jsPDF optional SVG path; real canvg pulls core-js and breaks production builds.
      canvg: path.resolve(__dirname, 'src/shims/canvg-stub.ts'),
    },
  },
  server: {
    host: true, // Listen on all addresses
    port: 8080, // Custom port
  },
})


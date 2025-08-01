import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true, // Allow external connections for subdomain testing
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
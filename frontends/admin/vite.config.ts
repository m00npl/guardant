import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/admin/' : '/',
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/admin': {
        target: 'http://localhost:45678',
        changeOrigin: true
      }
    }
  }
})
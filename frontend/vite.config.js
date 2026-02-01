import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: false,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  preview: {
    host: true,
    port: 3000,
  },
  // Ensure esbuild parses JSX in .js files (CRA codebase uses .js with JSX)
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' }
    }
  },
  esbuild: {
    jsx: 'automatic'
  }
})


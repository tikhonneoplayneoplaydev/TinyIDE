import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: '0.0.0.0',
    // allow the live-preview host in dev (sandboxed iframe preview)
    allowedHosts: true,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // don't watch rust sources
      ignored: ['**/src-tauri/**'],
    },
  },
  // gh-pages deploy builds with --base=./
  base: process.env.VITE_BASE || '/',
  build: {
    target: 'es2021',
    outDir: 'dist',
  },
});

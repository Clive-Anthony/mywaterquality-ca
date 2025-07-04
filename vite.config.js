// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  build: {
    target: 'esnext', // Enable top-level await support
    rollupOptions: {
      external: [], // Remove any external modules that might cause issues
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      buffer: 'buffer'
    }
  },
  optimizeDeps: {
    include: ['buffer']
  },
  // Ensure CSS is processed properly
  css: {
    postcss: './postcss.config.js',
  },
  // Ensure HMR works correctly
  server: {
    port: 8888,
    hmr: true,
  },
});
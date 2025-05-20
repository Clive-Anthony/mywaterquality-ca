// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure CSS is processed properly
  css: {
    postcss: './postcss.config.js',
  },
  // Optional: Add resolve aliases if needed
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // Ensure HMR works correctly
  server: {
    hmr: true,
  },
});
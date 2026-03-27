import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait(), tailwindcss()],
  base: process.env.GITHUB_PAGES ? '/reaction-trainer/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@elata-biosciences/eeg-web', '@elata-biosciences/eeg-web-ble', '@elata-biosciences/rppg-web'],
  },
  server: {
    port: 3003,
    open: true,
  },
});

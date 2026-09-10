import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API = process.env.API_ORIGIN || 'http://127.0.0.1:8787';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT || 5173),
    strictPort: false,
    allowedHosts: true,
    hmr: { host: '0.0.0.0' },
    proxy: {
      '/api': { target: API, changeOrigin: true, ws: false }
    }
  },
  build: { outDir: 'dist', sourcemap: false, target: 'es2022' },
  preview: { host: '0.0.0.0', port: Number(process.env.PREVIEW_PORT || 4173), allowedHosts: true }
});

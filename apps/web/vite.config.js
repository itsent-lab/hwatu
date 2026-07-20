import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5234,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:5233'
    }
  },
  build: {
    outDir: '../../services/api/wwwroot',
    emptyOutDir: true,
    sourcemap: false
  }
});

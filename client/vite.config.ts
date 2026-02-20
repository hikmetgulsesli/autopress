import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3519,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4519',
        changeOrigin: true,
      },
    },
  },
});

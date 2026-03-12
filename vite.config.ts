import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    open: false,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});

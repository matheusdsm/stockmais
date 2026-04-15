import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/',
  root: path.resolve(__dirname, 'src/frontend'),  // caminho absoluto
  build: {
    outDir: path.resolve(__dirname, 'dist'),       // caminho absoluto
    emptyOutDir: true
  },
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/frontend')
    }
  }
});

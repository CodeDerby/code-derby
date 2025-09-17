import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  build: {
    ssr: path.resolve(__dirname, 'index.ts'),
    outDir: path.resolve(__dirname, '../../dist/server'),
    emptyOutDir: true,
    target: 'node20',
    rollupOptions: {
      external: ['express', 'cors'],
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: '[name].js',
        format: 'es'
      }
    }
  }
});

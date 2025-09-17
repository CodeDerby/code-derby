import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

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
        entryFileNames: 'src/server/[name].js',
        chunkFileNames: 'src/server/[name].js',
        format: 'es'
      }
    }
  },
  plugins: [
    {
      name: 'copy-server-source-for-devvit',
      async writeBundle() {
        const sourcePath = path.resolve(__dirname, 'index.ts');
        const destPath = path.resolve(__dirname, '../../dist/server/src/server/index.ts');
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(sourcePath, destPath);
      }
    }
  ]
});

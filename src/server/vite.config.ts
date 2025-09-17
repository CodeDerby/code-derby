import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: path.resolve(__dirname, 'index.ts'),
    outDir: path.resolve(__dirname, '../../dist/server'),
    emptyOutDir: true,
    target: 'node22',
    rollupOptions: {
      external: [...builtinModules],
      output: {
        entryFileNames: 'index.cjs',
        chunkFileNames: 'chunks/[name].cjs',
        format: 'cjs',
        inlineDynamicImports: true,
      }
    }
  }
});

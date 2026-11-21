import { defineConfig } from 'vite';

/**
 * Dev host is port 5174. The playtest host (5173, `dist-play/`) is served by
 * tools/play-host.mjs and must never be replaced by this server.
 *
 * `.mts` because package.json is CommonJS: a `.ts` config would be loaded as
 * CommonJS and Vite warns about ESM syntax in it.
 */
export default defineConfig({
  // Relative base so the built game runs from any folder, including dist-play/.
  base: './',
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
});

import { defineConfig } from 'vite';
import fs from 'node:fs';

// sw.js lives at the REPO ROOT (not public/) because fleet CI's version-bump
// step rewrites its `const APP_VERSION = '…';` line at ./sw.js before the
// build (fleet-ci.yml). Emitting it here ships the rewritten file into the
// artifact root for both build paths — CI's `npm run build` and the test
// tier's tools/stage.mjs both run vite.
const shipServiceWorker = {
  name: 'ship-service-worker',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: fs.readFileSync('sw.js', 'utf8') });
  },
};

export default defineConfig({
  base: '/si-syn/',
  build: { target: 'es2022' },
  plugins: [shipServiceWorker],
});

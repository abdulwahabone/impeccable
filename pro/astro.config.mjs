import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { proDevPlugin } from './dev-plugin.mjs';

// impeccable.pro is a second, self-contained Astro site in this repo. Root is
// pinned to this file's directory because Astro's default root is the cwd, and
// every script that builds this site runs from the repo root.
const PRO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

// Absolute, not './src'. Astro resolves relative config paths against the cwd,
// and every script that builds this site runs from the repo root, so relative
// paths here would point at the main site and write into its build dir.
export default defineConfig({
  root: PRO_ROOT,
  srcDir: `${PRO_ROOT}src`,
  publicDir: `${PRO_ROOT}public`,
  outDir: `${PRO_ROOT}build`,
  output: 'static',
  build: {
    format: 'directory',
  },
  devToolbar: {
    enabled: false,
  },
  server: {
    // 4321 belongs to impeccable.style, so both dev servers can run at once.
    port: 4330,
  },
  vite: {
    plugins: [proDevPlugin()],
    build: {
      assetsInlineLimit: 0,
    },
    server: {
      fs: {
        // The page reuses site/styles tokens and site/components/Footer.astro,
        // which sit outside this Vite root.
        allow: [REPO_ROOT],
      },
    },
  },
});

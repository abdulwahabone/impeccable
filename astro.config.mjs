import { defineConfig } from 'astro/config';
import { impeccableShikiThemes } from './site/lib/impeccable-shiki-theme.mjs';
import { worldsReviewPlugin } from './scripts/worlds-review-vite-plugin.mjs';
import { worldRollDevPlugin } from './scripts/world-roll-dev-plugin.mjs';
import { decisionLabPlugin } from './scripts/decision-lab-vite-plugin.mjs';

export default defineConfig({
  srcDir: './site',
  publicDir: './site/public',
  output: 'static',
  markdown: {
    shikiConfig: {
      themes: impeccableShikiThemes,
      defaultColor: false,
    },
  },
  devToolbar: {
    enabled: false,
  },
  build: {
    format: 'directory',
  },
  outDir: './build',
  vite: {
    plugins: [worldsReviewPlugin(), worldRollDevPlugin(), decisionLabPlugin()],
    build: {
      assetsInlineLimit: 0,
    },
  },
});

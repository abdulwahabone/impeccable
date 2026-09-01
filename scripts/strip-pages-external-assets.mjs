#!/usr/bin/env node
// Keep assets served outside Cloudflare Pages out of its static upload.
// World cards live in R2. The universal bundle is a versioned GitHub release
// asset because Pages rejects individual files larger than 25 MiB.

import { rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'build');
const externalAssets = [
  {
    path: join(buildDir, 'worlds', 'cards'),
    label: 'local world cards (served from R2)',
  },
  {
    path: join(buildDir, '_data', 'dist', 'universal.zip'),
    label: 'universal ZIP (served from GitHub Releases)',
  },
  {
    path: join(buildDir, '_data', 'dist', 'universal'),
    label: 'expanded universal bundle (not served directly)',
  },
];

for (const asset of externalAssets) {
  if (!existsSync(asset.path)) continue;
  rmSync(asset.path, { recursive: true });
  console.log(`✓ Stripped ${asset.label} from Pages output`);
}

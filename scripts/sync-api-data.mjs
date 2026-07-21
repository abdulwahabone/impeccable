#!/usr/bin/env node
// Copies the catalog JSON files into functions/api/_data/ so the roll API
// bundles the current revision at deploy. Run before `bun run deploy`
// whenever catalog content changed (the deploy script chains it).

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'catalog');
const DEST = join(ROOT, 'functions', 'api', '_data');
const FILES = [
  'concept-ingredients.json',
  'concept-reviews.json',
  'composition-ingredients.json',
  'composition-reviews.json',
];

mkdirSync(DEST, { recursive: true });
for (const file of FILES) {
  copyFileSync(join(SRC, file), join(DEST, file));
}
process.stdout.write(`synced ${FILES.length} catalog files -> functions/api/_data\n`);

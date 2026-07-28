#!/usr/bin/env node
/**
 * Upload world design-system cards to the R2 bucket that backs
 * functions/worlds/cards/[[file]].js. Skips files already uploaded at their
 * current generation (tracked in a local .published.json sidecar), so routine
 * runs only push what changed. Requires an authenticated wrangler (same auth
 * as `bun run deploy`) and the bucket:
 *   wrangler r2 bucket create impeccable-world-cards
 *
 * Usage:
 *   bun run world-cards:publish            # changed files only
 *   bun run world-cards:publish -- --force # everything
 */

import { execFile } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARD_DIR = join(ROOT, 'site', 'public', 'worlds', 'cards');
const STATE_PATH = join(CARD_DIR, '.published.json');
const BUCKET = 'impeccable-world-cards';
const CONCURRENCY = 6;

const force = process.argv.includes('--force');
// The bucket is public, so only reviewed and approved art belongs in it.
// Rejected concepts are dead veins and pending ones have not been seen yet;
// pushing either puts unreleased work behind a guessable URL and uploads
// hundreds of files the roll API will never deal. Pass --all to mirror the
// whole directory anyway.
const all = process.argv.includes('--all');
const manifest = JSON.parse(readFileSync(join(CARD_DIR, 'manifest.json'), 'utf8'));
const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, 'utf8')) : {};
const reviews = JSON.parse(readFileSync(join(ROOT, 'catalog', 'concept-reviews.json'), 'utf8')).reviews;
const compositionReviews = JSON.parse(
  readFileSync(join(ROOT, 'catalog', 'composition-reviews.json'), 'utf8')
).reviews;
const isApproved = id => reviews[id]?.status === 'approved' || compositionReviews[id]?.status === 'approved';

const files = readdirSync(CARD_DIR).filter(file => file.endsWith('.webp'));
const queue = files.filter(file => {
  const id = file.replace(/(-hero)?\.webp$/, '');
  if (!all && !isApproved(id)) return false;
  if (force) return true;
  const stamp = file.endsWith('-hero.webp') ? manifest[id]?.heroGeneratedAt : manifest[id]?.generatedAt;
  return !stamp || state[file] !== stamp;
});
const withheld = all ? 0 : files.filter(file => !isApproved(file.replace(/(-hero)?\.webp$/, ''))).length;
if (withheld > 0) console.log(`withholding ${withheld} card(s) for unapproved concepts (pass --all to include them)`);

console.log(`publishing ${queue.length} of ${files.length} cards to r2://${BUCKET}`);
let done = 0;
let failed = 0;

async function upload(file) {
  const contentType = 'image/webp';
  await run('wrangler', [
    'r2', 'object', 'put', `${BUCKET}/${file}`,
    '--file', join(CARD_DIR, file),
    '--content-type', contentType,
    '--remote',
  ], { cwd: ROOT });
}

const worker = async () => {
  while (queue.length > 0) {
    const file = queue.shift();
    try {
      await upload(file);
      const id = file.replace(/(-hero)?\.webp$/, '');
      state[file] = (file.endsWith('-hero.webp') ? manifest[id]?.heroGeneratedAt : manifest[id]?.generatedAt) || new Date().toISOString();
      writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
      done += 1;
      if (done % 25 === 0 || queue.length === 0) console.log(`  ${done} uploaded, ${queue.length} remaining`);
    } catch (error) {
      failed += 1;
      console.error(`  FAILED ${file}: ${error.message}`);
    }
  }
};
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

try {
  await run('wrangler', [
    'r2', 'object', 'put', `${BUCKET}/manifest.json`,
    '--file', join(CARD_DIR, 'manifest.json'),
    '--content-type', 'application/json',
    '--remote',
  ], { cwd: ROOT });
  console.log('  manifest.json uploaded');
} catch (error) {
  failed += 1;
  console.error(`  FAILED manifest.json: ${error.message}`);
}

console.log(`done: ${done} uploaded, ${failed} failed`);
if (failed > 0) process.exitCode = 1;

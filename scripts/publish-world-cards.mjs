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

// Reject anything unrecognised rather than ignoring it. This script uploads to a
// public bucket, and a flag that looks like a safety and silently is not is
// worse than no flag: `--dry-run` was passed once, ignored, and a real publish
// of 299 cards was attempted. It failed only because the wrangler spawn did not
// resolve, which is luck rather than a guard.
const KNOWN_FLAGS = new Set(['--force', '--all', '--dry-run']);
const unknown = process.argv.slice(2).filter(arg => !KNOWN_FLAGS.has(arg));
if (unknown.length > 0) {
  console.error(`unknown flag(s): ${unknown.join(', ')}`);
  console.error(`known: ${[...KNOWN_FLAGS].join(', ')}`);
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
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
  const id = file.replace(/(-hero|-docs)?\.webp$/, '');
  if (!all && !isApproved(id)) return false;
  if (force) return true;
  const stamp = file.endsWith('-hero.webp') ? manifest[id]?.heroGeneratedAt
    : file.endsWith('-docs.webp') ? manifest[id]?.docsGeneratedAt
    : manifest[id]?.generatedAt;
  return !stamp || state[file] !== stamp;
});
const withheld = all ? 0 : files.filter(file => !isApproved(file.replace(/(-hero|-docs)?\.webp$/, ''))).length;
if (withheld > 0) console.log(`withholding ${withheld} card(s) for unapproved concepts (pass --all to include them)`);

console.log(`${dryRun ? 'would publish' : 'publishing'} ${queue.length} of ${files.length} cards to r2://${BUCKET}`);
if (dryRun) {
  for (const file of queue.slice(0, 20)) console.log(`  ${file}`);
  if (queue.length > 20) console.log(`  ...and ${queue.length - 20} more`);
  console.log('\nNothing uploaded. Drop --dry-run to publish.');
  process.exit(0);
}
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
      const id = file.replace(/(-hero|-docs)?\.webp$/, '');
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

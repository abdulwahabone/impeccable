#!/usr/bin/env node
/**
 * Round status: the authoring loop's exit report. Lists every pending
 * concept and composition with its render-gate state so an authoring round ends
 * with one glanceable table of what awaits review in /labs/worlds.
 *
 * Used standalone or as the tail of `bun run catalog:round`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conceptContentHash } from '../skill/scripts/lib/concept-catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARD_DIR = join(ROOT, 'site', 'public', 'worlds', 'cards');

const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog', 'concept-ingredients.json'), 'utf8'));
const reviews = JSON.parse(readFileSync(join(ROOT, 'catalog', 'concept-reviews.json'), 'utf8')).reviews;
const manifest = existsSync(join(CARD_DIR, 'manifest.json'))
  ? JSON.parse(readFileSync(join(CARD_DIR, 'manifest.json'), 'utf8'))
  : {};

const rows = [];
for (const family of catalog.families) {
  for (const concept of family.concepts) {
    const review = reviews[concept.id];
    if (review && review.status !== 'pending') continue;
    // Existence alone is not the gate. A reworked concept keeps its old files,
    // so checking only for a file on disk reports a round as ready while the
    // cards still show the text that was replaced, and the reviewer judges the
    // previous version. The manifest hash is what says a card matches its
    // concept, which is the same test generate-world-cards.mjs renders on.
    const current = conceptContentHash(concept);
    const stale = manifest[concept.id]?.hash !== current;
    const board = existsSync(join(CARD_DIR, `${concept.id}.webp`)) && !stale;
    const hero = existsSync(join(CARD_DIR, `${concept.id}-hero.webp`)) && !stale;
    rows.push({
      id: concept.id,
      family: family.id,
      board: board ? 'board' : (stale ? 'BOARD STALE' : 'BOARD MISSING'),
      hero: hero ? 'hero' : (stale ? 'HERO STALE' : 'HERO MISSING'),
      manifest: manifest[concept.id] ? 'manifest' : 'MANIFEST MISSING',
    });
  }
}

if (rows.length === 0) {
  console.log('No pending concepts. The review queue is empty.');
  process.exit(0);
}

console.log(`${rows.length} pending concept(s) awaiting review:\n`);
for (const row of rows) {
  const gate = [row.board, row.hero, row.manifest].join(' · ');
  console.log(`  ${row.id.padEnd(36)} ${row.family.padEnd(28)} ${gate}`);
}
const unrendered = rows.filter(row => row.board !== 'board' || row.hero !== 'hero');
console.log(unrendered.length > 0
  ? `\n${unrendered.length} entr${unrendered.length === 1 ? 'y' : 'ies'} still need the render gate: rerun \`bun run world-cards\`.`
  : '\nRender gate complete. Review the round in /labs/worlds, then publish cards with `bun run world-cards:publish`.');

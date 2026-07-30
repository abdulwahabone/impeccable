#!/usr/bin/env node
// Coverage of the composition catalog against what the skill can be asked for.
//
// The point of this report is that it is framed by demand, not by supply. A user
// asks for a docs site, an onboarding flow, a landing page, a data table, a
// section of an existing app, and those differ along two axes the catalog now
// carries: which register of work it is (surface) and how much of the product is
// in play (grain). An empty cell is a request the catalog cannot answer, and
// before grain existed there was no way to see one.
//
// Unclassified entries are counted separately rather than folded in, because a
// missing grain is not the same as a gap: it is an entry nobody has filed yet,
// and treating the two alike would make the corpus look worse than it is in some
// cells and better in others.
//
//   node scripts/composition-coverage.mjs            approved only (what rolls)
//   node scripts/composition-coverage.mjs --all      include pending and rejected
//   node scripts/composition-coverage.mjs --platform  add the platform breakdown
//   node scripts/composition-coverage.mjs --suggest   propose a grain per unfiled
//                                                     entry from its form line
//
// --suggest never writes. It reads the subject of the form line, which is the
// only place the grain is stated in prose, and it is wrong often enough that it
// is a starting point for a review pass rather than a substitute for one.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { COMPOSITION_GRAINS, COMPOSITION_PLATFORMS } from '../skill/scripts/lib/roll-selection.mjs';

const ROOT = process.cwd();
const read = name => JSON.parse(readFileSync(path.join(ROOT, 'catalog', name), 'utf8'));
const catalog = read('composition-ingredients.json');
const reviews = read('composition-reviews.json').reviews || {};

const all = process.argv.includes('--all');
const showPlatform = process.argv.includes('--platform');
const suggest = process.argv.includes('--suggest');
const SURFACES = ['persuade', 'operate', 'read', 'experience'];

const rows = catalog.compositions
  .map(entry => ({ ...entry, status: reviews[entry.id]?.status || 'pending', breadth: reviews[entry.id]?.breadth }))
  .filter(entry => all || (entry.status === 'approved' && entry.breadth !== 'niche'));

const label = all ? 'all entries' : 'approved, non-niche (the pool a roll draws from)';
process.stdout.write(`composition coverage: ${rows.length} of ${catalog.compositions.length} (${label})\n\n`);

// The demand grid.
const cell = (grain, surface) => rows.filter(r => r.grain === grain && r.surface === surface).length;
const pad = (value, width) => String(value).padStart(width);

process.stdout.write(`  ${'grain'.padEnd(10)}${SURFACES.map(s => pad(s.slice(0, 9), 11)).join('')}${pad('total', 9)}\n`);
for (const grain of COMPOSITION_GRAINS) {
  const total = rows.filter(r => r.grain === grain).length;
  const cells = SURFACES.map(s => {
    const n = cell(grain, s);
    return pad(n === 0 ? '.' : n, 11);
  }).join('');
  process.stdout.write(`  ${grain.padEnd(10)}${cells}${pad(total, 9)}\n`);
}
const unfiled = rows.filter(r => !r.grain);
process.stdout.write(`  ${'unfiled'.padEnd(10)}${SURFACES.map(s => pad(unfiled.filter(r => r.surface === s).length, 11)).join('')}${pad(unfiled.length, 9)}\n`);
process.stdout.write(`  ${'TOTAL'.padEnd(10)}${SURFACES.map(s => pad(rows.filter(r => r.surface === s).length, 11)).join('')}${pad(rows.length, 9)}\n`);

// A dot above is a request with no answer. Naming them is the authoring brief.
const empty = [];
for (const grain of COMPOSITION_GRAINS) {
  for (const surface of SURFACES) {
    if (cell(grain, surface) === 0) empty.push(`${surface}/${grain}`);
  }
}
process.stdout.write(`\n${empty.length} of ${COMPOSITION_GRAINS.length * SURFACES.length} cells are empty\n`);
if (empty.length > 0) {
  process.stdout.write(`  a request landing in any of these has nothing at its grain to draw:\n`);
  for (const key of empty) process.stdout.write(`    ${key}\n`);
}

if (unfiled.length > 0) {
  process.stdout.write(`\n${unfiled.length} entries carry no grain yet, so the grid understates real coverage.\n`);
  process.stdout.write(`  file them in the compositions lab; until then a grain request tops up from them.\n`);
}

if (showPlatform) {
  process.stdout.write('\nplatform eligibility\n');
  for (const platform of COMPOSITION_PLATFORMS) {
    const survives = rows.filter(r => !Array.isArray(r.platforms) || r.platforms.length === 0 || r.platforms.includes(platform));
    process.stdout.write(`  ${platform.padEnd(9)}${pad(survives.length, 5)} of ${rows.length} survive\n`);
  }
  const scoped = rows.filter(r => Array.isArray(r.platforms) && r.platforms.length > 0);
  process.stdout.write(`  ${scoped.length} entries are platform-scoped; the rest are treated as surviving anywhere.\n`);
}

// Reads the subject of the form line: 'a landing page staged as ...' is a view,
// 'a hero divided by ...' is a region. Deliberately conservative: anything it
// cannot place stays unplaced rather than being guessed into a cell.
function suggestGrain(entry) {
  const head = entry.form.split(',')[0].toLowerCase();
  if (/\b(site|website|whole product)\b/.test(head)) return 'product';
  if (/\b(flow|steps?|sequence of|wizard|checkout|walkthrough|onboarding)\b/.test(head)) return 'flow';
  if (/\b(hero|grid|table|strip|band|row|card|rail|tile|panel|section|column)\b/.test(head)) return 'region';
  if (/\b(page|screen|surface|portfolio|catalog|schedule|dashboard|app)\b/.test(head)) return 'view';
  return null;
}

if (suggest) {
  const unplaced = [];
  const counts = {};
  for (const entry of unfiled) {
    const guess = suggestGrain(entry);
    if (!guess) { unplaced.push(entry); continue; }
    counts[guess] = (counts[guess] || 0) + 1;
  }
  process.stdout.write(`\nsuggested grain for the ${unfiled.length} unfiled entries (nothing written)\n`);
  for (const grain of COMPOSITION_GRAINS) {
    process.stdout.write(`  ${grain.padEnd(10)}${pad(counts[grain] || 0, 5)}\n`);
  }
  process.stdout.write(`  ${'no guess'.padEnd(10)}${pad(unplaced.length, 5)}\n`);
  if (unplaced.length > 0) {
    process.stdout.write('\n  entries the heuristic will not place, which need a human:\n');
    for (const entry of unplaced.slice(0, 12)) {
      process.stdout.write(`    ${entry.form.split(',')[0].slice(0, 66)}\n`);
    }
    if (unplaced.length > 12) process.stdout.write(`    ...and ${unplaced.length - 12} more\n`);
  }
}

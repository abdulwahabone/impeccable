#!/usr/bin/env node
// Where the world catalog is crowded and where it is empty, on the command line.
// The same numbers the coverage view in the worlds lab shows, from the same
// module, so a wave brief written from either one says the same thing.
//
//   node scripts/world-coverage.mjs

import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  computeOccupancy,
  lineageGrid,
  mergeWorlds,
  modePools,
  openings,
} from './lib/world-occupancy.mjs';

const ROOT = process.cwd();
const read = name => JSON.parse(readFileSync(path.join(ROOT, 'catalog', name), 'utf8'));
const worlds = mergeWorlds(read('concept-ingredients.json'), read('concept-reviews.json'));
const axesDefinition = read('aesthetic-axes.json');
const occupancy = computeOccupancy(worlds, axesDefinition);

const pad = (value, width) => String(value).padStart(width);
process.stdout.write(`world coverage: ${worlds.length} approved worlds\n\n`);

const grid = lineageGrid(worlds);
process.stdout.write(`LINEAGE x TIER\n  ${'lineage'.padEnd(20)}${grid.tiers.map(t => pad(t, 13)).join('')}\n`);
for (const row of grid.rows) {
  process.stdout.write(`  ${row.label.padEnd(20)}${row.cells.map(n => pad(n === 0 ? '.' : n, 13)).join('')}\n`);
}

process.stdout.write(`\nMODE POOL   (what each register can actually draw)\n`);
process.stdout.write(`  ${'mode'.padEnd(14)}${pad('digital', 9)}${pad('physical', 10)}${pad('total', 8)}\n`);
for (const pool of modePools(worlds)) {
  process.stdout.write(`  ${pool.mode.padEnd(14)}${pad(pool.digital, 9)}${pad(pool.total - pool.digital, 10)}${pad(pool.total, 8)}\n`);
}

process.stdout.write(`\nAESTHETIC OCCUPANCY   (axes fixed by the world schema, values authored in catalog/aesthetic-axes.json)\n`);
for (const axis of occupancy.axes) {
  const health = axis.trustworthy
    ? ''
    : axis.recordedOnly
      ? `   [RECORDED ONLY: ${axis.recorded}/${occupancy.total} assigned so far; cannot be probed, fills as waves record it]`
      : `   [UNRELIABLE: places only ${axis.placed}/${occupancy.total}; fix the values before briefing from this axis]`;
  const skew = axis.lopsided
    ? `   [LOPSIDED: one value carries ${Math.round(axis.topShare * 100)}% of what this axis places; check it is not matching a common word]`
    : '';
  process.stdout.write(`\n  ${axis.label}  ${axis.question ? `— ${axis.question}` : ''}${health}${skew}\n`);
  for (const value of axis.values) {
    const bar = '#'.repeat(Math.round(value.share * 40));
    const flag = value.thin ? ' <- opening' : '';
    process.stdout.write(
      `    ${value.label.padEnd(32)}${pad(value.count, 4)}${pad(`${Math.round(value.share * 100)}%`, 5)}`
      + `  digital ${pad(value.digital, 2)}  weight ${pad(value.weight, 2)}  ${bar}${flag}\n`
    );
  }
}

process.stdout.write(`\nTHE OPENINGS, ranked. A wave is briefed from these, not from what the catalog already does well.\n`);
for (const value of openings(occupancy)) {
  process.stdout.write(`  ${pad(`${Math.round(value.share * 100)}%`, 4)}  ${value.axis} → ${value.label}  (weight ${value.weight})\n`);
}

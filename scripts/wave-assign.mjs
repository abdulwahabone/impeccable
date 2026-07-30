#!/usr/bin/env node
// Draws aesthetic assignments for an authoring wave.
//
// This is the anti-argmax step. A generator asked to design a beautiful
// documentation page will design the same beautiful documentation page every
// time, because that is what argmax means. The fix is the one the concept seeder
// already uses on candidate order: decide from outside, before the generator
// gets to choose. Here the draw fixes the aesthetic before anything is designed.
//
// Three rules the draw follows, each of which came from a measurement rather
// than a preference:
//
//   Weight by the opposite of occupancy, for axes that can be trusted. A value
//   2% of the catalog occupies is an opening, so it should come up often. This
//   is what stops a wave being more of the same.
//
//   Draw uniformly from axes that cannot be trusted. Density places 95 of 281
//   worlds, so its distribution is mostly noise, and weighting by noise is worse
//   than not weighting at all. Recorded-only axes have no occupancy by
//   definition and are always uniform.
//
//   Refuse declared incompatible pairs. An empty cell in a correlated pair is
//   often empty because the combination is incoherent rather than unexplored,
//   and weighting toward it sends a wave after nonsense.
//
//   node scripts/wave-assign.mjs --count 12 --key spring-docs
//   node scripts/wave-assign.mjs --count 6 --register read --json

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { computeOccupancy, mergeWorlds } from './lib/world-occupancy.mjs';

const ROOT = process.cwd();
const read = name => JSON.parse(readFileSync(path.join(ROOT, 'catalog', name), 'utf8'));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const count = Number(flag('count', 8));
const key = flag('key', 'wave');
const register = flag('register', null);
const asJson = args.includes('--json');

const worlds = mergeWorlds(read('concept-ingredients.json'), read('concept-reviews.json'));
const axesDefinition = read('aesthetic-axes.json');
// The company half. Drawn for the same reason the aesthetic is: a pilot without
// it produced six unrelated surfaces for six nearly identical companies, because
// the prompt listed example constraints and the examples became the answer.
let companyDeck = null;
try {
  companyDeck = read('company-deck.json');
} catch {
  companyDeck = null;
}
const occupancy = computeOccupancy(worlds, axesDefinition);
const incompatible = axesDefinition.incompatible || [];

// Deterministic, so a wave is reproducible from its key and a review can be
// re-run against the exact same brief. Same reasoning as the roll seeder.
function unit(...parts) {
  const digest = createHash('sha256').update(parts.join(':')).digest();
  return digest.readUInt32BE(0) / 0xffffffff;
}

function pickWeighted(values, roll) {
  const total = values.reduce((sum, value) => sum + value.weight, 0);
  let cursor = roll * total;
  for (const value of values) {
    cursor -= value.weight;
    if (cursor <= 0) return value;
  }
  return values[values.length - 1];
}

function conflicts(chosen, axisId, valueId) {
  return incompatible.some(pair => {
    const [a, b] = pair.pair;
    const hasA = (a.axis === axisId && a.value === valueId) || chosen[a.axis] === a.value;
    const hasB = (b.axis === axisId && b.value === valueId) || chosen[b.axis] === b.value;
    // Only a conflict if this draw is one half of the pair and the other half is
    // already on the table.
    const touchesThis = (a.axis === axisId && a.value === valueId) || (b.axis === axisId && b.value === valueId);
    return touchesThis && hasA && hasB;
  });
}

function drawCompany(index) {
  if (!companyDeck) return null;
  // Uniform: unlike the aesthetic axes there is no occupancy to weight against,
  // because the catalog records worlds rather than the companies they were for.
  return (companyDeck.axes || []).map(axis => ({
    axis: axis.id,
    label: axis.label,
    value: axis.values[Math.floor(unit(key, index, 'company', axis.id) * axis.values.length) % axis.values.length],
  }));
}

function assign(index) {
  const chosen = {};
  const notes = [];
  for (const axis of occupancy.axes) {
    // A trusted axis is weighted against its own occupancy. An untrusted one is
    // uniform, because weighting by a distribution that is mostly noise is worse
    // than not weighting at all.
    const trusted = axis.trustworthy && !axis.lopsided;
    const pool = axis.values.map(value => ({ ...value, weight: trusted ? value.weight : 1 }));
    let candidates = pool.filter(value => !conflicts(chosen, axis.id, value.id));
    if (candidates.length === 0) candidates = pool;
    const picked = pickWeighted(candidates, unit(key, index, axis.id));
    chosen[axis.id] = picked.id;
    notes.push({
      axis: axis.id,
      label: axis.label,
      value: picked.id,
      valueLabel: picked.label,
      // Says why this value came up, so a reviewer can tell a deliberate opening
      // from a coin flip on an axis that cannot measure itself.
      basis: trusted
        ? `weighted: ${Math.round(picked.share * 100)}% of the catalog occupies this`
        : axis.recordedOnly
          ? 'uniform: recorded-only axis, no occupancy to weight against'
          : axis.lopsided
            ? `uniform: one value carries ${Math.round(axis.topShare * 100)}% of this axis, so its shape is a probe artefact`
            : `uniform: axis places ${axis.placed}/${occupancy.total}, too little to weight against`,
    });
  }
  return { index, chosen, notes, company: drawCompany(index) };
}

const briefs = Array.from({ length: count }, (_, index) => assign(index));

if (asJson) {
  process.stdout.write(`${JSON.stringify({ key, register, briefs }, null, 1)}\n`);
} else {
  process.stdout.write(`wave "${key}": ${count} assignments${register ? `, register ${register}` : ''}\n`);
  process.stdout.write(`drawn against ${occupancy.total} approved worlds; reproduce with --key ${key}\n`);
  const trusted = occupancy.axes.filter(a => a.trustworthy && !a.lopsided).length;
  process.stdout.write(`${trusted} of ${occupancy.axes.length} axes are weighted; the rest are drawn uniformly and say so\n`);
  for (const brief of briefs) {
    process.stdout.write(`\n  ${String(brief.index + 1).padStart(2, '0')}\n`);
    for (const line of brief.company || []) {
      process.stdout.write(`     ${line.label.padEnd(20)} ${line.value}\n`);
    }
    if (brief.company) process.stdout.write(`     ${''.padEnd(20)} ---\n`);
    for (const note of brief.notes) {
      process.stdout.write(`     ${note.label.padEnd(20)} ${note.valueLabel}\n`);
      process.stdout.write(`     ${''.padEnd(20)} ${note.basis}\n`);
    }
  }
  process.stdout.write('\nEvery assignment is a constraint to design under, not a description to write down.\n');
  process.stdout.write('Record the drawn values on the concept as its axes field, or the assignment is lost.\n');
}

#!/usr/bin/env node
// Draws aesthetic assignments for an authoring wave, and reports them.
//
// This is the anti-argmax step. A generator asked to design a beautiful
// documentation page will design the same beautiful documentation page every
// time, because that is what argmax means. The fix is the one the concept seeder
// already uses on candidate order: decide from outside, before the generator
// gets to choose. Here the draw fixes the aesthetic before anything is designed.
//
// The draw itself lives in lib/wave-draw.mjs, shared with wave-brief.mjs, which
// turns one assignment into the prompt an authoring agent actually receives.
// Three rules it follows, each from a measurement rather than a preference:
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

import { drawWave, loadWaveInputs } from './lib/wave-draw.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const count = Number(flag('count', 8));
const key = flag('key', 'wave');
const register = flag('register', null);
const asJson = args.includes('--json');

const { axesDefinition, companyDeck, occupancy } = loadWaveInputs();
const briefs = drawWave({ key, count, occupancy, axesDefinition, companyDeck });

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
  process.stdout.write('Write the prompt with: node scripts/wave-brief.mjs --key <key> --index <n>\n');
  process.stdout.write('Record the drawn values on the concept as its axes field, or the assignment is lost.\n');
}

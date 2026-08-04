#!/usr/bin/env node
// Merges wave candidates into the concept catalog as pending entries.
//
// This is the step that had no script. Candidates came out of a wave as loose
// JSON and the only way into the catalog was hand-editing it, which is how a
// round's work gets stranded: the authoring finishes, nobody wants to hand-merge
// 531 entries' worth of file, and the wave quietly leads nowhere.
//
// Refuses by default and prints what it would do. Pass --write to apply.
//
// Two things it will not let you get wrong:
//
//   Serialization. Ingredient catalogs serialize at indent 1 with a trailing
//   newline and review files at indent 2. Writing this file at the wrong indent
//   reformats all 531 entries and buries the round's additive diff in noise.
//
//   Pending status. A concept is pending when no review entry names it, so this
//   writes nothing to concept-reviews.json. Adding a review here would be
//   pre-approving your own round.
//
//   node scripts/wave-merge.mjs --candidates wave.json
//   node scripts/wave-merge.mjs --candidates wave.json --write

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const candidatesPath = flag('candidates', null);
const write = args.includes('--write');
if (!candidatesPath) {
  process.stderr.write('usage: wave-merge.mjs --candidates <file.json> [--write]\n');
  process.exit(1);
}

const catalogPath = path.join(ROOT, 'catalog', 'concept-ingredients.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const candidates = JSON.parse(readFileSync(
  path.isAbsolute(candidatesPath) ? candidatesPath : path.join(ROOT, candidatesPath), 'utf8'));

// The catalog's own validator, imported rather than reimplemented. Hand-copying
// its bounds into this file went wrong twice in one session: the rule limit was
// missed entirely so a wave merged ten worlds with 1500-character rules, and
// then the form bound was copied as 240 when it is 360, which flagged worlds
// that were fine. A merge gate that disagrees with the validator is worse than
// no gate, because it fails at a different time and for different reasons.
import { validateConceptEntry } from '../skill/scripts/lib/concept-catalog.mjs';

const families = new Map((catalog.families || []).map(family => [family.id, family]));
const existingIds = new Set();
const existingForms = new Map();
const normalise = form => String(form || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
for (const family of catalog.families || []) {
  for (const concept of family.concepts || []) {
    existingIds.add(concept.id);
    existingForms.set(normalise(concept.form), concept.id);
  }
}

const problems = [];
const ready = [];
const seenInBatch = new Set();

for (const [index, entry] of candidates.entries()) {
  const where = entry.id || `candidate ${index + 1}`;
  const before = problems.length;
  const fail = message => problems.push(`${where}: ${message}`);

  // Everything the catalog itself will check, checked here first.
  for (const error of validateConceptEntry(entry, { existingForms })) problems.push(error);

  // Then the things only a merge can know.
  if (!families.has(entry.familyId)) fail(`unknown familyId "${entry.familyId}"`);
  if (existingIds.has(entry.id)) fail('id already in the catalog');
  if (seenInBatch.has(entry.id)) fail('id repeated inside this wave');
  seenInBatch.add(entry.id);

  // The assignment is the whole point of drawing one, and it cannot be
  // recovered later: the coverage map falls back to guessing from prose, which
  // is exactly what the recorded axes exist to replace.
  if (!entry.axes || Object.keys(entry.axes).length === 0) fail('no axes recorded');
  if (entry.strength === 'composition') {
    fail('strength "composition" cannot be approved in this catalog, use world or dual');
  }

  if (problems.length === before) ready.push(entry);
}

// A missing strength defaults to the weaker claim. "dual" asserts the idea also
// works as a staging, which is a claim to earn rather than to inherit from a
// default, and a reviewer can raise it.
const defaulted = [];
for (const entry of ready) {
  if (!entry.strength) {
    entry.strength = 'world';
    defaulted.push(entry.id);
  }
}

process.stdout.write(`wave merge: ${candidates.length} candidates into ${existingIds.size} existing concepts\n\n`);

if (problems.length) {
  process.stdout.write(`${problems.length} problem(s), nothing will be written:\n`);
  for (const problem of problems) process.stdout.write(`  ${problem}\n`);
  process.stdout.write('\n');
  process.exit(1);
}

for (const entry of ready) {
  process.stdout.write(`  ${entry.id}\n`);
  process.stdout.write(`     into ${entry.familyId}, strength ${entry.strength}\n`);
  process.stdout.write(`     ${entry.form.split(',')[0].slice(0, 76)}\n`);
}
if (defaulted.length) {
  process.stdout.write(`\n${defaulted.length} had no strength and were set to "world": ${defaulted.join(', ')}\n`);
  process.stdout.write('That is the weaker claim on purpose. Raise any of them to dual in review.\n');
}

if (!write) {
  process.stdout.write('\nNothing written. Re-run with --write to apply.\n');
  process.exit(0);
}

for (const entry of ready) {
  const { familyId, ...concept } = entry;
  families.get(familyId).concepts.push(concept);
}
writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 1)}\n`);
process.stdout.write(`\nWrote ${ready.length} pending concept(s) to catalog/concept-ingredients.json.\n`);
process.stdout.write('They are pending because no review names them. Next: bun run catalog:round\n');

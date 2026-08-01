#!/usr/bin/env node
// Near-duplicate detection for world concepts.
//
// The catalog already refuses an exact duplicate form, normalised for case and
// punctuation. It does not catch two worlds that are the same idea in different
// words, which is exactly what a wave produces: hundreds of candidates from one
// generator collapse onto a few dozen looks, and the expensive step is rendering
// (852 images in the last round). This is the gate that goes before it.
//
// Scoring is IDF weighted, and that is the whole design. Every world in this
// catalog shares a large vocabulary by construction, because the system rules
// use fixed prefixes and the same design language: palette, grid, ground, state,
// motion. Raw word overlap therefore reports every pair as similar and is
// useless. Weighting each shared word by how rare it is across the corpus means
// two worlds that both say "risograph" and "misregistration" score high, while
// two that merely both say "palette" and "responsive" do not.
//
// The threshold is calibrated, not chosen. Across the 140,715 pairs in the
// current catalog the median score is 0.016, p99 is 0.052, p99.9 is 0.081 and
// the maximum is 0.241. IDF weighted Jaccard runs small because the union
// includes every rare word unique to either side, so the absolute numbers are
// not intuitive and a threshold picked by eye is wrong: the first version of
// this used 0.28, which is above the highest score any real pair can reach, and
// reported a clean catalog. The default below sits between p99.9 and the lowest
// score of a pair a human would call a duplicate.
//
//   node scripts/world-dedup.mjs                       audit the catalog itself
//   node scripts/world-dedup.mjs --threshold 0.09      loosen or tighten
//   node scripts/world-dedup.mjs --candidates new.json score new entries first
//   node scripts/world-dedup.mjs --candidates new.json --batch-ratio 1.3

import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = file => JSON.parse(readFileSync(path.isAbsolute(file) ? file : path.join(ROOT, file), 'utf8'));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const threshold = Number(flag('threshold', 0.12));
// Two candidates from the same wave cannot be judged on the catalog's scale, and
// the reason is worth stating because it is not obvious and it cost a wrong fix.
//
// Measured on the first wave authored under the transfer contract: the four
// candidates scored 0.080 to 0.119 against each other, median 0.087, while the
// closest catalog match for any of them was 0.054. Every within-batch pair sat
// above every candidate-to-catalog pair. That is not four worlds converging. It
// is four authors reading one brief and inheriting its vocabulary, so the batch
// starts with a raised floor by construction, and the floor rises further as the
// brief grows.
//
// So an absolute bar is the wrong instrument here: set at the catalog's p99.9 it
// flagged all six pairs, which is the same useless answer as the original 0.28
// threshold that flagged none. What carries signal is how far a pair sits above
// its own batch's median. The 0.119 pair, the one that looked like convergence
// because both worlds happen to be terrain, is only 1.37 times the median and
// shares exactly one substantive word.
const batchRatio = Number(flag('batch-ratio', 1.5));
const candidatesPath = flag('candidates', null);
const limit = Number(flag('limit', 20));

// Words carrying no discriminating signal in this corpus. Kept short: the IDF
// weighting already suppresses common terms, and a long stoplist would start
// removing real signal.
const STOP = new Set(('a an the and or of to in on with as at by for from into over under this that these those is are '
  + 'be being been it its their there where when which who whom whose while than then so such not no nor but if each '
  + 'every any all both few more most other some only own same too very can will just one two three').split(' '));

function tokens(concept) {
  const text = [concept.form, concept.spark, concept.lineage, ...(concept.system || []), ...(concept.tags || [])].join(' ');
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter(word => word.length > 3 && !STOP.has(word))
  );
}

function idfMap(docs) {
  const seen = new Map();
  for (const doc of docs) for (const word of doc.words) seen.set(word, (seen.get(word) || 0) + 1);
  const total = docs.length || 1;
  const idf = new Map();
  for (const [word, count] of seen) idf.set(word, Math.log(total / count));
  return idf;
}

// Weighted Jaccard: shared rare vocabulary counts, shared boilerplate does not.
function similarity(a, b, idf) {
  let shared = 0;
  let union = 0;
  const all = new Set([...a.words, ...b.words]);
  for (const word of all) {
    const weight = idf.get(word) ?? 0;
    union += weight;
    if (a.words.has(word) && b.words.has(word)) shared += weight;
  }
  return union === 0 ? 0 : shared / union;
}

function sharedTerms(a, b, idf, take = 6) {
  return [...a.words]
    .filter(word => b.words.has(word))
    .sort((x, y) => (idf.get(y) ?? 0) - (idf.get(x) ?? 0))
    .slice(0, take);
}

const catalog = read('catalog/concept-ingredients.json');
const existing = [];
for (const family of catalog.families || []) {
  for (const concept of family.concepts || []) {
    existing.push({ id: concept.id, form: concept.form, family: family.id, words: tokens(concept) });
  }
}

const candidates = candidatesPath
  ? read(candidatesPath).map(entry => ({ id: entry.id || '(new)', form: entry.form, family: entry.familyId || '(new)', words: tokens(entry), isNew: true }))
  : null;

const corpus = candidates ? [...existing, ...candidates] : existing;
const idf = idfMap(corpus);

const pairs = [];
if (candidates) {
  // Candidates against the catalog. Candidates against each other are scored
  // further down on their own scale, for the reason given at the top.
  for (let i = 0; i < candidates.length; i += 1) {
    for (const other of existing) {
      const score = similarity(candidates[i], other, idf);
      if (score >= threshold) pairs.push({ a: candidates[i], b: other, score });
    }
  }
} else {
  for (let i = 0; i < existing.length; i += 1) {
    for (let j = i + 1; j < existing.length; j += 1) {
      const score = similarity(existing[i], existing[j], idf);
      if (score >= threshold) pairs.push({ a: existing[i], b: existing[j], score });
    }
  }
}
pairs.sort((x, y) => y.score - x.score);

const scope = candidates ? `${candidates.length} candidates against ${existing.length} existing` : `${existing.length} catalog entries against each other`;
process.stdout.write(`near-duplicate audit: ${scope}, threshold ${threshold}\n`);
process.stdout.write(`${pairs.length} pairs at or above threshold\n`);
// Context, so a reader does not mistake a small number for a weak signal.
const sample = [];
for (let i = 0; i < Math.min(existing.length, 260); i += 1) {
  for (let j = i + 1; j < Math.min(existing.length, 260); j += 1) sample.push(similarity(existing[i], existing[j], idf));
}
sample.sort((a, b) => a - b);
if (sample.length) {
  const at = p => sample[Math.floor(sample.length * p)].toFixed(3);
  process.stdout.write(`for scale: median ${at(0.5)}, p99 ${at(0.99)}, max ${sample[sample.length - 1].toFixed(3)}\n`);
}
process.stdout.write('\n');

for (const pair of pairs.slice(0, limit)) {
  process.stdout.write(`  ${pair.score.toFixed(3)}  ${pair.a.id}\n`);
  process.stdout.write(`         ${pair.b.id}\n`);
  process.stdout.write(`         ${pair.a.form.split(',')[0].slice(0, 82)}\n`);
  process.stdout.write(`         ${pair.b.form.split(',')[0].slice(0, 82)}\n`);
  process.stdout.write(`         shared: ${sharedTerms(pair.a, pair.b, idf).join(', ')}\n\n`);
}
if (pairs.length > limit) process.stdout.write(`  ...and ${pairs.length - limit} more\n`);

if (candidates && candidates.length > 2) {
  const within = [];
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      within.push({ a: candidates[i], b: candidates[j], score: similarity(candidates[i], candidates[j], idf) });
    }
  }
  within.sort((x, y) => y.score - x.score);
  const median = within[Math.floor(within.length / 2)].score || 1;
  process.stdout.write(`\nwithin this wave: ${within.length} pairs, median ${median.toFixed(3)}\n`);
  process.stdout.write('Judged against the batch median rather than the catalog threshold, because one\n');
  process.stdout.write('brief read by every author raises the whole batch and an absolute bar just\n');
  process.stdout.write('flags all of it. Ratio is what carries signal.\n\n');
  for (const pair of within.slice(0, 3)) {
    const ratio = pair.score / median;
    const mark = ratio >= batchRatio ? 'CONVERGED' : 'ok';
    process.stdout.write(`  ${pair.score.toFixed(3)}  ${ratio.toFixed(2)}x median  ${mark.padEnd(10)} ${pair.a.id}\n`);
    process.stdout.write(`         ${''.padEnd(18)} ${pair.b.id}\n`);
    process.stdout.write(`         shared: ${sharedTerms(pair.a, pair.b, idf).join(', ')}\n`);
  }
  const converged = within.filter(p => p.score / median >= batchRatio).length;
  process.stdout.write(`\n${converged} pair(s) at or above ${batchRatio}x the batch median.\n`);
  if (converged === 0) process.stdout.write('The wave separated. Shared words in the top pair are mostly brief vocabulary.\n');
}

if (candidates) {
  const blocked = new Set(pairs.filter(p => p.a.isNew).map(p => p.a.id));
  process.stdout.write(`\n${blocked.size} of ${candidates.length} candidates are too close to something that already exists.\n`);
  process.stdout.write('Cut those before rendering: renders are the expensive step and a near-duplicate spends the budget twice.\n');
}

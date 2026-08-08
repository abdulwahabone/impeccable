#!/usr/bin/env node
// Turns kept site candidates into catalog entries, which is the step between
// "this render is worth something" and "this world can be dealt into a build".
//
//   node scripts/derive-kept.mjs                 # dry run: what it would do
//   node scripts/derive-kept.mjs --write
//   node scripts/derive-kept.mjs --write --only melinegobet-fr
//
// Per kept row: go and watch the live page move, write the entry from the
// render with that motion as evidence, merge it into the catalog as pending,
// and close the queue row with the id it became. The row is only closed after
// the merge succeeds, so a failure anywhere leaves it kept and the pass can be
// run again without losing the verdict.
//
// The concept id is derived here rather than asked for at review time. That was
// the original mistake in this flow: a reviewer looking at a picture cannot name
// a concept that does not exist yet.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  QUEUE_RELATIVE, QUEUE_NOTE, siteSlug, closeSite,
} from './lib/site-queue.mjs';

const ROOT = process.cwd();
const QUEUE = path.join(ROOT, ...QUEUE_RELATIVE);
const WORLDS = path.join(ROOT, '.waves', 'site-worlds');

const args = process.argv.slice(2);
const write = args.includes('--write');
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const only = flag('only');
const family = flag('family', 'digital-design-canon');

function run(command, commandArgs) {
  return new Promise(resolve => {
    const child = spawn(command, commandArgs, { cwd: ROOT });
    let out = '';
    let err = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    child.on('close', code => resolve({ code, out, err }));
  });
}

const queue = JSON.parse(readFileSync(QUEUE, 'utf8'));
const kept = queue.sites.filter(site => site.status === 'keep' && (!only || siteSlug(site.url) === only));

if (kept.length === 0) {
  process.stdout.write(`nothing kept${only ? ` matching ${only}` : ''}. Keep something in the lab's Sites view first.\n`);
  process.exit(0);
}

process.stdout.write(`${kept.length} kept${write ? '' : ' (dry run, pass --write to act)'}\n\n`);

// A concept id has to be stable, unique in the catalog, and say something. The
// world's own form line is the best short description of it that exists by this
// point, so the id comes from that rather than from the source's domain, which
// would name the entry after a page it is deliberately not a copy of.
function idFrom(form, taken) {
  const base = form.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .split('-').filter(word => !['a', 'an', 'the', 'of', 'in', 'on', 'and', 'with', 'that', 'where'].includes(word))
    .slice(0, 5).join('-');
  let id = base;
  let n = 2;
  while (taken.has(id)) { id = `${base}-${n}`; n += 1; }
  return id;
}

const catalog = JSON.parse(readFileSync(path.join(ROOT, 'catalog', 'concept-ingredients.json'), 'utf8'));
const taken = new Set((catalog.families || []).flatMap(f => (f.concepts || []).map(c => c.id)));

const results = [];
for (const site of kept) {
  const name = siteSlug(site.url);
  const dir = path.join(WORLDS, name);
  process.stdout.write(`${site.url}\n`);

  if (!existsSync(path.join(dir, 'world.webp'))) {
    process.stdout.write('  no render, skipping\n\n');
    results.push({ site, status: 'no render' });
    continue;
  }

  if (!write) {
    process.stdout.write('  would observe motion, derive an entry, merge, and close the row\n\n');
    results.push({ site, status: 'dry run' });
    continue;
  }

  // 1. Watch it move. An awwwards entry has no live page of its own, so the
  //    original URL is used when the row carries one, and the observation is
  //    allowed to come back empty rather than blocking the entry.
  const motionDir = path.join(dir, 'motion');
  if (!existsSync(path.join(motionDir, 'motion.json'))) {
    mkdirSync(motionDir, { recursive: true });
    const observed = await run('node', [path.join(ROOT, 'scripts', 'observe-motion.mjs'), '--url', site.url, '--name', name]);
    const summary = observed.out.split('\n').filter(line => /moved|frames|hover|unreachable/.test(line));
    for (const line of summary) process.stdout.write(`  ${line.trim()}\n`);
  } else {
    process.stdout.write('  motion already observed\n');
  }

  // 2. Write the entry from the render, with the motion as evidence.
  const derived = await run('node', [path.join(ROOT, 'scripts', 'image-to-world.mjs'),
    '--name', name, '--id', 'placeholder', '--family', family,
    '--motion-dir', motionDir, '--source', site.url]);
  const conceptFile = path.join(dir, 'concept.json');
  if (derived.code !== 0 || !existsSync(conceptFile)) {
    process.stdout.write(`  FAILED to derive: ${(derived.err || derived.out).trim().split('\n').pop()}\n\n`);
    results.push({ site, status: 'derive failed' });
    continue;
  }

  // The id is only knowable once the form line exists, so it is written in
  // afterwards rather than guessed before.
  const entries = JSON.parse(readFileSync(conceptFile, 'utf8'));
  const id = idFrom(entries[0].form, taken);
  taken.add(id);
  entries[0].id = id;
  writeFileSync(conceptFile, `${JSON.stringify(entries, null, 1)}\n`);
  process.stdout.write(`  ${id}\n`);

  // 3. Merge as pending. The gate imports the validator, so an entry that fails
  //    its bounds stops here and the row stays kept.
  const merged = await run('node', [path.join(ROOT, 'scripts', 'wave-merge.mjs'), '--candidates', conceptFile, '--write']);
  if (merged.code !== 0) {
    process.stdout.write(`  FAILED to merge: ${(merged.err || merged.out).trim().split('\n').slice(-2).join(' ')}\n\n`);
    results.push({ site, status: 'merge failed', id });
    continue;
  }

  // 4. Only now is the row closed, and re-read from disk because the lab may
  //    have been writing to the same file while this ran.
  const current = JSON.parse(readFileSync(QUEUE, 'utf8'));
  closeSite(current, site.url, { status: 'done', conceptId: id });
  current.note = QUEUE_NOTE;
  writeFileSync(QUEUE, `${JSON.stringify(current, null, 2)}\n`);
  process.stdout.write('  merged as pending and the row is closed\n\n');
  results.push({ site, status: 'done', id });
}

const done = results.filter(r => r.status === 'done');
process.stdout.write(`${done.length}/${results.length} landed\n`);
for (const r of results.filter(r => r.status !== 'done' && r.status !== 'dry run')) {
  process.stdout.write(`  ${r.status}: ${r.site.url}\n`);
}
if (done.length) process.stdout.write('\nThey are in the review queue now, pending, where every other world is judged.\n');

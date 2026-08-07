#!/usr/bin/env node
// A durable inbox of real sites worth deriving a world from.
//
// This exists because the awwwards ingest wrote its queue to .waves/, which is
// gitignored, so every candidate found in one session was invisible in the
// next. A queue whose whole job is to be picked up later cannot live in scratch
// space. It sits in catalog/ with everything else that is meant to persist.
//
//   node scripts/site-queue.mjs add https://a.com https://b.com
//   pbpaste | node scripts/site-queue.mjs add          # anything with URLs in it
//   node scripts/site-queue.mjs list
//   node scripts/site-queue.mjs done 3 --concept seed-library-lobes
//   node scripts/site-queue.mjs pass 4 --why "flat template under the animation"
//
// add takes messy input on purpose. Paste a bookmark export, a markdown list, a
// wall of text with links in it; every http(s) URL is extracted and the rest is
// discarded. Pasting is meant to cost nothing, because a candidate you did not
// bother to record is the one failure mode this cannot recover from.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  QUEUE_RELATIVE, QUEUE_NOTE, emptyQueue, normalizeUrl, extractUrls, addUrls, closeSite,
} from './lib/site-queue.mjs';

const ROOT = process.cwd();
const QUEUE = path.join(ROOT, ...QUEUE_RELATIVE);
const AWWWARDS = path.join(ROOT, '.waves', 'awwwards', 'sites.json');

const args = process.argv.slice(2);
const command = args[0];
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

function load() {
  if (!existsSync(QUEUE)) return emptyQueue();
  return JSON.parse(readFileSync(QUEUE, 'utf8'));
}

function save(queue) {
  queue.note = QUEUE_NOTE;
  // Review-file serialization: indent 2, trailing newline. Matching the
  // convention matters more than the value; writing this one at indent 1 would
  // reformat every entry the next time a script that assumes 2 touches it.
  writeFileSync(QUEUE, `${JSON.stringify(queue, null, 2)}\n`);
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function resolveEntry(queue, token) {
  if (/^\d+$/.test(token)) {
    const pending = queue.sites.filter(s => s.status === 'pending');
    return pending[Number(token) - 1] || null;
  }
  const norm = normalizeUrl(token);
  return queue.sites.find(s => s.url === norm || s.url.includes(token)) || null;
}

// --------------------------------------------------------------------- add
if (command === 'add') {
  const inline = args.slice(1).filter(a => !a.startsWith('--'));
  const piped = process.stdin.isTTY ? '' : readStdin();
  const source = flag('source', 'manual');
  const note = flag('note', '');
  const raw = [...extractUrls(inline.join('\n')), ...extractUrls(piped)];

  if (raw.length === 0) {
    process.stderr.write('no URLs found. Pass them as arguments or pipe anything containing them.\n');
    process.exit(1);
  }

  const queue = load();
  const { added, duplicate } = addUrls(queue, raw, { source, note });
  for (const entry of added) process.stdout.write(`  + ${entry.url}\n`);
  save(queue);
  const pending = queue.sites.filter(s => s.status === 'pending').length;
  process.stdout.write(`\n${added.length} added${duplicate ? `, ${duplicate} already queued` : ''}. ${pending} pending.\n`);
  process.exit(0);
}

// ------------------------------------------------------------------- list
if (command === 'list' || command === undefined) {
  const queue = load();
  const all = args.includes('--all');
  const rows = all ? queue.sites : queue.sites.filter(s => s.status === 'pending');
  if (rows.length === 0) {
    process.stdout.write(all ? 'queue is empty\n' : 'nothing pending\n');
    process.exit(0);
  }
  let index = 0;
  for (const site of rows) {
    const number = site.status === 'pending' ? `${(index += 1)}`.padStart(3) : '   ';
    const tail = site.status === 'done' ? `-> ${site.conceptId}`
      : site.status === 'passed' ? `passed: ${site.note || 'no reason recorded'}`
        : site.status === 'keep' ? `kept, no entry yet${site.note ? ` (${site.note})` : ''}`
          : site.note || '';
    process.stdout.write(`${number}  ${site.url}${tail ? `\n     ${tail}` : ''}\n`);
  }
  const counts = queue.sites.reduce((acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }), {});
  process.stdout.write(`\n${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}\n`);
  process.exit(0);
}

// ------------------------------------------------------------ done / pass
if (command === 'done' || command === 'pass' || command === 'keep') {
  const queue = load();
  const entry = resolveEntry(queue, args[1] || '');
  if (!entry) {
    process.stderr.write(`no queued site matching "${args[1]}". Run list to see the numbers.\n`);
    process.exit(1);
  }
  try {
    closeSite(queue, entry.url, {
      done: { status: 'done', conceptId: flag('concept') },
      keep: { status: 'keep' },
      pass: { status: 'passed', why: flag('why') },
    }[command]);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
  save(queue);
  process.stdout.write(`${entry.url}\n  ${entry.status}${entry.conceptId ? ` as ${entry.conceptId}` : `: ${entry.note}`}\n`);
  process.exit(0);
}

// ----------------------------------------------------------------- import
// One-time rescue of whatever the awwwards ingest left in scratch space.
if (command === 'import-awwwards') {
  if (!existsSync(AWWWARDS)) {
    process.stderr.write(`nothing at ${path.relative(ROOT, AWWWARDS)}\n`);
    process.exit(1);
  }
  const queue = load();
  let added = 0;
  for (const site of JSON.parse(readFileSync(AWWWARDS, 'utf8'))) {
    const result = addUrls(queue, [site.live || ''], { source: 'awwwards', note: site.title || '' });
    for (const entry of result.added) process.stdout.write(`  + ${entry.url}\n`);
    added += result.added.length;
  }
  save(queue);
  process.stdout.write(`\n${added} imported. ${queue.sites.filter(s => s.status === 'pending').length} pending.\n`);
  process.exit(0);
}

process.stderr.write(`usage: site-queue.mjs <add|list|keep|pass|done|import-awwwards>

  add [urls...]              extract and queue every URL in the arguments or on stdin
  list [--all]               pending by default, numbered for the verbs below
  keep <n|url>               worth a catalog entry; the id comes later
  pass <n|url> --why "..."   record why it does not become one
  done <n|url> --concept ID  record which world it became, once one is written
  import-awwwards            pull anything left in .waves/awwwards/sites.json

The order is pending -> keep or pass -> done. keep exists because judging a
render and writing its entry happen at different times, and the concept id is
produced by the second: there is nothing to type at the moment of judging.
`);
process.exit(1);

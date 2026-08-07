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

const ROOT = process.cwd();
const QUEUE = path.join(ROOT, 'catalog', 'site-queue.json');
const AWWWARDS = path.join(ROOT, '.waves', 'awwwards', 'sites.json');

const args = process.argv.slice(2);
const command = args[0];
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const NOTE = 'Sites worth deriving a world from, kept here rather than in .waves/ so a session can pick up where the last one stopped. Add freely and judge later: the cost of a bad candidate is one look, and the cost of a lost one is that it never comes back. status is pending until someone has actually used the page; done records the concept it became, passed records why it did not, so neither gets re-litigated.';

function load() {
  if (!existsSync(QUEUE)) return { schemaVersion: 1, note: NOTE, sites: [] };
  return JSON.parse(readFileSync(QUEUE, 'utf8'));
}

function save(queue) {
  queue.note = NOTE;
  // Review-file serialization: indent 2, trailing newline. Matching the
  // convention matters more than the value; writing this one at indent 1 would
  // reformat every entry the next time a script that assumes 2 touches it.
  writeFileSync(QUEUE, `${JSON.stringify(queue, null, 2)}\n`);
}

// Two URLs that differ only by a trailing slash, a scheme, a www, or a tracking
// parameter are the same candidate, and a queue that lets them both in wastes a
// screenshot run to discover it.
function normalize(raw) {
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  url.protocol = 'https:';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|ref|source)/i.test(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString().replace(/\/$/, '');
}

function extractUrls(text) {
  // Deliberately greedy about what counts as input and strict about what counts
  // as a URL, so a pasted markdown list, a bookmark dump and a chat log all work.
  const found = text.match(/https?:\/\/[^\s"'<>)\]}]+/g) || [];
  return found.map(u => u.replace(/[.,;:]+$/, ''));
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function resolveEntry(queue, token) {
  if (/^\d+$/.test(token)) {
    const pending = queue.sites.filter(s => s.status === 'pending');
    return pending[Number(token) - 1] || null;
  }
  const norm = normalize(token);
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
  const seen = new Set(queue.sites.map(s => s.url));
  let added = 0;
  let duplicate = 0;
  for (const candidate of raw) {
    const url = normalize(candidate);
    if (!url) continue;
    if (seen.has(url)) { duplicate += 1; continue; }
    seen.add(url);
    queue.sites.push({ url, added: today(), status: 'pending', source, ...(note ? { note } : {}) });
    added += 1;
    process.stdout.write(`  + ${url}\n`);
  }
  save(queue);
  const pending = queue.sites.filter(s => s.status === 'pending').length;
  process.stdout.write(`\n${added} added${duplicate ? `, ${duplicate} already queued` : ''}. ${pending} pending.\n`);
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
        : site.note || '';
    process.stdout.write(`${number}  ${site.url}${tail ? `\n     ${tail}` : ''}\n`);
  }
  const counts = queue.sites.reduce((acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }), {});
  process.stdout.write(`\n${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}\n`);
  process.exit(0);
}

// ------------------------------------------------------------ done / pass
if (command === 'done' || command === 'pass') {
  const queue = load();
  const entry = resolveEntry(queue, args[1] || '');
  if (!entry) {
    process.stderr.write(`no queued site matching "${args[1]}". Run list to see the numbers.\n`);
    process.exit(1);
  }
  if (command === 'done') {
    const conceptId = flag('concept');
    if (!conceptId) {
      process.stderr.write('done needs --concept <id>, so the world can be traced back to the page it came from.\n');
      process.exit(1);
    }
    Object.assign(entry, { status: 'done', conceptId, closed: today() });
  } else {
    const why = flag('why');
    if (!why) {
      process.stderr.write('pass needs --why "...", so the same page is not re-examined in three months.\n');
      process.exit(1);
    }
    Object.assign(entry, { status: 'passed', note: why, closed: today() });
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
  const seen = new Set(queue.sites.map(s => s.url));
  let added = 0;
  for (const site of JSON.parse(readFileSync(AWWWARDS, 'utf8'))) {
    const url = normalize(site.live || '');
    if (!url || seen.has(url)) continue;
    seen.add(url);
    queue.sites.push({
      url,
      added: today(),
      status: 'pending',
      source: 'awwwards',
      ...(site.title ? { note: site.title } : {}),
    });
    added += 1;
    process.stdout.write(`  + ${url}\n`);
  }
  save(queue);
  process.stdout.write(`\n${added} imported. ${queue.sites.filter(s => s.status === 'pending').length} pending.\n`);
  process.exit(0);
}

process.stderr.write(`usage: site-queue.mjs <add|list|done|pass|import-awwwards>

  add [urls...]              extract and queue every URL in the arguments or on stdin
  list [--all]               pending by default, numbered for done/pass
  done <n|url> --concept ID  record which world the page became
  pass <n|url> --why "..."   record why it did not become one
  import-awwwards            pull anything left in .waves/awwwards/sites.json
`);
process.exit(1);

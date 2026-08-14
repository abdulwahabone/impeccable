#!/usr/bin/env node
/**
 * Measures how readable each changelog entry is, and checks the markup the
 * release script depends on.
 *
 * Verbosity is the failure mode this catches. An entry drifts one bullet at a
 * time: a claim earns a second sentence, then a third, and a release nobody can
 * skim reads as a wall. Words per item is the cheapest proxy, and it separated
 * the readable entries from the unreadable ones cleanly when it was first run:
 * the v3.x entries sat at 32 to 40, the v4.0.x era had climbed to 76.
 *
 *   node scripts/changelog-stats.mjs            # report every entry
 *   node scripts/changelog-stats.mjs --check    # exit 1 on a structural break
 *   node scripts/changelog-stats.mjs --strict   # also exit 1 on verbosity
 *
 * --check covers structure only, and every structural rule here has already
 * shipped a bug:
 *   - a list that is not <ul class="cf-items">, which renders unstyled AND
 *     makes release.mjs publish the following entry's notes as this version's
 *   - more than one entry carrying cf-entry--current
 *
 * Verbosity is reported but not fatal by default, because the historical
 * entries are over the line and a gate that fails on day one is a gate nobody
 * runs. Write new entries so they pass --strict.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = path.join(ROOT, 'site/pages/changelog.astro');

// Past 45 an item has stopped being a changelog line and become documentation.
// 35 is where the entries people call readable actually land.
const TARGET_WORDS_PER_ITEM = 35;
const HARD_WORDS_PER_ITEM = 45;
// Beyond this many items an entry needs cf-group themes to stay scannable.
const GROUP_THRESHOLD = 8;

const strip = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const words = (html) => strip(html).split(' ').filter(Boolean).length;

export function analyze(source) {
  const entries = [];
  const re = /<article id="([^"]+)"([^>]*)>([\s\S]*?)<\/article>/g;
  let m;
  while ((m = re.exec(source))) {
    const [, id, attrs, body] = m;
    const items = [...body.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((x) => x[1]);
    const lists = [...body.matchAll(/<ul class="([^"]*)"/g)].map((x) => x[1]);
    entries.push({
      id,
      current: /cf-entry--current/.test(attrs),
      items: items.length,
      words: items.reduce((n, i) => n + words(i), 0),
      longest: items.reduce((n, i) => Math.max(n, words(i)), 0),
      groups: (body.match(/class="cf-group"/g) || []).length,
      badLists: lists.filter((c) => c.trim() !== 'cf-items'),
    });
  }
  return entries;
}

export function violations(entries) {
  const fatal = [];
  const warnings = [];
  const current = entries.filter((e) => e.current);
  if (current.length > 1) {
    fatal.push(`${current.length} entries carry cf-entry--current (${current.map((e) => e.id).join(', ')}). Only the newest skill entry may.`);
  }
  for (const e of entries) {
    for (const cls of e.badLists) {
      fatal.push(`${e.id}: <ul class="${cls}"> is not cf-items. It renders unstyled, and release.mjs would publish the NEXT entry's notes as this version's.`);
    }
    if (!e.items) continue;
    const per = e.words / e.items;
    if (per > HARD_WORDS_PER_ITEM) {
      warnings.push(`${e.id}: ${per.toFixed(0)} words per item. Cut to a claim plus one sentence (target ${TARGET_WORDS_PER_ITEM}).`);
    }
    if (e.longest > 70) {
      warnings.push(`${e.id}: one item runs ${e.longest} words. Split it; a bullet joining several changes is several bullets.`);
    }
    if (e.items > GROUP_THRESHOLD && e.groups === 0) {
      warnings.push(`${e.id}: ${e.items} items and no cf-group labels. Break it into 3 to 5 themes.`);
    }
  }
  return { fatal, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = readFileSync(PAGE, 'utf8');
  const entries = analyze(source);
  const check = process.argv.includes('--check');

  console.log(`${'entry'.padEnd(16)}${'items'.padStart(6)}${'words'.padStart(7)}${'w/item'.padStart(8)}${'longest'.padStart(9)}  groups`);
  for (const e of entries) {
    const per = e.items ? (e.words / e.items) : 0;
    const flag = per > HARD_WORDS_PER_ITEM ? '  <-- verbose' : '';
    console.log(
      `${e.id.padEnd(16)}${String(e.items).padStart(6)}${String(e.words).padStart(7)}`
      + `${per.toFixed(0).padStart(8)}${String(e.longest).padStart(9)}  ${e.groups || ''}${flag}`,
    );
  }

  const strict = process.argv.includes('--strict');
  const { fatal, warnings } = violations(entries);
  if (fatal.length) {
    console.log(`\nStructural (${fatal.length}), these ship bugs:`);
    for (const v of fatal) console.log(`  - ${v}`);
  }
  if (warnings.length) {
    console.log(`\nVerbosity (${warnings.length}), fatal only under --strict:`);
    for (const v of warnings) console.log(`  - ${v}`);
  }
  if (!fatal.length && !warnings.length) console.log('\nNo issues.');
  if ((check && fatal.length) || (strict && (fatal.length || warnings.length))) process.exit(1);
}

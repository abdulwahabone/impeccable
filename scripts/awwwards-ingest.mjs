#!/usr/bin/env node
// Turns an awwwards collection into a queue of live sites to go and look at.
//
// The catalog is thin on digital-native worlds that are actually good, and the
// waves that tried to invent them from text kept producing what a model would
// have written anyway. This starts from real award-tier work instead. The guide
// already permits it: it bars generic contemporary web sources, not specific
// ones, and "an award-tier build with a real signature" is named as far from the
// default.
//
// What this script does NOT do is store anything of theirs. No thumbnails, no
// screenshots, no copy. It reads a collection for its entries and each entry for
// the outbound link, and everything after that happens on the site's own page,
// which is browsing. robots.txt permits /sites/ and /collections/ and blocks
// SiteSucker by name, which reads as an objection to mirroring rather than to
// reading, so this stays slow and small by default.
//
// The reason a queue is the output and not a world: a screenshot of one of these
// is worthless. MindMarket renders as an empty cream rectangle on load and draws
// its illustration as you scroll, and that scroll-bound drawing is the only
// interesting thing about it. Someone has to actually go and use the page.
//
//   node scripts/awwwards-ingest.mjs --collection https://www.awwwards.com/USER/collections/NAME/
//   node scripts/awwwards-ingest.mjs --collection <url> --pages 3 --limit 30
//   node scripts/awwwards-ingest.mjs --sites mindmarket,palazzo-sogni

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const collection = flag('collection', null);
const sitesArg = flag('sites', null);
const pages = Number(flag('pages', 1));
const limit = Number(flag('limit', 24));
const out = flag('out', path.join(ROOT, '.waves', 'awwwards'));

if (!collection && !sitesArg) {
  process.stderr.write('usage: awwwards-ingest.mjs --collection <url> | --sites slug,slug\n');
  process.exit(1);
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
// Deliberately unhurried. Nothing here is time-critical and a catalog that
// blocks bulk downloaders by name deserves to be read at a human rate.
const PAUSE_MS = 1500;
const sleep = ms => new Promise(resolve => { setTimeout(resolve, ms); });

async function get(url) {
  const response = await fetch(url, { headers: { 'user-agent': UA } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
}

function slugsFrom(html) {
  return [...new Set([...html.matchAll(/href="\/sites\/([a-z0-9-]+)"/g)].map(m => m[1]))];
}

// The outbound link is the one external host the page points at repeatedly and
// that is not awwwards or a social network. Counting beats picking the first
// match, because the page carries plenty of incidental links.
const IGNORE = /awwwards|w3\.org|google|facebook|twitter|x\.com|instagram|linkedin|youtube|tiktok|pinterest|cloudfront|gstatic|cdn|schema\.org|vimeo|behance|dribbble/i;
function liveUrlFrom(html) {
  const counts = new Map();
  for (const match of html.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})(?:\/|")/gi)) {
    const host = match[1].toLowerCase();
    if (IGNORE.test(host)) continue;
    counts.set(host, (counts.get(host) || 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? `https://${best[0]}/` : null;
}

function metaFrom(html) {
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
  const tags = [...new Set([...html.matchAll(/\/websites\/[a-z0-9-]+\/"[^>]*>([A-Za-z0-9 &.-]{2,26})</g)]
    .map(m => m[1].trim()))].slice(0, 12);
  const scores = Object.fromEntries([...html.matchAll(/>(Design|Usability|Creativity|Content)<\/[^>]+>\s*<[^>]*>([0-9.]{3,4})</g)]
    .map(m => [m[1].toLowerCase(), Number(m[2])]));
  return { title: title.replace(/\s*[-|].*$/, '').trim(), tags, scores };
}

const slugs = [];
if (sitesArg) slugs.push(...sitesArg.split(',').map(s => s.trim()).filter(Boolean));
if (collection) {
  for (let page = 1; page <= pages; page += 1) {
    const url = page === 1 ? collection : `${collection.replace(/\/$/, '')}/?page=${page}`;
    process.stdout.write(`reading ${url}\n`);
    slugs.push(...slugsFrom(await get(url)));
    await sleep(PAUSE_MS);
  }
}

const wanted = [...new Set(slugs)].slice(0, limit);
process.stdout.write(`\n${wanted.length} entries to resolve\n`);

const sites = [];
for (const slug of wanted) {
  try {
    const html = await get(`https://www.awwwards.com/sites/${slug}`);
    const live = liveUrlFrom(html);
    const meta = metaFrom(html);
    if (!live) { process.stdout.write(`  no live url  ${slug}\n`); continue; }
    sites.push({ slug, entry: `https://www.awwwards.com/sites/${slug}`, live, ...meta });
    process.stdout.write(`  ${live.padEnd(42)} ${meta.tags.slice(0, 4).join(', ')}\n`);
  } catch (error) {
    process.stdout.write(`  FAILED ${slug}: ${error.message}\n`);
  }
  await sleep(PAUSE_MS);
}

mkdirSync(out, { recursive: true });
const file = path.join(out, 'sites.json');
const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const merged = [...existing];
for (const site of sites) if (!merged.some(s => s.slug === site.slug)) merged.push(site);
writeFileSync(file, `${JSON.stringify(merged, null, 1)}\n`);

process.stdout.write(`\n${sites.length} resolved, ${merged.length} in ${path.relative(ROOT, file)}\n`);
process.stdout.write('Next: send an agent to each live site to use it, then author a world from what it saw.\n');
process.stdout.write('A screenshot will not do. These pages are mostly motion.\n');

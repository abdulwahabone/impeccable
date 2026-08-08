#!/usr/bin/env node
// Pull roll/choice telemetry from Workers Analytics Engine into a committed
// snapshot the labs read like any other catalog file.
//
//   node scripts/pull-telemetry.mjs
//
// Writes catalog/telemetry-snapshot.json. Requires two env vars:
//   CLOUDFLARE_ACCOUNT_ID      the account that owns the Pages project
//   CLOUDFLARE_ANALYTICS_TOKEN an API token with Account Analytics: Read
//
// Why a snapshot instead of a live endpoint: the labs are dev-only pages that
// read committed catalog JSON at render time, reviews happen offline, and a
// snapshot keeps the API token out of every serving path. Run this whenever
// fresh numbers are wanted; the labs render whatever is committed and say how
// old it is.
//
// Event shape (functions/api/_worldroll.js logEvent): blob positions are
// per-event, filtered on index1.
//   roll:   blob1=event blob2=scope blob3=mode blob4=poolRevision blob5=''
//           blob6..blob14 = dealt challenger + composition ids
//   chosen: blob1=event blob2=scope blob3=mode blob4=poolRevision
//           blob5=chosenId blob6=kind blob7=register
// Counts use SUM(_sample_interval) so Analytics Engine sampling is corrected.
// Retention is ~90 days, which is also the widest window worth asking for.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATASET = 'impeccable_world_rolls';
const OUT = path.join(ROOT, 'catalog', 'telemetry-snapshot.json');

// R2 is account-scoped, so R2_ACCOUNT_ID (already in .env for the card
// pipeline) is the same identifier and serves as the fallback.
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_ANALYTICS_TOKEN;
if (!accountId || !token) {
  console.error('pull-telemetry: set CLOUDFLARE_ACCOUNT_ID (or R2_ACCOUNT_ID) and CLOUDFLARE_ANALYTICS_TOKEN (API token with Account Analytics: Read).');
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: query,
  });
  if (!res.ok) {
    throw new Error(`analytics query failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  return (await res.json()).data ?? [];
}

const since = (days) => `timestamp > NOW() - INTERVAL '${days}' DAY`;

// One GROUP BY per blob column, merged in JS: Analytics Engine SQL has no
// UNNEST, and the dealt ids live across nine positional columns.
async function groupedCounts({ event, blobs, days }) {
  const merged = new Map();
  for (const blob of blobs) {
    const rows = await sql(
      `SELECT ${blob} AS id, SUM(_sample_interval) AS n FROM ${DATASET} WHERE index1 = '${event}' AND ${since(days)} AND ${blob} <> '' GROUP BY id`
    );
    for (const row of rows) merged.set(row.id, (merged.get(row.id) || 0) + Number(row.n));
  }
  return merged;
}

async function total(event, days) {
  const rows = await sql(`SELECT SUM(_sample_interval) AS n FROM ${DATASET} WHERE index1 = '${event}' AND ${since(days)}`);
  return Number(rows[0]?.n || 0);
}

const DEALT_BLOBS = ['blob6', 'blob7', 'blob8', 'blob9', 'blob10', 'blob11', 'blob12', 'blob13', 'blob14'];

async function window(days) {
  const [dealt, chosen, kinds, registers, rolls, chosenTotal] = await Promise.all([
    groupedCounts({ event: 'roll', blobs: DEALT_BLOBS, days }),
    groupedCounts({ event: 'chosen', blobs: ['blob5'], days }),
    groupedCounts({ event: 'chosen', blobs: ['blob6'], days }),
    groupedCounts({ event: 'chosen', blobs: ['blob7'], days }),
    total('roll', days),
    total('chosen', days),
  ]);
  const ids = {};
  for (const [id, n] of dealt) ids[id] = { dealt: n, chosen: 0 };
  for (const [id, n] of chosen) {
    ids[id] = ids[id] || { dealt: 0, chosen: 0 };
    ids[id].chosen = n;
  }
  return {
    totals: { rolls, chosen: chosenTotal },
    ids,
    kinds: Object.fromEntries(kinds),
    registers: Object.fromEntries(registers),
  };
}

const [w90, w30] = await Promise.all([window(90), window(30)]);
const snapshot = {
  generatedAt: new Date().toISOString(),
  dataset: DATASET,
  windows: { '90d': w90, '30d': w30 },
};
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n');
const idCount = Object.keys(w90.ids).length;
console.log(`pull-telemetry: ${w90.totals.rolls} rolls and ${w90.totals.chosen} choices over 90d across ${idCount} dealt ids -> ${path.relative(ROOT, OUT)}`);
if (!Object.keys(w90.kinds).length) {
  console.log('pull-telemetry: no card-kind data yet; kinds accrue once clients ship the --kind ping.');
}

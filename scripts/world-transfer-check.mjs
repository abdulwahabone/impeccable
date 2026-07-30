#!/usr/bin/env node
// Cheap pre-check for whether a world is a world or just one page design.
//
// A world is a durable visual identity: its five system rules should say how
// things look and behave, so the same identity can dress a pricing page, an app
// screen and a changelog. A rule that names the content it was designed for is
// not transferable, it is a description of one surface. "State is shown by
// physical position, a lifted card sits proud" travels anywhere. "Layer 0 is the
// sensor buffer through layer 5 the signed archive" cannot leave the product it
// came from.
//
// This does not replace judging the transfer, which needs a model to actually
// apply the identity elsewhere and see what breaks. It is the free filter that
// runs first, because a rule naming firmware and disputed readings will fail
// that judgement anyway and there is no reason to pay for the answer.
//
//   node scripts/world-transfer-check.mjs --candidates worlds.json

import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const file = flag('candidates', null);
if (!file) {
  process.stderr.write('usage: world-transfer-check.mjs --candidates <file.json>\n');
  process.exit(1);
}
const entries = JSON.parse(readFileSync(path.isAbsolute(file) ? file : path.join(ROOT, file), 'utf8'));

// Content-locked vocabulary: words naming a product domain rather than a visual
// or behavioural property. A world may mention these in its form, spark and
// lineage, which are allowed to be about something. Its system rules may not,
// because those are what get applied to a different surface.
const DOMAIN = [
  'firmware', 'calibration', 'calibrat', 'sensor', 'telemetry', 'reading', 'readings',
  'dispute', 'disputed', 'deposit', 'refund', 'claim', 'tolerance', 'citation',
  'regulation', 'regulatory', 'compliance', 'audit', 'lot number', 'serial',
  'procedure', 'parameter', 'revision', 'jurisdiction', 'spectrum', 'vial',
  'cache age', 'hazard', 'aftercare', 'invoice', 'ticket', 'patient', 'dosage',
];

const PREFIXES = ['Palette/material:', 'Type/composition:', 'Topology/navigation:', 'Controls/state:', 'Responsive/motion:'];

function checkRule(rule) {
  const text = rule.toLowerCase();
  return DOMAIN.filter(word => new RegExp(`\\b${word}`, 'i').test(text));
}

process.stdout.write(`transfer pre-check: ${entries.length} worlds\n`);
process.stdout.write('a system rule naming its product domain cannot dress another surface\n\n');

const scored = entries.map(entry => {
  const rules = entry.system || [];
  const flagged = rules.map((rule, index) => ({
    prefix: PREFIXES[index] || `rule ${index + 1}`,
    hits: checkRule(rule),
  })).filter(row => row.hits.length > 0);
  return { entry, flagged, locked: flagged.length };
});

scored.sort((a, b) => b.locked - a.locked);

for (const { entry, flagged, locked } of scored) {
  const verdict = locked === 0 ? 'clean' : locked >= 3 ? 'LIKELY A PAGE DESIGN' : 'partly content-locked';
  process.stdout.write(`  ${String(locked)}/5 rules locked  ${verdict.padEnd(22)} ${entry.id}\n`);
  for (const row of flagged) {
    process.stdout.write(`      ${row.prefix.padEnd(22)} ${row.hits.slice(0, 4).join(', ')}\n`);
  }
}

const clean = scored.filter(s => s.locked === 0).length;
process.stdout.write(`\n${clean} of ${entries.length} have no content-locked system rule.\n`);
process.stdout.write('Those are the ones worth paying to judge properly; the rest need their rules rewritten first.\n');

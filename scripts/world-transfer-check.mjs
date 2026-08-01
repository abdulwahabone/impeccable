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
// Measured predictive record, from three judged transfers where a model built
// the surfaces for real and reported what broke:
//
//   Calibration Binder  vocabulary flagged it, structural did not, judged a page
//                       design. Vocabulary correct.
//   Loom Comparator     vocabulary called it clean, structural flagged three
//                       rules, judged a page design. Vocabulary wrong.
//   Ledger Sheet        judged a world.
//
// So the two probes are complementary rather than redundant: each caught the one
// the other missed, and neither alone would have caught both. Run both, treat a
// hit from either as a reason to look, and keep paying for judged transfers,
// because two of the three worlds tested turned out to be page designs and no
// keyword check would have been trusted to say so.
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
// Bare "reading" is deliberately absent. It was here for a sensor reading and it
// matched "a set label and a reading size", which is ordinary typographic
// vocabulary, so it flagged a Type/composition rule that was doing nothing
// wrong. The plural stays: "readings" is instrument language almost every time,
// while the singular collides with how designers talk about type. Third time
// this corpus has punished an over-broad match, after "every" in the density
// probe and "akan" inside "Wakandan".
const DOMAIN = [
  'firmware', 'calibration', 'calibrat', 'sensor', 'telemetry', 'readings',
  'dispute', 'disputed', 'deposit', 'refund', 'claim', 'tolerance', 'citation',
  'regulation', 'regulatory', 'compliance', 'audit', 'lot number', 'serial',
  'procedure', 'parameter', 'revision', 'jurisdiction', 'spectrum', 'vial',
  'cache age', 'hazard', 'aftercare', 'invoice', 'ticket', 'patient', 'dosage',
];

// Structural lock-in, which the vocabulary check above cannot see. A judged
// transfer found that the rule breaking a world was "no two entries share a left
// edge": it contains no domain noun at all, yet it forbids the aligned rows a
// pricing comparison is made of. Content lock and structural lock are different
// failures and only the first has words to look for.
//
// Honesty about these patterns: they were written after reading the judgement
// that exposed the gap, and tested against seven worlds. That is fitting to a
// known case, not validation. Treat a hit as a prompt to look, and expect the
// list to be wrong in ways only more judged transfers will reveal.
const STRUCTURAL = [
  { label: 'forbids shared alignment', re: /no two .{0,30}(share|align)|unaligned|never align|no shared (left )?edge/i },
  { label: 'forbids a grid', re: /no column guides|no grid\b|off-grid|anti-grid/i },
  { label: 'binds colour to one semantic', re: /reserved (exclusively )?for|means? legal status|colour is (legal )?state/i },
  { label: 'assumes one content type', re: /each (term|entry|step|row|parameter|layer|band|plate) (has|is|carries)/i },
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
  const structural = [...new Set(
    rules.flatMap(rule => STRUCTURAL.filter(pattern => pattern.re.test(rule)).map(pattern => pattern.label))
  )];
  return { entry, flagged, locked: flagged.length, structural };
});

scored.sort((a, b) => b.locked - a.locked);

for (const { entry, flagged, locked, structural } of scored) {
  const verdict = locked >= 3 ? 'LIKELY A PAGE DESIGN'
    : locked === 0 && structural.length === 0 ? 'clean'
    : locked === 0 ? 'structurally locked'
    : 'partly content-locked';
  process.stdout.write(`  ${String(locked)}/5 rules locked  ${verdict.padEnd(22)} ${entry.id}\n`);
  for (const row of flagged) {
    process.stdout.write(`      ${row.prefix.padEnd(22)} ${row.hits.slice(0, 4).join(', ')}\n`);
  }
  for (const label of structural) {
    process.stdout.write(`      ${'structural'.padEnd(22)} ${label}\n`);
  }
}

const clean = scored.filter(s => s.locked === 0 && s.structural.length === 0).length;
process.stdout.write(`\n${clean} of ${entries.length} are clean on both checks.\n`);
process.stdout.write('Neither check decides anything. A judged transfer found a world that passed the\n');
process.stdout.write('vocabulary check outright and still turned out to be a page design, so these only\n');
process.stdout.write('say where to look first when the budget for judging is finite.\n');

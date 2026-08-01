#!/usr/bin/env node
// Writes the authoring prompt for one assignment in a wave.
//
// This exists because the prompt used to live nowhere. Each wave was briefed by
// hand, so every round re-decided what a world is, and nothing a round learned
// survived into the next one. That is the "undisciplined one-off waves" problem
// by its mechanism: not a shortage of ideas, a prompt with no memory.
//
// The transfer contract below is the memory. Three judged transfers, where a
// model built two unrelated surfaces under each identity and reported what
// broke, returned two page designs and one world. Every prohibition here cites
// the rule that earned it, so a later reader can overturn one on evidence rather
// than taste.
//
//   node scripts/wave-brief.mjs --key spring-docs --index 0
//   node scripts/wave-brief.mjs --key spring-docs --count 6 --out briefs/

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { drawBrief, loadWaveInputs } from './lib/wave-draw.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const key = flag('key', 'wave');
const count = flag('count', null);
const only = flag('index', null);
const outDir = flag('out', null);

const { axesDefinition, companyDeck, occupancy } = loadWaveInputs();

// The contract every candidate is written against. Each entry names the rule
// from a judged transfer that produced it, because a prohibition without its
// evidence is just a preference and the next author will reasonably ignore it.
const CONTRACT = `## The transfer contract

A world is not a page design. The difference is testable, and two of the three
worlds tested so far failed the test, so treat this section as the brief rather
than as boilerplate.

The test: this identity will be applied to two surfaces it was not designed for,
by someone who cannot ask you what you meant. A rule that only works on the
surface you had in mind is not a system rule, it is a description of one page.

### Three prohibitions, each from a world that broke

**1. No rule may presume a data model.**

A rule that assumes the content has a particular structure dies the moment the
structure is absent. These both broke:

  "the current revision is the top sheet and each prior revision is an offset
   sheet behind it"          presumes revisions exist
  "The page is one stack, layer 0 through layer 5"
                            presumes six layers of something

The judgement on the first: "the revision stack presumes revisions exist". Ask
of every rule: could this dress a page about a bakery's opening hours? If the
rule needs the content to have versions, layers, disputes, or states that only
this product has, rewrite it as the visual mechanism underneath. "State is shown
by physical position, a lifted card sits proud with a longer cast shadow"
travels. It names a mechanism, not a schema.

**2. No rule may dictate the shape of the content.**

A rule constrains the measure. It does not constrain what you are allowed to
say. These both broke:

  "axial symmetry absolute with a spine down the centre and tables mirrored"
                            demands content arrive in matched pairs
  "weft cards overlapping at unaligned offsets so no two entries share a left edge"
                            forbids the aligned rows a comparison is made of

The judgement on the first: it "constrains not the measure but what you are
allowed to say, demanding content arrive in symmetric pairs when neither a
persuasion sequence nor a set of photographs does". The second contains no
domain noun at all and still locks the identity to one content shape, which is
why reading your rules for product vocabulary is not sufficient.

**3. No quantity a hosted surface cannot satisfy.**

  "Bunting cotton ground carries 45 percent of the surface as the one committed
   colour"                  unsatisfiable on any surface hosting media it did
                            not author

State each quantity for a page that is 80% photographs the identity did not
choose. If it cannot hold there, express it as a relationship or a floor rather
than a fixed share of the surface.

### The positive bar: a world generates

The one identity that passed did so because it threw off features nobody asked
for: signup became a ledger entry, a transcript inked green as the playhead
struck it. The two that failed could only be applied. As the judgement put it,
what travelled was "a style you could apply to anything, not a world that
generates anything".

So before returning, name two features this identity produces that this brief
did not ask for, on two surfaces it was not designed for. If you cannot, the
identity is a style and it will not survive review.

### Where the failures cluster

Across the judged transfers, Controls/state travelled every time and was twice
named the strongest rule, because printed marks and binary-state mechanisms are
indifferent to content. The material layer travelled too. Both failures came
from Type/composition and Topology/navigation. Give those two slots the hardest
version of the three tests above.`;

const OUTPUT_SHAPE = `## What to return

One JSON object. No prose around it.

  id            kebab-case, prefixed with the wave key
  familyId      medium-native for a digital-native world
  form          one sentence naming the artifact and its structural signature
  lineage       the real tradition it inherits from, named and dated
  spark         one concrete image, a thing you could photograph
  system        exactly five strings, prefixed in this order:
                  Palette/material:
                  Type/composition:
                  Topology/navigation:
                  Controls/state:
                  Responsive/motion:
  webLeverage   a buildable commitment, the technique a build must implement
  tags          three or four
  axes          the drawn axis values below, verbatim, as an object

The axes field is not optional. An assignment that is not recorded is lost the
moment the world lands, and the coverage map silently reverts to guessing from
prose.`;

function renderBrief(brief) {
  const lines = [];
  lines.push(`# Wave "${key}", assignment ${String(brief.index + 1).padStart(2, '0')}`);
  lines.push('');
  lines.push('Design one world against the assignment below. The assignment was drawn before');
  lines.push('anything was designed, deliberately, so that the aesthetic is not the one a');
  lines.push('generator would have chosen. Every value is a constraint to design under, not a');
  lines.push('description to write down: do not name the axis values in the world text.');
  lines.push('');

  if (brief.company) {
    lines.push('## The company');
    lines.push('');
    lines.push('Drawn uniformly. It is not negotiable and it is not a suggestion to improve on.');
    lines.push('');
    const pad = Math.max(...brief.company.map(line => line.label.length));
    for (const line of brief.company) {
      lines.push(`  ${line.label.padEnd(pad)}  ${line.value}`);
    }
    lines.push('');
  }

  lines.push('## The aesthetic');
  lines.push('');
  lines.push('Weighted against what the catalog already occupies, so a thin value is an');
  lines.push('opening rather than an accident. The basis line says why each came up.');
  lines.push('');
  for (const note of brief.notes) {
    lines.push(`  ${note.label}`);
    if (note.question) lines.push(`    ${note.question}`);
    lines.push(`    => ${note.valueLabel}`);
    lines.push(`       ${note.basis}`);
  }
  lines.push('');
  lines.push(CONTRACT);
  lines.push('');
  lines.push(OUTPUT_SHAPE);
  lines.push('');
  lines.push('## Also binding');
  lines.push('');
  lines.push('docs/WORLD-CATALOG-AUTHORING.md carries the quality bar: distance from the');
  lines.push("model's defaults, the winner-property test, the render-gate traps, and the");
  lines.push('cultural care rule. Read it. The transfer contract above is additional to it,');
  lines.push('not a replacement for it.');
  lines.push('');
  lines.push('Record these axis values verbatim in the axes field:');
  lines.push('');
  lines.push(`  ${JSON.stringify(brief.chosen)}`);
  return `${lines.join('\n')}\n`;
}

const indexes = only != null
  ? [Number(only)]
  : Array.from({ length: Number(count || 1) }, (_, i) => i);

const rendered = indexes.map(index => ({
  index,
  text: renderBrief(drawBrief({ key, index, occupancy, axesDefinition, companyDeck })),
}));

if (outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const item of rendered) {
    const file = path.join(outDir, `${key}-${String(item.index + 1).padStart(2, '0')}.md`);
    writeFileSync(file, item.text);
    process.stdout.write(`${file}\n`);
  }
} else {
  process.stdout.write(rendered.map(item => item.text).join('\n\n---\n\n'));
}

#!/usr/bin/env node
// Writes the authoring prompt for one assignment in a wave.
//
// This exists because the prompt used to live nowhere. Each wave was briefed by
// hand, so every round re-decided what a world is, and nothing a round learned
// survived into the next one. That is the "undisciplined one-off waves" problem
// by its mechanism: not a shortage of ideas, a prompt with no memory.
//
// The transfer contract below is the memory. It is written from nine judged
// transfers, where a model built two unrelated surfaces under each identity and
// reported what actually broke. The first three, authored before the contract
// existed, returned two page designs and one world. The six authored under it
// returned one page design and five worlds.
//
// Every prohibition cites the rule that earned it, so a later reader can
// overturn one on evidence rather than taste. The two required clauses and the
// two set-level checks came from the second round: they are absences and
// interactions, which no prohibition can catch, and they were invisible until
// the prohibitions stopped the more obvious failures from happening first.
//
//   node scripts/wave-brief.mjs --key spring-docs --index 0
//   node scripts/wave-brief.mjs --key spring-docs --count 6 --out briefs/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { drawBrief, loadWaveInputs, unit } from './lib/wave-draw.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const key = flag('key', 'wave');
const count = flag('count', null);
const only = flag('index', null);
const outDir = flag('out', null);
// Read mode gets its own territory draw and its own bar. The wave pipeline used
// to brief documentation surfaces for every mode and leave the source tradition
// to the authoring agent, which is how it produced worlds built from traditions
// of display and then graded them on a landing page.
const mode = flag('mode', null);

const { axesDefinition, companyDeck, occupancy } = loadWaveInputs();
// A mode is a deck file, not a branch. Adding one means adding
// catalog/<mode>-territories.json with its own axes and its own bar; nothing
// here needs to know the mode exists.
let modeDeck = null;
if (mode) {
  const deckPath = path.join(process.cwd(), 'catalog', `${mode}-territories.json`);
  if (!existsSync(deckPath)) {
    process.stderr.write(`no deck for mode "${mode}". Expected ${path.relative(process.cwd(), deckPath)}\n`);
    process.exit(1);
  }
  modeDeck = JSON.parse(readFileSync(deckPath, 'utf8'));
}

// One clause for every mode, because it is the failure that shows up in all of
// them and it is checkable before a render. The authoring guide already says
// why: low-contrast, desaturated and single-hue palettes fail at the render gate
// no matter how sound the world is. A reading brief is not a licence for
// restraint.
const PALETTE_CLAUSE = `## One clause that applies whatever the mode

Commit the palette. A world whose render could be mistaken for a default
template has failed even when every rule is sound, and the way that happens is
almost always one hue on a near-neutral ground. Name the committed colours and
the material, and make them visible in the furniture: the rules, the margins,
the controls, the ground itself.

The opposite failure is real and rarer: a world so insistent it can only ever
dress one kind of site. The target is a world you recognise at a glance and can
still wear on an arbitrary build.`;

// The contract every candidate is written against. Each entry names the rule
// from a judged transfer that produced it, because a prohibition without its
// evidence is just a preference and the next author will reasonably ignore it.
const CONTRACT = `## The transfer contract

A world is not a page design. The difference is testable, and it has been
tested: nine identities were handed to a model that built two unrelated surfaces
under each and reported what broke. Three of the nine were page designs. Treat
this section as the brief rather than as boilerplate.

The test: this identity will be applied to two surfaces it was not designed for,
by someone who cannot ask you what you meant. A rule that only works on the
surface you had in mind is not a system rule, it is a description of one page.

### Four prohibitions, each from a world that broke

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

**4. No rule may depend on the reading conditions of a documentation page.**

This one is the hardest to see, because the surface you are designing for is
documentation, and a rule that quietly assumes its conditions looks fine right
up until it does not. Four separate judged transfers named it:

  "invisible on documentation, which is single-column, narrow-measure, and read
   at one width by someone who already wants to be there"
  "a documentation assumption wearing physics clothes: docs are reference
   material where a reader tolerates scrubbing"
  "cannot surface on a documentation page, which has short uniform copy and
   almost no controls. It surfaces on the first Buy button"
  the end of a documentation page is a footer, so a rule driving something to a
   limit at the end of a surface is harmless there and detonates on a landing
   page, where the end is the sale

So: a documentation reader is already persuaded, reads one column at one width,
tolerates scrolling and scrubbing, meets few controls, and stops at a footer
nobody looks at. If a rule is only safe under those conditions, it is not a
system rule. State it for a reader who has to be convinced, on a wall-sized
display, with a purchase at the end.

### The positive bar: a world generates

The identities that passed did so because they threw off features nobody asked
for: signup became a ledger entry, a transcript inked green as the playhead
struck it, an empty search became a bare rail with the floor showing. The ones
that failed could only be applied. As the judgement put it,
what travelled was "a style you could apply to anything, not a world that
generates anything".

So before returning, name two features this identity produces that this brief
did not ask for, on two surfaces it was not designed for. If you cannot, the
identity is a style and it will not survive review.

### Two things every identity must state

The prohibitions above only remove. Six judged transfers found the same two
defects to be absences, which no prohibition can catch, so state both explicitly
in your rules.

**An emphasis mechanism.** Every one of the six identities tested could not make
one thing outrank the things around it. "Nothing can emphasize the plan you want
sold." "All persuasion runs at 12px." "No hero is possible." "Rank collapsed."
The cause is structural: documentation hierarchy is sequence and heading, while
persuasion needs one element to dominate its neighbours, and the drawn
prohibitions routinely remove the usual tools by forbidding colour-as-state,
capping type sizes, or banning scale. Name the mechanism that survives your own
prohibitions, and check it works in every material your palette rule allows. One
identity made rank the size of a cleared cavity and it was invisible in two of
its three materials, which turned that world into a page design.

**A legibility contract for body prose over your own ground.** Four transfers
measured this failing: body text at 77% ink coverage, a control label at 1.13:1
against its own state colour, two adjacent products at 1.31:1, captions at
2.4:1. Persuasion is prose, and a drenched or textured ground has no obligation
to carry it unless you write one. Say how running copy stays readable on the
worst ground your own rules can produce.

### Two checks to run on the five rules together

**Do any two rules contradict each other?** Three transfers broke here rather
than on any single rule: an ink-doubling emphasis remedy made inert by a
one-colour palette rule, a responsive clause promising a cure its own
crop-not-scale mandate forbids, a topology rule banning off-screen arrival while
also mandating a clear margin, leaving nowhere legal for navigation. Read the
five as a set and look for a rule whose remedy another rule removes.

**Does any rule name foreign media?** The clause that repeatedly produced the
strongest rule in a world was an explicit statement about media the identity did
not choose. Three transfers named Palette/material as the rule that travelled
best, every time for that reason: "it is the only rule written with foreign
content in mind, and it paid off twice."

### Where the failures cluster

Controls/state was named the strongest rule in four of seven judged transfers,
because printed marks and binary-state mechanisms are indifferent to content.
That is the plurality, not a law: the other three named Topology and
Palette/material. Failures cluster in Type/composition and Topology/navigation,
so give those two slots the hardest version of every test above.`;

const OUTPUT_SHAPE = `## What to return

One JSON object. No prose around it.

  id            kebab-case, prefixed with the wave key
  familyId      medium-native for a digital-native world
  form          one sentence naming the artifact and its structural signature
  lineage       the real tradition it inherits from, named and dated
  spark         one concrete image, a thing you could photograph
  system        exactly five strings, EACH AT MOST 180 CHARACTERS, prefixed in
                this order. The limit is enforced by the catalog validator and
                it is not negotiable: across the existing 531 worlds the median
                rule is 138 characters. A rule is a law, not an essay, and these
                strings are injected verbatim into image prompts, so a paragraph
                swamps the prompt it is meant to steer. Say the mechanism and
                stop. Your reasoning, your legibility numbers, your emphasis
                argument and your cross-checks go in your REPORT, not in here.
                  Palette/material:
                  Type/composition:
                  Topology/navigation:
                  Controls/state:
                  Responsive/motion:
  webLeverage   a buildable commitment, the technique a build must implement
  strength      "world" or "dual". Never "composition": the review tool refuses
                to approve a world-catalog entry at composition strength, and
                every entry left there in one round was rejected. "dual" claims
                the idea also works as a staging, so earn it or say "world".
  tags          EXACTLY three structural tags. The validator enforces three,
                not two and not four.
  axes          the drawn axis values below, verbatim, as an object

The axes field is not optional. An assignment that is not recorded is lost the
moment the world lands, and the coverage map silently reverts to guessing from
prose.`;

// Without replacement, deliberately. Drawing each brief's tradition independently
// put two boxed-software manuals in one wave of ten, and both reached for a
// colour tab rail. With 36 traditions and 10 draws a collision is the likely
// outcome rather than bad luck, which is the birthday problem and not a reason
// to reroll the key. A wave shuffles the deck once and deals off the top, so two
// briefs in a wave can never share a tradition.
function pickModeValue(axis, index) {
  const values = [...axis.values];
  // Fisher-Yates, seeded from the wave key so the shuffle is reproducible.
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(unit(key, 'shuffle', axis.id, i) * (i + 1)) % (i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values[index % values.length];
}

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
    // A mode deck supplies its own surface, so the company deck's would be a
    // second, conflicting answer to the same question.
    const company = modeDeck ? brief.company.filter(line => line.axis !== 'surface') : brief.company;
    const pad = Math.max(...company.map(line => line.label.length));
    for (const line of company) {
      lines.push(`  ${line.label.padEnd(pad)}  ${line.value}`);
    }
    lines.push('');
  }

  if (modeDeck) {
    lines.push('## The reading tradition');
    lines.push('');
    lines.push('Drawn, not chosen. Author this tradition at its canonical peak, and author the');
    lines.push('page rather than the cover.');
    lines.push('');
    const mpad = Math.max(...modeDeck.axes.map(axis => axis.label.length));
    for (const axis of modeDeck.axes) {
      lines.push(`  ${axis.label.padEnd(mpad)}  ${pickModeValue(axis, brief.index)}`);
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
  lines.push(PALETTE_CLAUSE);
  if (modeDeck?.bar) { lines.push(''); lines.push(modeDeck.bar); }
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

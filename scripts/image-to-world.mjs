#!/usr/bin/env node
// Derives a catalog entry from a generated world image.
//
// For a site-derived world the image is the artifact and the prose is a
// description of it, which is the opposite of every other path here. That order
// matters: two attempts to write rules first and render from them produced
// designs that looked nothing like the page they came from, because a palette
// and a shape language do not survive being described.
//
// The rules still have to exist. The challenger draw deals worlds into builds as
// text, so a world with no rules cannot be used, however good its picture is.
//
//   node scripts/image-to-world.mjs --name mindmarket --id seed-library
//   node scripts/image-to-world.mjs --name mindmarket --id x --notes "scroll swells the green lobe; chip crosses its capsule on hover"
//
// Pass --notes with whatever the observation pass found. A screenshot is silent
// about motion, so Responsive/motion is the one rule the image cannot supply and
// the one most likely to be invented if nothing is given.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { validateConceptEntry } from '../skill/scripts/lib/concept-catalog.mjs';

const ROOT = process.cwd();
for (const line of readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const name = flag('name', null);
const id = flag('id', null);
const notes = flag('notes', '');
const motionDir = flag('motion-dir', null);
const family = flag('family', 'digital-design-canon');
const source = flag('source', '');
const model = flag('model', 'claude-opus-5');
const dir = flag('dir', path.join(ROOT, '.waves', 'site-worlds'));

if (!name || !id) {
  process.stderr.write('usage: image-to-world.mjs --name <slug> --id <concept-id> [--notes "..."] [--source <url>]\n');
  process.exit(1);
}

const worldImage = path.join(dir, name, 'world.webp');
if (!existsSync(worldImage)) {
  process.stderr.write(`no image at ${path.relative(ROOT, worldImage)}. Run site-to-world-image.mjs first.\n`);
  process.exit(1);
}
const refs = readdirSync(path.join(dir, name)).filter(f => f.startsWith('ref-')).slice(0, 2)
  .map(f => path.join(dir, name, f));

const catalog = JSON.parse(readFileSync(path.join(ROOT, 'catalog', 'concept-ingredients.json'), 'utf8'));
const families = (catalog.families || []).map(f => f.id);
const axes = JSON.parse(readFileSync(path.join(ROOT, 'catalog', 'aesthetic-axes.json'), 'utf8'));
const axisMenu = (axes.axes || []).map(a => `  ${a.id}: ${(a.values || []).map(v => v.id).join(' | ')}`).join('\n');

const SCHEMA = {
  type: 'object',
  required: ['id', 'familyId', 'form', 'lineage', 'spark', 'system', 'webLeverage', 'strength', 'tags', 'axes', 'avoid'],
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    familyId: { type: 'string', enum: families },
    form: { type: 'string', minLength: 40, maxLength: 360 },
    lineage: { type: 'string', minLength: 12, maxLength: 200 },
    spark: { type: 'string', minLength: 80, maxLength: 320 },
    system: { type: 'array', items: { type: 'string', minLength: 12, maxLength: 180 } },
    webLeverage: { type: 'string', minLength: 20, maxLength: 240 },
    strength: { type: 'string', enum: ['world', 'dual'] },
    tags: { type: 'array', items: { type: 'string' } },
    avoid: { type: 'array', items: { type: 'string', minLength: 12, maxLength: 160 } },
    axes: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries((axes.axes || []).map(a => [a.id, { type: 'string' }])),
    },
  },
};

const block = file => ({
  type: 'image',
  source: { type: 'base64', media_type: 'image/webp', data: readFileSync(file).toString('base64') },
});
const pngBlock = file => ({
  type: 'image',
  source: { type: 'base64', media_type: 'image/png', data: readFileSync(file).toString('base64') },
});

const anthropic = new Anthropic();

const SYSTEM = `You write catalog entries for a library of visual worlds. You are given an image of a design and you describe the system it embodies. The image is authoritative: every rule must be true of what you can see in it.

The five system rules are laws a builder applies to a different surface, each at most 180 characters, prefixed exactly:
  Palette/material:  Type/composition:  Topology/navigation:  Controls/state:  Responsive/motion:

Name real values. Read the hues off the image and give hex. Name the type voice, the weights actually used, the radii, the spacing. A rule that says "a warm palette" is worthless; a rule that says "#8ED462 land on #F5F1E4 ground, ink #2C2E2A, never pure black" can be built from.

Do not describe the subject matter. A world is a system, not a page about seeds. The entry must dress a completely different product.

Responsive/motion is the one rule you are asked to DESIGN rather than read off. Any measurements you are given come from the source page, and the world in front of you is not that page: it will contain things the source never had. Use the measurements for register only, meaning how fast this family moves, how far, how restrained, what easing it favours, whether it moves continuously or in discrete steps. Then look at what is actually in the world image and decide what motion its own composition earns.

Name the elements you can see and say what they do. If three photographic tiles sit at different depths, they parallax at different rates and you say which and how much. If a drawn object is held or suspended, it can sway before anything is scrolled. If a strip or a track runs across the frame, something can travel along it. A rule that would fit any page has failed; a rule that could only have been written for this one, at the source's tempo, is the target.

This rule is also the one that runs over length, every time, because there is more to say about it than fits. Pick the two or three motions that matter and drop the rest. Name them in the shortest form that still carries the numbers: "3 photo tiles parallax 0.8/1.0/1.2x; film strip sways 2deg/6s idle" is a law, and the sentence explaining why is not.

Record the aesthetic axes you can see, choosing from:
${axisMenu}

Also give two or three "avoid" lines: the slop this world in particular is at risk of. Not general advice.

EXACT COUNTS, all enforced and all rejected if wrong. The schema cannot express
these, so they are on you:
  system: EXACTLY 5 strings, in the prefix order above. HARD LIMIT 180 characters
          each, and aim for 130 to 160. Runs at this task consistently land near
          200 and get rejected, so write short and stop. A rule is a law, not a
          paragraph: name the values and the mechanism, drop the justification.
  tags:   EXACTLY 3 short kebab-case strings
  avoid:  2 or 3 strings, each 12 to 160 characters
  form:   40 to 360 characters and must contain a comma
  lineage: 12 to 200    spark: 80 to 320    webLeverage: 20 to 240

Count them before you answer. Five rules, three tags. Not four rules, not four
tags.`;

// The source screenshots come first and are the authority on values. Deriving
// hues from our own generated image bakes its drift in as truth: one run read
// #82CC5C off an approximation of a page whose ground is #8ED462, and every
// render from that entry would have inherited the error with nothing pointing
// back at the original.
const content = [];
if (refs.length) {
  content.push({ type: 'text', text: 'These are screenshots of the REAL SOURCE PAGE. They are authoritative for every value you name: hues, type, weights, radii, spacing. Sample from these.' });
  for (const ref of refs) content.push(pngBlock(ref));
  content.push({ type: 'text', text: 'This is the world derived from that source, and it is what the entry describes. Take its subject and composition from here, and its values from the screenshots above. Where the two disagree on a colour, the source is correct.' });
} else {
  content.push({ type: 'text', text: 'This is the world. Describe the system it embodies.' });
}
content.push(block(worldImage));

// Motion evidence, measured off the live source by observe-motion.mjs. This is
// the one rule the image cannot supply and the one most likely to be invented,
// so it is given as facts rather than prose: real durations, real easing curves,
// and a count of what actually moved when the page was scrolled.
//
// The rule still describes THIS world rather than the source. The source's
// numbers say how fast and how much its family moves; the entry says what that
// grammar becomes on a different product.
const motionEvidence = (() => {
  if (!motionDir) return null;
  const file = path.join(motionDir, 'motion.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
})();

if (motionEvidence?.kind === 'video' && motionEvidence.video) {
  // Frames in time order from the designer's own capture. This is the only
  // motion record that exists for a site that has gone offline, and it is a
  // better one than a scroll probe: the person who built the page chose what to
  // record, so the frames show the moments they thought were worth showing.
  content.push({ type: 'text', text: `MOTION, SAMPLED FROM THE DESIGNER'S OWN VIDEO of the live source, since the site itself is gone. The frames below run in time order. Read them as motion: what has moved between one and the next, what is entering, what is holding still, whether things travel together or in sequence, and how far anything gets in the time shown. That gives you the register. Then apply it to what is in the world image, which contains elements the source never had.` });
  for (const frame of motionEvidence.video.frames.slice(0, 6)) {
    if (!existsSync(path.join(ROOT, frame.file))) continue;
    content.push({ type: 'text', text: `clip ${frame.clip} at ${frame.at}s` });
    content.push(pngBlock(path.join(ROOT, frame.file)));
  }
} else if (motionEvidence?.reachable) {
  const d = motionEvidence.declared || {};
  const s = motionEvidence.scrollLinked || {};
  const lines = [
    d.transitions?.length ? `Declared transitions: ${d.transitions.map(t => `${t.spec} (on ${t.count} elements)`).join('; ')}` : '',
    d.animations?.length ? `Declared animations: ${d.animations.map(a => `${a.spec} (on ${a.count})`).join('; ')}` : '',
    d.libraries?.length ? `Animation libraries present: ${d.libraries.join(', ')}` : '',
    typeof d.stickyOrFixed === 'number' ? `${d.stickyOrFixed} sticky or fixed elements, will-change on ${d.willChange}` : '',
    s.sampled ? `Scrolling ${s.step}px moved ${s.moved} of ${s.sampled} sampled elements, changed opacity on ${s.faded}, and ${s.parallax} moved at a rate other than the scroll, which is parallax.` : '',
    d.scrollBehaviour && d.scrollBehaviour !== 'auto' ? `scroll-behavior is ${d.scrollBehaviour}` : '',
  ].filter(Boolean);
  content.push({ type: 'text', text: `MEASURED ON THE LIVE SOURCE. These are facts read off the running page, not impressions. They tell you the REGISTER this family moves in: its tempo, its easing, how much moves at once, and whether it is restrained or continuous. Borrow the numbers, then apply them to what is actually in the world image, which contains elements the source never had. Do not transcribe the source's motion; design this world's, at the source's speed.\n${lines.join('\n')}` });

  // The strip shows what those numbers look like: what is pinned, what enters,
  // what the page does with distance. Two frames is enough to read a habit.
  for (const frame of (motionEvidence.strip || []).slice(1, 3)) {
    if (existsSync(path.join(ROOT, frame.file))) {
      content.push({ type: 'text', text: `The live source at scroll offset ${frame.y}px.` });
      content.push(pngBlock(path.join(ROOT, frame.file)));
    }
  }
} else if (motionEvidence && !motionEvidence.reachable) {
  content.push({ type: 'text', text: 'The live source no longer responds, so no motion could be observed. Keep Responsive/motion to what the image implies and invent no specifics: an honest gap is better than a plausible fabrication.' });
}

// Lineage names the tradition, never the page. A world derived from a real site
// is the same act as a designer carrying an influence into new work, and the
// output is defensible on exactly those terms; naming the studio it came from
// turns a tradition into an accusation and invites a reading of the work that
// its content does not support. Which page a world came from is still recorded,
// in catalog/site-queue.json, which is never served.
content.push({ type: 'text', text: `Use id "${id}" and familyId "${family}".

Lineage names the tradition, era, movement or craft this world belongs to: "poster-era Swiss caps meeting bottled-soda advertising", "1970s airline timetable typography", "Memphis-adjacent flat geometry". It must NOT name the specific website, studio, brand or domain that inspired it, and must contain no URL. Write what a design historian would write about the family, not where you saw it.
${notes ? `\nAlso observed by hand:\n${notes}` : ''}${!notes && !motionEvidence ? '\nNo motion was observed. Keep Responsive/motion to what the image implies and do not invent specifics.' : ''}` });

let feedback = '';
let concept = null;
// Five rather than three. The length limit is the only thing these runs fail on
// and they converge on it rather than thrashing: 239 characters, then 184, then
// 179. Three attempts stopped one short of a valid entry more than once.
for (let attempt = 1; attempt <= 5 && !concept; attempt += 1) {
  const response = await anthropic.messages.stream({
    model,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: feedback ? [...content, { type: 'text', text: feedback }] : content }],
  }).finalMessage();
  if (response.stop_reason === 'max_tokens') {
    feedback = '\nYour last reply was truncated. Be more concise.';
    process.stderr.write(`  attempt ${attempt}: truncated at max_tokens\n`);
    continue;
  }
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try {
    const parsed = JSON.parse(text);
    const errors = validateConceptEntry(parsed, {});
    // Enforced rather than requested. The instruction above is a sentence in a
    // long prompt and the model has every reason to be helpful about provenance;
    // this is the part that has to hold. Checked across the whole entry, not
    // just lineage, because a brand name is no better inside form or spark,
    // and those two ARE served.
    const host = source ? new URL(source).hostname.replace(/^www\./, '') : '';
    const brand = host ? host.split('.')[0].replace(/[^a-z0-9]/gi, '') : '';
    const naming = ['lineage', 'form', 'spark', 'webLeverage']
      .filter(field => {
        const value = String(parsed[field] || '');
        if (/https?:\/\/|\b[a-z0-9-]+\.(com|net|org|io|co|studio|design|fr|jp|nl|pt|it|ca|dev)\b/i.test(value)) return true;
        return brand.length > 3 && new RegExp(`\\b${brand}\\b`, 'i').test(value);
      });
    if (naming.length) {
      errors.push(`${naming.join(' and ')} names the source site or a domain. Lineage names the tradition, era or craft, never the page it came from, and no served field may name it either.`);
    }
    if (errors.length) {
      // The validator's message for the rules is generic. Say which rule and how
      // long it actually is, because "exactly five rules of 12 to 180" does not
      // tell a model that its third rule is 214 characters.
      // Naming only the offenders and the exact overshoot. Listing all five
      // lengths made the model shorten the ones that already fit, which is how
      // a run could oscillate for three attempts without converging.
      const over = (parsed.system || [])
        .map((rule, i) => ({ i: i + 1, len: rule.length }))
        .filter(rule => rule.len > 180);
      const detail = over.length
        ? `over the limit: ${over.map(r => `rule ${r.i} by ${r.len - 180} chars`).join(', ')}. Cut only those; the others are fine as they are.`
        : (parsed.system || []).map((rule, i) => `rule ${i + 1} is ${rule.length} chars`).join(', ');
      feedback = `\nFix exactly these and return the whole object again:\n${errors.join('\n')}\n${detail}`;
      process.stderr.write(`  attempt ${attempt}: ${errors.length} problem(s); ${detail.slice(0, 120)}\n`);
      continue;
    }
    concept = parsed;
  } catch (error) {
    feedback = `\nThat was not valid JSON: ${error.message}`;
    process.stderr.write(`  attempt ${attempt}: ${error.message.slice(0, 200)}\n`);
  }
}

if (!concept) { process.stderr.write('could not produce a valid entry after 3 attempts\n'); process.exit(1); }

const out = path.join(dir, name, 'concept.json');
writeFileSync(out, `${JSON.stringify([concept], null, 1)}\n`);
process.stdout.write(`${concept.form.split(/[:,]/)[0]}\n\n`);
for (const rule of concept.system) process.stdout.write(`  ${rule}\n`);
process.stdout.write(`\naxes: ${JSON.stringify(concept.axes)}\n`);
process.stdout.write(`\n${path.relative(ROOT, out)}\n`);
process.stdout.write('Merge with: node scripts/wave-merge.mjs --candidates <that file> --write\n');
process.stdout.write('Then install the generated image as the hero rather than re-rendering it.\n');

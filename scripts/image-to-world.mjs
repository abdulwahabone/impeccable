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
import sharp from 'sharp';
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

// Two mechanical readings of "this describes a page rather than naming a world".
// Both are narrow and both are advisory. Checked against the whole catalog they
// flag all five entries derived from site images so far, and three real worlds
// in 566, every one of those for containing the word headline. A hard gate at
// that error rate would eventually refuse a good world forever; one pass to
// argue costs a round trip and cannot.
const PAGE_GENRE = /^(?:an?|the)\s+(?:[a-z0-9-]+[\s-]+){0,4}?(?:landing|marketing|homepage|web ?page|web ?site|site|layout|viewport|dashboard|template)\b/i;
const PAGE_FURNITURE = /\b(?:headlines?|nav|navbar|navigation|hero|the fold|sidebar|carousel|sticky|viewports?|breakpoints?|ctas?)\b/i;
const FURNITURE = /\b(?:headlines?|nav|navbar|navigation|hero|fold|cards?|columns?|sidebar|footer|header|buttons?|ctas?|viewports?|breakpoints?|margins?|gutters?|carousel|sticky)\b/gi;
const namesAPage = form => {
  const value = String(form || '');
  if (PAGE_GENRE.test(value)) return true;
  const nouns = new Set((value.match(FURNITURE) || []).map(word => word.toLowerCase()));
  return nouns.size >= 2 && PAGE_FURNITURE.test(value);
};

// Sample forms from the shelf this entry is joining, shown rather than
// characterised. Register does not survive being described: every other world
// in this catalog was authored from a tradition, this one is read off a picture
// of a page, and a model shown a landing page writes a landing page unless it
// can hear how the other 566 sound.
//
// Twelve at a time, one per family, rotated by the site slug. A fixed example in
// a prompt is not an example, it is the answer: an earlier prompt here described
// one device and nine of twelve outputs reproduced it. Twelve entries this
// unlike each other cannot collapse into a default, and a set that changes per
// candidate cannot become a house style. Seeded off name rather than id, because
// derive-kept passes a placeholder id for every candidate in a batch.
const reviews = JSON.parse(readFileSync(path.join(ROOT, 'catalog', 'concept-reviews.json'), 'utf8')).reviews || {};
const exemplars = (() => {
  const byFamily = new Map();
  for (const family of catalog.families || []) {
    for (const concept of family.concepts || []) {
      const review = reviews[concept.id];
      if (review?.status !== 'approved' || review.rating !== 3) continue;
      if (namesAPage(concept.form)) continue;
      if (!byFamily.has(family.id)) byFamily.set(family.id, []);
      byFamily.get(family.id).push(concept.form);
    }
  }
  const families = [...byFamily.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (!families.length) return [];
  const seed = [...name].reduce((total, ch) => total + ch.charCodeAt(0), 0);
  return Array.from({ length: Math.min(12, families.length) }, (_, index) => {
    const [, forms] = families[(seed + index) % families.length];
    return forms[(seed + index) % forms.length];
  });
})();

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

// Every attachment is downscaled before it is sent. An awwwards entry supplies
// up to eight reference frames at 2048px, and with the world image and the
// motion frames alongside them the request exceeded the API's size limit and
// the derivation died: monopo-paris failed on request_too_large. 1400px is more
// than enough to read a layout, a palette and a type voice, which is all these
// are for, and webp costs a fraction of the PNGs coming off the capture.
const MAX_WIDTH = 1400;
async function block(file) {
  const data = await sharp(file).resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 82 }).toBuffer();
  return { type: 'image', source: { type: 'base64', media_type: 'image/webp', data: data.toString('base64') } };
}
const pngBlock = block;

const anthropic = new Anthropic();

const SYSTEM = `You write catalog entries for a library of visual worlds. You are given an image of a design and you describe the system it embodies. The image is authoritative: every rule must be true of what you can see in it.

The five system rules are laws a builder applies to a different surface, each at most 180 characters, prefixed exactly:
  Palette/material:  Type/composition:  Topology/navigation:  Controls/state:  Responsive/motion:

Name real values. Read the hues off the image and give hex. Name the type voice, the weights actually used, the radii, the spacing. A rule that says "a warm palette" is worthless; a rule that says "#8ED462 land on #F5F1E4 ground, ink #2C2E2A, never pure black" can be built from.

Palette/material must also say WHAT THE PICTURES ARE MADE OF, because that is material and there is no other rule for it. Say how imagery is made and rendered: photographed or drawn or built, in what medium, with what surface, at what level of finish, and what it depicts in the abstract. None of the five prefixes says "imagery", so this is the one that has to carry it, and when it does not the whole craft of the page goes unrecorded: an entry whose art is the reason the page works described it as "art full-bleed beneath" and nothing else, and a builder given those rules cannot arrive anywhere near it.

The test for the five rules together is reconstruction. Someone who has never seen this image, holding only your rules, should be able to build a page a viewer would file as the same world. If your rules could equally describe a different-looking page, they are not yet the world. Spend the characters where the page spends its effort.

Do not describe the subject matter. A world is a system, not a page about seeds. The entry must dress a completely different product.

The form line names the world, not the page. You are looking at a designed surface and this is a library of worlds, so the entry has to make that step: find the tradition the design already belongs to, name that tradition's artifact or scene, and let the clause after the comma carry the structure you can see in the image. Sample forms from the catalog follow; take their register and none of their content. A form that opens by naming a page, a site, a landing surface or a layout has not made the step, and neither has one that reads as an inventory of headlines, cards, columns and folds.

The tradition has to be one the image supports. If the picture earns nothing richer than a flat sheet with type on it, write that. A thin honest form beats an invented heritage, and the five rules are read off the image either way.

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
  form:   40 to 360 characters, must contain a comma, opens lower-case like the samples
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
  for (const ref of refs) content.push(await pngBlock(ref));
  content.push({ type: 'text', text: 'This is the world derived from that source, and it is what the entry describes. Take its subject and composition from here, and its values from the screenshots above. Where the two disagree on a colour, the source is correct.' });
} else {
  content.push({ type: 'text', text: 'This is the world. Describe the system it embodies.' });
}
content.push(await block(worldImage));

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
    content.push(await pngBlock(path.join(ROOT, frame.file)));
  }
} else if (motionEvidence?.reachable) {
  const d = motionEvidence.declared || {};
  const s = motionEvidence.scrollLinked || {};
  const lines = [
    d.transitions?.length ? `Declared transitions: ${d.transitions.map(t => `${t.spec} (on ${t.count} elements)`).join('; ')}` : '',
    d.animations?.length ? `Declared animations: ${d.animations.map(a => `${a.spec} (on ${a.count})`).join('; ')}` : '',
    d.libraries?.length ? `Animation libraries present: ${d.libraries.join(', ')}` : '',
    typeof d.stickyOrFixed === 'number' ? `${d.stickyOrFixed} sticky or fixed elements, will-change on ${d.willChange}` : '',
    // Cursor-driven work is invisible to CSS and is often the most distinctive
    // thing a page does. It gets its own line so it cannot be skimmed past.
    d.pointer?.move ? `POINTER: ${d.pointer.move} pointermove listeners and ${d.pointer.enterLeave} enter/leave handlers${d.pointer.canvases ? `, ${d.pointer.canvases} canvas${d.pointer.webgl ? ' using WebGL' : ''}` : ''}. This page answers the cursor, not just hovers.` : '',
    motionEvidence.sweeps?.length > 1
      ? `Sweeping the cursor across a section changed ${motionEvidence.sweeps.slice(1).map(s => `${s.changedPercent}%`).join(', then ')} of the frame between steps, against 0% when nothing moves. ${motionEvidence.sweeps[motionEvidence.sweeps.length - 1].changedPercent > motionEvidence.sweeps[1].changedPercent * 1.5 ? 'The figure rises along the sweep, which is what an accumulating trail looks like rather than one element tracking the pointer.' : 'The figure is steady, which reads as elements reacting locally to the pointer rather than a trail.'}`
      : '',
    s.sampled ? `Scrolling ${s.step}px moved ${s.moved} of ${s.sampled} sampled elements, changed opacity on ${s.faded}, and ${s.parallax} moved at a rate other than the scroll, which is parallax.` : '',
    d.scrollBehaviour && d.scrollBehaviour !== 'auto' ? `scroll-behavior is ${d.scrollBehaviour}` : '',
  ].filter(Boolean);
  content.push({ type: 'text', text: `MEASURED ON THE LIVE SOURCE. These are facts read off the running page, not impressions. They tell you the REGISTER this family moves in: its tempo, its easing, how much moves at once, and whether it is restrained or continuous. Borrow the numbers, then apply them to what is actually in the world image, which contains elements the source never had. Do not transcribe the source's motion; design this world's, at the source's speed.\n${lines.join('\n')}` });

  // The strip shows what those numbers look like: what is pinned, what enters,
  // what the page does with distance. Two frames is enough to read a habit.
  for (const frame of (motionEvidence.strip || []).slice(1, 3)) {
    if (existsSync(path.join(ROOT, frame.file))) {
      content.push({ type: 'text', text: `The live source at scroll offset ${frame.y}px.` });
      content.push(await pngBlock(path.join(ROOT, frame.file)));
    }
  }
  // Two frames from the sweep, far enough apart that whatever the cursor drags
  // along with it has had room to show.
  const sweep = motionEvidence.sweeps || [];
  for (const frame of [sweep[1], sweep[sweep.length - 1]].filter(Boolean)) {
    if (existsSync(path.join(ROOT, frame.file))) {
      content.push({ type: 'text', text: `The same section with the cursor at x=${frame.x}, mid-sweep.` });
      content.push(await pngBlock(path.join(ROOT, frame.file)));
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
if (exemplars.length) {
  content.push({ type: 'text', text: `HOW THIS CATALOG'S OWN FORM LINES READ, sampled from its highest-rated entries. This is the shelf your entry joins. Take the register and none of the content: not one of their nouns is available to you, and every noun in yours has to be something you can point at in the image.\n\n${exemplars.map(form => `- ${form}`).join('\n')}` });
}

content.push({ type: 'text', text: `Use id "${id}" and familyId "${family}".

Lineage names the tradition, era, movement or craft this world belongs to: "poster-era Swiss caps meeting bottled-soda advertising", "1970s airline timetable typography", "Memphis-adjacent flat geometry". It must NOT name the specific website, studio, brand or domain that inspired it, and must contain no URL. Write what a design historian would write about the family, not where you saw it.
${notes ? `\nAlso observed by hand:\n${notes}` : ''}${!notes && !motionEvidence ? '\nNo motion was observed. Keep Responsive/motion to what the image implies and do not invent specifics.' : ''}` });

let concept = null;
// The retry is a conversation now. Attempts two onward used to re-send the first
// turn with a note appended and no assistant turn at all, so the model was told
// rule 3 ran 21 characters over an entry it could not see, and had to write five
// new rules to act on that. It landed near 200 again. The lengths in the old
// logs, 239 then 184 then 179, are not a model converging; they are independent
// samples, and the comment claiming otherwise was wrong. Echoing its own reply
// back turns "cut 21 characters" into an edit rather than a redraft.
//
// Only the last exchange is kept. The whole history would carry every earlier
// wrong answer forward alongside the images.
//
// Worth knowing: SCHEMA's minLength and maxLength are silently dropped, because
// structured outputs do not support string-length constraints and this passes a
// raw schema rather than going through the SDK's Zod helper. The counts in the
// system prompt and validateConceptEntry are the only things enforcing them.
const turns = [];
let registerNudged = false;
for (let attempt = 1; attempt <= 5 && !concept; attempt += 1) {
  const response = await anthropic.messages.stream({
    model,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content }, ...turns],
  }).finalMessage();
  if (response.stop_reason === 'max_tokens') {
    turns.length = 0;
    turns.push({ role: 'user', content: 'Your last reply was cut off before it finished. Write shorter fields, the five rules above all, and return the whole object in one pass.' });
    process.stderr.write(`  attempt ${attempt}: truncated at max_tokens\n`);
    continue;
  }
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  // Echoed as received rather than rebuilt from the text, so thinking blocks
  // travel back untouched.
  const reply = { role: 'assistant', content: response.content };
  try {
    const parsed = JSON.parse(text);
    const errors = validateConceptEntry(parsed, {});
    // Enforced rather than requested. The instruction is one sentence in a long
    // prompt and the model has every reason to be helpful about provenance.
    // Checked across the whole entry, because a brand name is no better inside
    // form or spark, and those two ARE served by the roll API.
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
    // Register, asked once. namesAPage is right about every site-derived entry
    // so far and wrong about roughly three worlds in 566, so it gets one pass
    // and then stands down rather than blocking a good form for containing the
    // word headline.
    if (!registerNudged && namesAPage(parsed.form)) {
      registerNudged = true;
      errors.push('form describes a page instead of naming a world: it opens on a page or marketing genre, or it inventories headlines, cards, columns and folds. Name the tradition this design belongs to and that tradition\'s artifact or scene, in the register of the sample forms above, then let the clause after the comma carry the structure you can see. Change form only; every other field stands.');
    }
    if (errors.length) {
      // Quote the offenders back verbatim: the ask is then an edit to a specific
      // sentence rather than a target to hit blind.
      const over = (parsed.system || [])
        .map((rule, index) => ({ index: index + 1, rule }))
        .filter(entry => entry.rule.length > 180);
      const detail = over.length
        ? `${over.map(entry => `Rule ${entry.index} is ${entry.rule.length} characters, ${entry.rule.length - 180} too many. Here it is again:\n  ${entry.rule}`).join('\n')}\nShorten only these, to 170 or fewer, by cutting the weakest clause rather than rewriting the rule. The other rules are the right length; return them exactly as they are.`
        : (parsed.system || []).map((rule, index) => `rule ${index + 1} is ${rule.length} chars`).join(', ');
      turns.length = 0;
      turns.push(reply);
      turns.push({ role: 'user', content: `Fix exactly these in the object you just wrote and return the whole thing again:\n${errors.join('\n')}\n\n${detail}\n\nEverything not named above is accepted. Return it character for character.` });
      process.stderr.write(`  attempt ${attempt}: ${errors.length} problem(s); ${detail.slice(0, 120).replace(/\n/g, ' ')}\n`);
      continue;
    }
    concept = parsed;
  } catch (error) {
    turns.length = 0;
    turns.push(reply);
    turns.push({ role: 'user', content: `That was not valid JSON: ${error.message}. Return the same entry as a single valid JSON object.` });
    process.stderr.write(`  attempt ${attempt}: ${error.message.slice(0, 200)}\n`);
  }
}

if (!concept) { process.stderr.write('could not produce a valid entry after 5 attempts\n'); process.exit(1); }

const out = path.join(dir, name, 'concept.json');
writeFileSync(out, `${JSON.stringify([concept], null, 1)}\n`);
process.stdout.write(`${concept.form.split(/[:,]/)[0]}\n\n`);
for (const rule of concept.system) process.stdout.write(`  ${rule}\n`);
process.stdout.write(`\naxes: ${JSON.stringify(concept.axes)}\n`);
process.stdout.write(`\n${path.relative(ROOT, out)}\n`);
process.stdout.write('Merge with: node scripts/wave-merge.mjs --candidates <that file> --write\n');
process.stdout.write('Then install the generated image as the hero rather than re-rendering it.\n');

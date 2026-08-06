#!/usr/bin/env node
// Renders one world several times under different prompt variants, side by side.
//
// Prompt changes were being judged one render at a time, which cannot separate a
// better prompt from a luckier sample. This holds the world and the model fixed
// and varies only the instruction, so the comparison is about the sentence.
//
//   node scripts/hero-prompt-lab.mjs --concept busytown-cross-section
//   node scripts/hero-prompt-lab.mjs --concept x --variants baseline,viewport,air
//
// Variants are additive suffixes to the shipped hero prompt, so "baseline" is
// exactly what generate-world-cards.mjs sends today.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { buildHeroPrompt } from './lib/card-prompts.mjs';

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
const conceptArg = flag('concept', null);
const only = (flag('variants', '') || '').split(',').filter(Boolean);
const outDir = flag('out', path.join(ROOT, '.waves', 'prompt-lab'));
// One sample per cell can only detect an effect large enough to survive a single
// draw. "viewport" was that large and shipped; "air" and "scene" were good on one
// world and odd on another, which is exactly what noise looks like.
const samples = Number(flag('samples', 1));

// Each variant is a paragraph appended to the shipped prompt. They are separate
// rather than combined so a result can be attributed to one sentence.
// Tested 2026-08-05 across three worlds, one sample each. Only "viewport"
// improved all three and it has shipped, so baseline now contains it.
//
// Dropped, and worth not retrying blind: "focus" (one thing must dominate) and
// "audience" (design at a specific reader) changed nothing in any of the three.
// "align" (hold the shared edges) made two of three stranger and more crowded.
// "air" and "scene" were then run at n=3 on the same three worlds, eighteen
// renders, and neither survived. The reviewer's verdict: no big effects, scene
// very occasionally works and the effect is lumpy at best. So neither ships.
//
// The wider result is that prompt tuning here is close to exhausted. One sentence
// mattered, six did not, and the six included every plausible idea about focus,
// audience, spacing, alignment and grid avoidance. An instruction whose benefit
// needs many samples to detect would not reliably improve any single card either,
// so the next gain is unlikely to come from another paragraph.
const VARIANTS = {
  baseline: '',

  viewport: `
This image is the FIRST VIEWPORT of a much longer page, not the whole page. It is the top ~900 pixels of something that continues well below the fold. So: no footer, no closing section, no full site map, no complete feature set. Whatever is at the bottom edge of the frame should be cut off mid-element, the way a real screenshot of a page top is cut off, because more of it exists below.`,

  focus: `
This image is the FIRST VIEWPORT of a much longer page: no footer, and the bottom edge cuts through content that continues below.

It also has to work as a landing page. One thing matters most on this screen, and a stranger should know what this product is and what to do next within a few seconds. Give that one thing real dominance and let everything else be quieter. Do not distribute attention evenly across four equal panels.`,

  audience: `
This image is the FIRST VIEWPORT of a much longer page: no footer, and the bottom edge cuts through content that continues below.

Decide who this page is for and design at them specifically. A page for a professional buyer, a hobbyist, a child's parent and a civic user do not look alike, and the difference should show in what is said first, how much is explained, and what the page assumes the reader already knows.`,

  air: `
This image is the FIRST VIEWPORT of a much longer page: no footer, and the bottom edge cuts through content that continues below.

Give elements room. Nothing should sit closer to its neighbour than the design intends: a heading and the control under it need a clear gap, adjacent blocks need a visible channel between them, and no two pieces of text should read as one crowded lump. Crowding reads as unfinished even when every part is well drawn.`,

  align: `
This image is the FIRST VIEWPORT of a much longer page: no footer, and the bottom edge cuts through content that continues below.

Hold the alignments. Anything meant to share an edge shares it exactly: the wordmark and the first line of content, the left edge of a heading and the left edge of the text under it, the tops of things placed side by side. Small misalignments are the difference between a page that looks composed and one that looks approximate.`,

  scene: `
This image is the FIRST VIEWPORT of a much longer page: no footer, and the bottom edge cuts through content that continues below.

Resist the panel grid. A first view divided into equal rectangles is the default arrangement and this world has its own. Prefer one dominant field, or a continuous scene, or an asymmetric split that the world's topology rule actually calls for, over a bento of tiles.`,
};

if (!conceptArg) {
  process.stderr.write(`usage: hero-prompt-lab.mjs --concept <id-or-fragment> [--variants ${Object.keys(VARIANTS).join(',')}]\n`);
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(path.join(ROOT, 'catalog', 'concept-ingredients.json'), 'utf8'));
let concept = null;
for (const family of catalog.families || []) {
  for (const entry of family.concepts || []) {
    if (entry.id === conceptArg || entry.id.includes(conceptArg)) concept = concept || entry;
  }
}
if (!concept) { process.stderr.write(`no concept matching "${conceptArg}"\n`); process.exit(1); }

const basePrompt = buildHeroPrompt(concept);

const names = only.length ? only : Object.keys(VARIANTS);
const dir = path.join(outDir, concept.id);
mkdirSync(dir, { recursive: true });
const boardPath = path.join(ROOT, 'site', 'public', 'worlds', 'cards', `${concept.id}.webp`);

process.stdout.write(`${concept.form.split(/[:,]/)[0]}\n${names.length} variants\n\n`);

async function render(job) {
  const { variant, sample } = job;
  const suffix = samples > 1 ? `-${sample + 1}` : '';
  const target = path.join(dir, `${variant}${suffix}.webp`);
  if (existsSync(target)) { process.stdout.write(`  cached  ${variant}${suffix}\n`); return; }
  const prompt = basePrompt + (VARIANTS[variant] || '');
  const form = new FormData();
  form.append('model', 'gpt-image-2');
  if (existsSync(boardPath)) {
    form.append('image[]', new Blob([readFileSync(boardPath)], { type: 'image/webp' }), 'board.webp');
    form.append('prompt', `The attached image is this world's design-system specimen board. Treat its palette, materials, type voices, and component grammar as binding reference. ${prompt}`);
  } else {
    form.append('prompt', prompt);
  }
  form.append('size', '2048x1152');
  form.append('quality', 'high');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form,
  });
  const json = await response.json();
  if (!response.ok) { process.stdout.write(`  FAILED  ${variant}${suffix}: ${(json.error?.message || '').slice(0, 80)}\n`); return; }
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) { process.stdout.write(`  FAILED  ${variant}${suffix}: no image\n`); return; }
  writeFileSync(target, await sharp(Buffer.from(b64, 'base64')).webp({ quality: 90 }).toBuffer());
  process.stdout.write(`  ok      ${variant}${suffix}\n`);
}

const queue = names.flatMap(variant => Array.from({ length: samples }, (_, sample) => ({ variant, sample })));
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) await render(queue.shift());
}));

writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify({
  id: concept.id, form: concept.form, topology: concept.system[2], variants: names, samples,
}, null, 1)}\n`);
process.stdout.write(`\n${path.relative(ROOT, dir)}\n`);

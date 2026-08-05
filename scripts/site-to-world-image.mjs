#!/usr/bin/env node
// Screenshot a real site, hand the screenshots to the image model, get a world
// back in the same visual family. Image to image, no words in between.
//
// This exists because the first two attempts routed a page through prose and
// lost it. An author looked at mindmarket.com, wrote five rules about it, and
// the renderer drew from the rules; the result was recognisably a different
// design both times. The description was the lossy step, and it was never
// necessary: generate-world-cards.mjs has used the images/edits endpoint all
// along to keep a hero faithful to its specimen board. The same mechanism keeps
// a world faithful to a page.
//
//   node scripts/site-to-world-image.mjs --url https://example.com --name thing
//   node scripts/site-to-world-image.mjs --url ... --scrolls 4 --subject "a seed library"
//
// What it does NOT solve, and the reason the observation pass still matters: a
// screenshot is silent about motion. It cannot see that a lobe swells as you
// scroll, that a chip crosses its capsule on hover, or that a preloader loops
// forever. Take the visual identity from here and the motion law from using the
// page.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

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
const url = flag('url', null);
const name = flag('name', null);
const scrolls = Number(flag('scrolls', 3));
const subject = flag('subject', null);
const outDir = flag('out', path.join(ROOT, '.waves', 'site-worlds'));

if (!url || !name) {
  process.stderr.write('usage: site-to-world-image.mjs --url <url> --name <slug> [--scrolls 3] [--subject "..."]\n');
  process.exit(1);
}

mkdirSync(path.join(outDir, name), { recursive: true });
const shotPath = i => path.join(outDir, name, `ref-${i}.png`);

// ---------------------------------------------------------------- capture
process.stdout.write(`capturing ${url}\n`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});

// Preloaders on sites like this can loop forever rather than ending, so waiting
// for them is waiting for nothing. Give the page a fixed budget, then remove
// anything that looks like an overlay gate and carry on.
await page.waitForTimeout(6000);
await page.evaluate(() => {
  for (const el of document.querySelectorAll('[class*="preload"],[class*="loader"],[id*="preload"],[id*="loader"]')) {
    el.remove();
  }
  document.documentElement.style.scrollBehavior = 'auto';
});
await page.waitForTimeout(1500);

const shots = [];
for (let i = 0; i < scrolls; i += 1) {
  await page.screenshot({ path: shotPath(i) });
  shots.push(shotPath(i));
  process.stdout.write(`  ref-${i}.png\n`);
  await page.evaluate(() => { window.scrollBy(0, window.innerHeight * 0.9); });
  await page.waitForTimeout(2500);
}
await browser.close();

// ---------------------------------------------------------------- reimagine
// The reference images carry the palette, the shape language, the type voice and
// the illustration idiom. The prompt only has to say what to change, which is
// the subject, and what not to, which is everything else.
const prompt = `The attached images are screenshots of one website. Study them as a visual system: its exact palette, its shape language and corner radii, its illustration idiom and how figures are drawn, its type voice and weight, its spacing, and how areas of colour relate to each other.

Now design a COMPLETELY DIFFERENT product's landing page in that same visual world${subject ? `: ${subject}` : ''}. Same palette, same shape language, same illustration idiom drawn in the same manner, same type voice. Different subject, different copy, different composition, different imagery content.

A person who knows the source should recognise the family immediately and never mistake this for the same site. Do not reuse its wordmark, its brand name, its copy, or its specific illustrations; invent new ones drawn in the same hand.

Render as a complete desktop landing page filling the whole 16:9 frame, as if screenshotted at 1440 wide: navigation, a hero with a headline and a call to action, and the top of the next section visible at the bottom edge. No browser chrome, no device mockup. Interface copy in English, plain punctuation, never an em dash.`;

process.stdout.write('\nreimagining\n');
const form = new FormData();
form.append('model', 'gpt-image-2');
for (const shot of shots) {
  form.append('image[]', new Blob([readFileSync(shot)], { type: 'image/png' }), path.basename(shot));
}
form.append('prompt', prompt);
form.append('size', '2048x1152');
form.append('quality', 'high');

const response = await fetch('https://api.openai.com/v1/images/edits', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: form,
});
const json = await response.json();
if (!response.ok) {
  process.stderr.write(`${json.error?.message || `HTTP ${response.status}`}\n`);
  process.exit(1);
}
const b64 = json.data?.[0]?.b64_json;
if (!b64) { process.stderr.write('no image returned\n'); process.exit(1); }

const outFile = path.join(outDir, name, 'world.webp');
writeFileSync(outFile, await sharp(Buffer.from(b64, 'base64')).webp({ quality: 90 }).toBuffer());
process.stdout.write(`\n${path.relative(ROOT, outFile)}\n`);
process.stdout.write('Reference shots are beside it. Judge the family resemblance first; if the image is\n');
process.stdout.write('right, the world text can be written from the image and the page rather than guessed.\n');

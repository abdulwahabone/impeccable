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
// for them is waiting for nothing. Give the page a fixed budget, then clear
// everything sitting between the camera and the design and carry on.
//
// Consent banners, geo-gates and promo modals are the failure that produced four
// unusable worlds in the 2026-08-07 batch: the model was handed a screenshot of
// a cookie bar and faithfully rebuilt a cookie bar. They are REMOVED rather than
// accepted. Clicking Accept would transmit a consent decision on the operator's
// behalf, which is not ours to give, and removing the node photographs the page
// without answering it.
await page.waitForTimeout(6000);
const removed = await page.evaluate(() => {
  const gone = [];
  const kill = (el, why) => { if (el && el.isConnected) { el.remove(); gone.push(why); } };

  for (const el of document.querySelectorAll('[class*="preload"],[class*="loader"],[id*="preload"],[id*="loader"]')) {
    kill(el, 'preloader');
  }

  // By name first: these are near-universal among consent vendors.
  const NAMED = '[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[id*="gdpr" i],[class*="gdpr" i],[aria-label*="cookie" i],[class*="cmp-" i],#onetrust-consent-sdk,#usercentrics-root,[id*="didomi" i],[class*="klaro" i]';
  for (const el of document.querySelectorAll(NAMED)) kill(el, 'consent');

  // Then by behaviour, which catches the unnamed ones: anything pinned over the
  // page, large enough to matter, whose text reads like a gate.
  const GATE = /\b(cookie|consent|privacy|accept all|reject all|manage preferences|are you over|enter site|do you still want|choose your (country|region)|select your (country|region))\b/i;
  for (const el of document.querySelectorAll('body *')) {
    if (!el.isConnected) continue;
    const style = getComputedStyle(el);
    if (style.position !== 'fixed' && style.position !== 'absolute') continue;
    const rect = el.getBoundingClientRect();
    const coverage = (rect.width * rect.height) / (window.innerWidth * window.innerHeight);
    if (coverage < 0.06 || coverage > 1.6) continue;
    if (GATE.test((el.textContent || '').slice(0, 400))) kill(el, 'gate');
  }

  // Scroll locks travel with the things just removed.
  for (const node of [document.documentElement, document.body]) {
    node.style.overflow = 'visible';
    node.style.position = 'static';
  }
  document.documentElement.style.scrollBehavior = 'auto';
  return gone;
});
if (removed.length) process.stdout.write(`  cleared ${removed.length} overlay(s): ${[...new Set(removed)].join(', ')}\n`);

// A splash gate is not a banner and cannot be removed: the page behind it has
// not been built yet. This one is entered rather than deleted, which is
// navigation and not a consent decision. Only an exact word is matched, so
// "Enter your email" cannot trigger it.
const gate = page.locator('a, button').filter({ hasText: /^\s*(enter|enter site|skip intro)\s*$/i }).first();
if (await gate.count().catch(() => 0)) {
  await gate.click({ timeout: 4000 }).catch(() => {});
  process.stdout.write('  entered a splash gate\n');
  await page.waitForTimeout(3500);
}

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
// The reference images carry the palette, the shape language, the type voice, the
// illustration idiom and the composition. The prompt only has to say what to
// change, which is the subject, and what not to, which is everything else.
//
// It used to also describe a hero: navigation, a headline, a call to action, the
// next section peeking in. That sentence came from the text-derived path, where
// nothing else specifies a layout, and here it overrode the references and
// produced a standard left-column-plus-right-picture hero against a source that
// fills its viewport with one monumental centred line. Prose beat the images
// because prose was the only thing making a claim about arrangement.
const prompt = `The attached images are screenshots of one website. Study them as a visual system: its exact palette, its shape language and corner radii, its illustration idiom and how figures are drawn, its type voice and weight, its spacing, and how areas of colour relate to each other.

Now design a COMPLETELY DIFFERENT product's landing page in that same visual world${subject ? `: ${subject}` : ''}. Different subject, different copy, different composition, different imagery content.

Keep these, and they are the parts that go missing if you are not told: the exact hues, sampled rather than approximated, with no colour introduced that is not already in the source. The illustration idiom in full, meaning the drawing hand AND its energy: if the source's figures are mid-action with exaggerated proportions and are cropped by the frame, yours are too, and if its props are scattered at several scales, yours are. Match how many figures appear and what they are doing. Match the density of loose elements around them. A single tidy centred vignette is a failure when the source is an ensemble in motion.

Also keep the type voice and weight, the corner radii, the way areas of colour meet, and the exact chrome grammar of nav, buttons and chips.

KEEP THE COMPOSITION. This is the one most easily lost, because a landing page has
a default shape and it is not this one. Read off the reference: is the headline
centred or ranged left? How much of the frame does it occupy? Does imagery sit
beside the text in a column, or enter from an edge behind and beneath it? Is there
a left text column at all? Reproduce that arrangement with your own content. If
the source fills the viewport with one monumental centred line and lets the
artwork rise from the bottom, do that. Do not produce a text column on the left
with a picture on the right unless the reference does.

A person who knows the source should recognise the family immediately and never mistake this for the same site. Do not reuse its wordmark, its brand name, its copy, or its specific illustrations; invent new ones drawn in the same hand.

Render as a complete desktop page filling the whole 16:9 frame, as if screenshotted at 1440 wide, showing the same part of the page the first reference shows and composed the same way. No browser chrome, no device mockup. Interface copy in English, plain punctuation, never an em dash.`;

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

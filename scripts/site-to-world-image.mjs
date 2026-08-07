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
// What travels is the vocabulary. What must not travel is the artifact.
//
// This prompt has now failed in both directions. The first version routed the
// page through prose and lost the source entirely. The version that replaced it
// said to keep "the exact chrome grammar of nav, buttons and chips" and shouted
// KEEP THE COMPOSITION, which produced reskins: House of Honey came back with
// their mark in the corner, their Get in Touch button in its place, their blush
// ground, and their signature device of a heavy grotesk interrupted by a script
// italic reproduced move for move. Only the illustration and the words were new.
// One line telling it not to reuse the wordmark was no match for two paragraphs
// telling it to copy everything around it.
//
// So the balance is inverted. A designer influenced by a page borrows its
// vocabulary, not its arrangement, and never its mark. The instruction most
// worth its space is the counter-intuitive one: the element that most identifies
// the source is the element you must not reproduce, because it is simultaneously
// the most tempting to keep and the only one that turns homage into forgery.
const prompt = `The attached images are screenshots of one website. Read them the way a designer reads a reference: not as a page to reproduce, but as a vocabulary to learn. You are going to design something else using that vocabulary.

The product is different${subject ? `: ${subject}` : ''}. New subject, new copy, new imagery, new brand.

WHAT TO CARRY OVER, and this is the part that goes missing if nobody says it:

- The palette's character. Its temperature, its saturation level, how many colours it runs, and which does the heavy lifting against which. Re-cast it rather than sampling it: shift the hues within the same family, or promote a secondary to ground, so the two palettes are unmistakably related and not identical.
- The type PAIRING LOGIC rather than the typefaces. If the source sets a very heavy display against a delicate high-contrast serif, do that; use different faces to do it.
- The shape language: radii, weight of line, whether forms are geometric or drawn, how areas of colour meet.
- The illustration idiom in full, meaning the drawing hand AND its energy. If the source's figures are mid-action with exaggerated proportions and cropped by the frame, yours are too. If its props are scattered at several scales, yours are. Match the density of loose elements. A tidy centred vignette is a failure when the source is an ensemble in motion.
- The register: how loud, how dense, how much air, how much the page is willing to shout.

WHAT MUST BE DIFFERENT, because these are what make a copy rather than an influence. Every one of these has been reproduced verbatim in a previous run:

- The composition. Where the headline sits, how much frame it takes, where the imagery enters, whether there is a text column at all. Arrange the page differently and let the same vocabulary support that arrangement.
- The chrome. Different nav position, different structure, a different number of items, a different call-to-action treatment. If the source puts a labelled button with an arrow at top right, yours must not.
- The mark. Invent one that shares no silhouette with theirs. If you cannot see a way to draw one that is clearly unrelated, use a wordmark set in type and nothing else.
- THE SIGNATURE DEVICE. Every distinctive page has one trick that is more identifying than anything else: a script word interrupting a heavy headline, a rule that cuts the page, a badge, a specific hero motif. Find it, name it to yourself, and then do NOT use it. Invent your own device out of the same vocabulary. This is the single most important instruction here, and the one most likely to be quietly ignored, because that device is exactly what makes the reference feel good.

The test: two designers shown both pages should say the same influences, the same shelf of references, the same year. They must not say the same studio, and they must never say the same site with different words in it. If you find yourself placing an element in the same position with the same treatment as the source, move it and treat it differently.

Render as a complete desktop page filling the whole 16:9 frame, as if screenshotted at 1440 wide, showing the top of the page and cut off mid-element at the bottom edge because more of it exists below. No browser chrome, no device mockup. Interface copy in English, plain punctuation, never an em dash.`;

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

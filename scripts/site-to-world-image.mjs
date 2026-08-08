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
import { UA, settle } from './lib/page-capture.mjs';

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

// --------------------------------------------------- awwwards entry pages
// Award-winning sites go offline. Agency work gets taken down when the client
// moves on, campaign sites are switched off after the campaign, and studios
// close; a queue built from award entries decays faster than most. The entry
// page outlives the site and carries the submission shot plus a gallery of the
// designer's own captures, usually at 3200px, showing sections a scroll capture
// would never reach.
//
// So an awwwards URL is a legitimate source rather than a broken one, and it is
// read here as the artifact instead of being followed to a dead host. Nothing is
// kept: the captures land in .waves/, which is gitignored, and are used the way
// a designer uses a reference, to produce something else.
const AWWWARDS_ENTRY = /^https?:\/\/(www\.)?awwwards\.com\/sites\/[a-z0-9-]+/i;
const isEntry = AWWWARDS_ENTRY.test(url);

async function captureFromEntry(page) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const media = await page.evaluate(() => {
    const primary = document.querySelector('meta[property="og:image"]')?.content || '';
    const found = [];
    for (const el of document.querySelectorAll('[data-poster], [data-src], img[src]')) {
      const src = el.getAttribute('data-poster') || el.getAttribute('data-src') || el.getAttribute('src') || '';
      if (/\/awards\/(submissions|element)\//.test(src) && /\.(jpe?g|png|webp)$/i.test(src)) found.push(src);
    }
    return { primary, found: [...new Set(found)] };
  });

  // Related-work rails carry other entries' media, and the reliable thing they
  // do not share is the submission's month, since assets are filed by upload
  // date. Scope to it, keep the submission shot first, and cap the set: eight
  // views of one design is already more than the model can hold.
  const stamp = (media.primary.match(/\/(\d{4}\/\d{2})\//) || [])[1];
  const gallery = media.found.filter(src => (stamp ? src.includes(`/${stamp}/`) : true));
  const urls = [...new Set([media.primary, ...gallery].filter(Boolean))].slice(0, 8);
  if (urls.length === 0) throw new Error('no artifact found on that entry page');

  const saved = [];
  for (const [index, mediaUrl] of urls.entries()) {
    const response = await fetch(mediaUrl, { headers: { 'user-agent': UA } });
    if (!response.ok) continue;
    const file = shotPath(index);
    // Normalized to PNG at a sane width. These arrive as jpeg or png at up to
    // 3200px, and the upload declares one type for every reference, so saving
    // whatever came down under a .png name would send a mislabelled jpeg.
    writeFileSync(file, await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width: 2048, withoutEnlargement: true }).png().toBuffer());
    saved.push(file);
    process.stdout.write(`  ref-${index}.png  ${mediaUrl.split('/').pop()}\n`);
  }
  if (saved.length === 0) throw new Error('every artifact download failed');
  return saved;
}

// ---------------------------------------------------------------- capture
process.stdout.write(`capturing ${url}${isEntry ? ' (awwwards entry: reading the hosted artifact)' : ''}\n`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

let shots = [];
if (isEntry) {
  shots = await captureFromEntry(page);
  await browser.close();
} else {
  shots = await captureLive(page);
  await browser.close();
}

async function captureLive(page) {
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await settle(page, { log: line => process.stdout.write(`${line}\n`) });
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });

const taken = [];
for (let i = 0; i < scrolls; i += 1) {
  await page.screenshot({ path: shotPath(i) });
  taken.push(shotPath(i));
  process.stdout.write(`  ref-${i}.png\n`);
  await page.evaluate(() => { window.scrollBy(0, window.innerHeight * 0.9); });
  await page.waitForTimeout(2500);
}
return taken;
}

// --------------------------------------------------------- how full it is
// Restraint was the register that would not carry. Told to keep "how much air"
// the page has, runs came back denser than the source every single time, and
// worst where it mattered most: flowty.co went from 19% to 40%, supaste from 15
// to 38. A minimal page reads as unfinished to an image model, so it fills the
// space, and a page that lives on interaction looks emptiest of all as a still.
//
// So the register stops being an adjective and becomes a number, the same move
// that fixed the motion rule. Detail rather than flat colour, because flowty's
// ground is a gradient and a dominant-colour test scores it as busy: measured as
// the share of the frame that differs from a blurred copy of itself, which type,
// photographs and illustration all do and a gradient does not.
async function detailDensity(file) {
  const base = sharp(file).resize(240, 135, { fit: 'cover', position: 'top' }).greyscale();
  const [crisp, blurred] = await Promise.all([
    base.clone().raw().toBuffer(),
    base.clone().blur(4).raw().toBuffer(),
  ]);
  let busy = 0;
  for (let i = 0; i < crisp.length; i += 1) if (Math.abs(crisp[i] - blurred[i]) > 10) busy += 1;
  return Math.round((busy / crisp.length) * 100);
}
const sourceDensity = await detailDensity(shots[0]).catch(() => null);
if (sourceDensity !== null) process.stdout.write(`  source carries detail on ${sourceDensity}% of the frame\n`);

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
const prompt = `The attached images are ${isEntry ? 'the designer\'s own captures of one website, taken from an awards submission' : 'screenshots of one website'}. Read them the way a designer reads a reference: not as a page to reproduce, but as a vocabulary to learn. You are going to design something else using that vocabulary.
${isEntry ? `
These captures may be presented on a backdrop or inside a device mockup, and they show several different sections rather than one continuous page. Read only the interface: the frame around it, any drop shadow under it, and the surface it is resting on are presentation, not design. Do not reproduce them.
` : ''}

The product is different${subject ? `: ${subject}` : ''}. New subject, new copy, new imagery, new brand.

WHAT TO CARRY OVER, and this is the part that goes missing if nobody says it:

- The palette's character. Its temperature, its saturation level, how many colours it runs, and which does the heavy lifting against which. Re-cast it rather than sampling it: shift the hues within the same family, or promote a secondary to ground, so the two palettes are unmistakably related and not identical.
- The type PAIRING LOGIC rather than the typefaces. If the source sets a very heavy display against a delicate high-contrast serif, do that; use different faces to do it.
- The shape language: radii, weight of line, whether forms are geometric or drawn, how areas of colour meet.
- The illustration idiom in full, meaning the drawing hand AND its energy. If the source's figures are mid-action with exaggerated proportions and cropped by the frame, yours are too. If its props are scattered at several scales, yours are. Match the density of loose elements. A tidy centred vignette is a failure when the source is an ensemble in motion.
- The register: how loud, how dense, how much air, how much the page is willing to shout.${sourceDensity === null ? '' : `

HOW FULL THE PAGE IS, which is measured rather than described because it is the thing that never survives. Detail covers about ${sourceDensity}% of the source's first viewport, counting type, images, illustration and anything else that is not bare ground. Yours must come out close to that, within a few points either way.

${sourceDensity < 25 ? `At ${sourceDensity}% this source is SPARSE, and that is the hardest instruction here to actually obey. An almost-empty frame reads as unfinished, and every previous run answered that feeling by adding an illustration, a card row or a photograph, arriving 15 to 20 points denser than the page it came from and losing the exact quality that made the page worth looking at. Resist it. If the source gives one headline, a line of body copy and a great deal of nothing, so do you. Note also that a page this sparse is often sparse because its content is time-based: it lives on motion and interaction, and a still frame of it is supposed to look this empty. Do not compensate for a stillness that is an artifact of the medium.` : `At ${sourceDensity}% this source is worked rather than sparse, so an empty frame would be as wrong as an overfilled one.`}`}

WHAT MUST BE DIFFERENT, because these are what make a copy rather than an influence. Every one of these has been reproduced verbatim in a previous run:

- The composition. Where the headline sits, how much frame it takes, where the imagery enters, whether there is a text column at all. Arrange the page differently and let the same vocabulary support that arrangement.
- The chrome. Different nav position, different structure, a different number of items, a different call-to-action treatment. If the source puts a labelled button with an arrow at top right, yours must not.
- The mark. Invent one that shares no silhouette with theirs. If you cannot see a way to draw one that is clearly unrelated, use a wordmark set in type and nothing else.
- THE SIGNATURE DEVICE, and read this one carefully, because both ways of getting it wrong are worse than the middle. Every distinctive page has one trick more identifying than anything else: a script word interrupting a heavy headline, images set inline inside a sentence, a rule that cuts the frame, a badge. Do not reproduce it. Do not simply drop it either: dropping it means falling back on the default arrangement, and a stock hero with a text column on the left and a picture on the right is a worse answer than a copy, because at least the copy was interesting.

  What you inherit is the MECHANISM, not the execution. Name what the device does structurally, then do that same structural thing a different way. If the source sets images inline inside its headline so type and picture occupy one line, your page must also do something inventive where type and image meet, and it must not be the same move. If a script word interrupts a grotesk, find your own interruption. The test is that a reader would say both pages take the same kind of risk in the same place, and that the risks are not the same risk.

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

#!/usr/bin/env node
// Watches a real page move, so the one rule an image cannot supply is measured
// rather than invented.
//
// Responsive/motion is the weak rule in every site-derived entry. The image says
// nothing about it, and a model asked to fill it in writes plausible motion that
// was never there: "elements fade up on scroll" fits any page and describes none.
// The guide's answer has always been to go and use the page. This does that, and
// then hands back evidence instead of an impression.
//
//   node scripts/observe-motion.mjs --url https://example.com --name thing
//   node scripts/observe-motion.mjs --url ... --videos .waves/site-worlds/x/vid
//
// Three kinds of evidence, in descending order of how much they can be trusted:
//
//   1. The stylesheet. Durations, easing curves and property names are facts,
//      not readings, and they are exactly the specificity the catalog wants: a
//      rule saying "0.4s cubic-bezier(.2,.8,.2,1) on transform" can be built
//      from, and "smooth transitions" cannot.
//   2. A scroll strip. Frames at fixed offsets show what is pinned, what
//      parallaxes, what enters, and whether the page moves at its own pace.
//   3. Hover deltas. Before and after on real controls, compared, so a state
//      change is observed rather than assumed.
//
// A dead host produces nothing here and says so, which is the correct outcome:
// the entry then carries no motion rule rather than a fabricated one.

import { chromium } from 'playwright';
import sharp from 'sharp';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { UA, settle } from './lib/page-capture.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const url = flag('url');
const name = flag('name');
const outDir = flag('out', path.join(ROOT, '.waves', 'site-worlds'));
const frames = Number(flag('frames', 6));

if (!url || !name) {
  process.stderr.write('usage: observe-motion.mjs --url <url> --name <slug> [--frames 6]\n');
  process.exit(1);
}

const dir = path.join(outDir, name, 'motion');
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

// Counted before the page runs, because a listener registered at boot cannot be
// enumerated afterwards. This is the cheapest reliable answer to "is this page
// driven by the cursor", which computed styles cannot tell you at all: a mouse
// trail, a magnetic button and a field that reacts to the pointer are all
// script, and all invisible to CSS.
await page.addInitScript(() => {
  window.__impeccableEvents = {};
  const original = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function addEventListener(type, ...rest) {
    window.__impeccableEvents[type] = (window.__impeccableEvents[type] || 0) + 1;
    return original.call(this, type, ...rest);
  };
});

// ------------------------------------------------- motion from the archive
// An awwwards entry carries video the designer recorded of their own page:
// scroll behaviour, hover states, transitions, captured while the site was
// alive. For a dead host that is the only motion record that will ever exist,
// and it is a better one than a scroll probe, because the person who built the
// page chose what to show.
const AWWWARDS_ENTRY = /^https?:\/\/(www\.)?awwwards\.com\/sites\/[a-z0-9-]+/i;

function ffprobeDuration(file) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' });
  return Number((probe.stdout || '').trim()) || 0;
}

async function observeFromEntry() {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const media = await page.evaluate(() => {
    const primary = document.querySelector('meta[property="og:image"]')?.content || '';
    const clips = [];
    for (const el of document.querySelectorAll('[data-src], video source, video')) {
      const src = el.getAttribute('data-src') || el.getAttribute('src') || '';
      if (/\/awards\/element\/.*\.mp4$/.test(src)) clips.push(src);
    }
    return { primary, clips: [...new Set(clips)] };
  });

  // Same scoping as the still capture: related-work rails carry other entries'
  // media, and the one thing they do not share is the submission's month.
  const stamp = (media.primary.match(/\/(\d{4}\/\d{2})\//) || [])[1];
  const clips = media.clips.filter(src => (stamp ? src.includes(`/${stamp}/`) : true)).slice(0, 2);
  if (clips.length === 0) return null;

  const sampled = [];
  for (const [clipIndex, clipUrl] of clips.entries()) {
    const response = await fetch(clipUrl, { headers: { 'user-agent': UA } });
    if (!response.ok) continue;
    const file = path.join(dir, `clip-${clipIndex}.mp4`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    const duration = ffprobeDuration(file);
    if (!duration) continue;
    // Evenly across the clip, skipping the very ends: the first frame is often
    // a blank or a title card and the last is often held.
    const count = 5;
    for (let i = 0; i < count; i += 1) {
      const at = (duration * (i + 0.5)) / count;
      const frame = path.join(dir, `clip-${clipIndex}-${i}.png`);
      const cut = spawnSync('ffmpeg', ['-y', '-ss', at.toFixed(2), '-i', file,
        '-frames:v', '1', '-vf', 'scale=1280:-1', frame], { encoding: 'utf8' });
      if (cut.status === 0 && existsSync(frame)) {
        sampled.push({ clip: clipIndex, at: Number(at.toFixed(2)), file: path.relative(ROOT, frame) });
      }
    }
    process.stdout.write(`  clip ${clipIndex}: ${duration.toFixed(1)}s, ${count} frames\n`);
  }
  return sampled.length ? { clips: clips.length, frames: sampled } : null;
}

if (AWWWARDS_ENTRY.test(url)) {
  const video = await observeFromEntry();
  await browser.close();
  writeFileSync(path.join(dir, 'motion.json'), `${JSON.stringify({
    url, reachable: Boolean(video), kind: 'video', video,
    note: video
      ? 'Sampled from the designer\'s own capture on the awards entry. The frames are ordered in time within each clip.'
      : 'The entry carried no video and there is no live page to watch. No motion was observed and none should be written.',
  }, null, 2)}\n`);
  process.stdout.write(`\n${path.relative(ROOT, path.join(dir, 'motion.json'))}\n`);
  process.stdout.write(video ? `  ${video.frames.length} frames from ${video.clips} clip(s)\n` : '  no video on that entry\n');
  process.exit(0);
}

let reachable = true;
const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
if (!response || response.status() >= 400) reachable = false;

if (!reachable) {
  // Deliberately not a failure. A world whose source is gone still gets an
  // entry; it gets one with an honest gap where the motion rule would be.
  writeFileSync(path.join(dir, 'motion.json'), `${JSON.stringify({
    url, reachable: false, note: 'Host did not respond. No motion was observed and none should be written.',
  }, null, 2)}\n`);
  process.stdout.write(`${url}\n  unreachable, no motion evidence\n`);
  await browser.close();
  process.exit(0);
}

await settle(page, { log: line => process.stdout.write(`${line}\n`) });

// ------------------------------------------------------- 1. the stylesheet
// Read from computed styles rather than by parsing CSS, so shorthands are
// already resolved and whatever actually applies is what gets counted.
const declared = await page.evaluate(() => {
  const transitions = new Map();
  const animations = new Map();
  let scrollBehaviour = getComputedStyle(document.documentElement).scrollBehavior;
  let sticky = 0;
  let willChange = 0;

  for (const el of document.querySelectorAll('body *')) {
    const style = getComputedStyle(el);
    if (style.position === 'sticky' || style.position === 'fixed') sticky += 1;
    if (style.willChange && style.willChange !== 'auto') willChange += 1;

    if (style.transitionDuration && style.transitionDuration !== '0s') {
      const key = `${style.transitionProperty} ${style.transitionDuration} ${style.transitionTimingFunction}`;
      transitions.set(key, (transitions.get(key) || 0) + 1);
    }
    if (style.animationName && style.animationName !== 'none') {
      const key = `${style.animationName} ${style.animationDuration} ${style.animationTimingFunction} ${style.animationIterationCount}`;
      animations.set(key, (animations.get(key) || 0) + 1);
    }
  }

  const top = map => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([spec, count]) => ({ spec, count }));

  return {
    transitions: top(transitions),
    animations: top(animations),
    scrollBehaviour,
    stickyOrFixed: sticky,
    willChange,
    // A page that ships one of these is animating deliberately and at scale,
    // which is itself worth knowing when writing the rule.
    libraries: ['gsap', 'ScrollTrigger', 'Lenis', 'locomotive', 'barba', 'framerMotion', 'Motion', 'anime', 'AOS']
      .filter(lib => lib in window || document.querySelector(`script[src*="${lib.toLowerCase()}" i]`)),

    // Cursor-driven work is script, so it leaves its trace in listeners rather
    // than in styles. A page with pointermove handlers is doing something with
    // the cursor beyond hovering, and canvas usually means the effect is drawn.
    pointer: (() => {
      const counts = window.__impeccableEvents || {};
      const sum = (...types) => types.reduce((total, type) => total + (counts[type] || 0), 0);
      return {
        move: sum('mousemove', 'pointermove'),
        enterLeave: sum('mouseenter', 'mouseleave', 'pointerenter', 'pointerleave', 'mouseover', 'mouseout'),
        wheel: sum('wheel'),
        canvases: document.querySelectorAll('canvas').length,
        webgl: [...document.querySelectorAll('canvas')].some(c => {
          try { return Boolean(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
        }),
      };
    })(),
  };
});
if (declared.pointer.move) {
  process.stdout.write(`  ${declared.pointer.move} pointermove listener(s), ${declared.pointer.enterLeave} enter/leave, ${declared.pointer.canvases} canvas${declared.pointer.webgl ? ' (webgl)' : ''}\n`);
}

// --------------------------------------------- 1b. what scrolling actually does
// The stylesheet only sees CSS. gusta.studio declares one colour transition and
// puts will-change on 157 elements, which means its real motion is script-driven
// and invisible to the pass above; sniffing for library globals missed it too,
// because bundlers rename them. So measure the effect instead of the cause:
// sample transforms and opacity, scroll a little, sample again. An element whose
// transform moves at a different rate from the page is parallaxing, and one
// whose opacity moves is being revealed, whatever drew it.
const scrollLinked = await page.evaluate(async () => {
  const sample = () => [...document.querySelectorAll('body *')].slice(0, 400).map(el => {
    const style = getComputedStyle(el);
    return { transform: style.transform, opacity: style.opacity };
  });
  const before = sample();
  const step = 300;
  window.scrollTo({ top: step, behavior: 'instant' });
  await new Promise(resolve => { setTimeout(resolve, 1200); });
  const after = sample();
  window.scrollTo({ top: 0, behavior: 'instant' });
  await new Promise(resolve => { setTimeout(resolve, 600); });

  let moved = 0;
  let faded = 0;
  let parallax = 0;
  for (let i = 0; i < Math.min(before.length, after.length); i += 1) {
    if (before[i].transform !== after[i].transform) {
      moved += 1;
      // A 2D matrix's last value is translateY. Moving by anything other than
      // the scroll distance means it is being driven, not merely scrolled past.
      const y = matrix => Number((matrix.match(/matrix\([^)]*,\s*([-\d.]+)\)$/) || [])[1] || 0);
      const delta = Math.abs(y(after[i].transform) - y(before[i].transform));
      if (delta > 1 && Math.abs(delta - step) > 20) parallax += 1;
    }
    if (before[i].opacity !== after[i].opacity) faded += 1;
  }
  return { sampled: before.length, moved, faded, parallax, step };
});
process.stdout.write(`  scrolling ${scrollLinked.step}px moved ${scrollLinked.moved} elements, faded ${scrollLinked.faded}, ${scrollLinked.parallax} off-rate\n`);

// -------------------------------------------------------- 2. a scroll strip
const height = await page.evaluate(() => document.documentElement.scrollHeight);
const viewport = 900;
const reach = Math.min(height - viewport, viewport * 5);
const strip = [];
for (let i = 0; i < frames; i += 1) {
  const y = Math.round((reach / Math.max(1, frames - 1)) * i);
  await page.evaluate(offset => window.scrollTo({ top: offset, behavior: 'instant' }), y);
  // Long enough for scroll-linked work to settle, short enough that a looping
  // animation is caught mid-cycle rather than always at the same phase.
  await page.waitForTimeout(1200);
  const file = path.join(dir, `scroll-${i}.png`);
  await page.screenshot({ path: file });
  strip.push({ y, file: path.relative(ROOT, file) });
}
process.stdout.write(`  ${strip.length} scroll frames over ${reach}px of ${height}px\n`);

// --------------------------------------------------------- 3. hover deltas
// Only elements big enough to read and near the top, because the point is the
// page's hover grammar rather than an inventory of every link on it.
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(800);

const targets = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('a, button, [role="button"], [class*="card" i], [class*="tile" i]')) {
    const rect = el.getBoundingClientRect();
    if (rect.top < 0 || rect.top > 880 || rect.width < 24 || rect.height < 14) continue;
    // Nested controls give near-identical crops, so keep them apart.
    if (out.some(prev => Math.abs(prev.x - (rect.left + rect.width / 2)) < 30
      && Math.abs(prev.y - (rect.top + rect.height / 2)) < 30)) continue;
    const style = getComputedStyle(el);
    out.push({
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
      label: (el.textContent || '').trim().slice(0, 40) || el.tagName.toLowerCase(),
      transition: style.transitionDuration !== '0s' ? `${style.transitionProperty} ${style.transitionDuration} ${style.transitionTimingFunction}` : null,
    });
    if (out.length >= 5) break;
  }
  return out;
});

const hovers = [];
for (const [index, target] of targets.entries()) {
  const box = { x: Math.max(0, target.x - 160), y: Math.max(0, target.y - 60), width: 320, height: 120 };
  const before = path.join(dir, `hover-${index}-off.png`);
  const after = path.join(dir, `hover-${index}-on.png`);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(400);
  await page.screenshot({ path: before, clip: box }).catch(() => {});
  await page.mouse.move(target.x, target.y);
  // Past the longest transition seen on the page, so the resting hover state is
  // captured rather than a frame partway into it.
  await page.waitForTimeout(900);
  await page.screenshot({ path: after, clip: box }).catch(() => {});
  if (existsSync(before) && existsSync(after)) {
    hovers.push({ ...target, before: path.relative(ROOT, before), after: path.relative(ROOT, after) });
  }
}
process.stdout.write(`  ${hovers.length} hover pairs\n`);

// ------------------------------------------------------ 4. a pointer sweep
// The hover pass above moves to a point and waits, which is the wrong shape for
// anything driven by motion rather than presence. A trail, a cursor-follower or
// a field that reacts to velocity all need the mouse to travel and to be
// photographed while travelling. nippori.lamm.tokyo is the case in point: it
// has a section whose shapes wiggle under the cursor and a trail of images that
// follows it, and neither leaves any trace in a hover pair or in computed style.
//
// Swept across the middle of a section deep enough to be past the hero, since
// that is where these pages tend to put the interactive set pieces.
const sweeps = [];
if (declared.pointer.move > 0) {
  const sweepAt = Math.min(Math.round(height * 0.35), 4000);
  await page.evaluate(offset => window.scrollTo({ top: offset, behavior: 'instant' }), sweepAt);
  await page.waitForTimeout(2000);
  await page.mouse.move(120, 450);
  await page.waitForTimeout(300);
  const stops = 5;
  for (let i = 0; i < stops; i += 1) {
    const x = Math.round(160 + ((1440 - 320) / (stops - 1)) * i);
    const y = 450 + Math.round(Math.sin((i / (stops - 1)) * Math.PI) * 120);
    // Interpolated so the page receives a stream of moves rather than a jump,
    // which is what a velocity-driven effect needs to fire at all.
    await page.mouse.move(x, y, { steps: 12 });
    // Short, because a trail is transient: wait a second and it has faded.
    await page.waitForTimeout(220);
    const file = path.join(dir, `sweep-${i}.png`);
    await page.screenshot({ path: file });
    sweeps.push({ x, y, file: path.relative(ROOT, file) });
  }
  // How much of the frame the cursor changed, which is the difference between a
  // page that merely registers pointermove and one that visibly answers it.
  // Compared small and greyscale, because the question is how much moved and not
  // what colour it was. A rising series is the signature of an accumulating
  // trail rather than a single element tracking the cursor.
  const grab = file => sharp(file).greyscale().resize(360, 225, { fit: 'fill' }).raw().toBuffer();
  for (let i = 1; i < sweeps.length; i += 1) {
    const [before, after] = await Promise.all([
      grab(path.join(ROOT, sweeps[i - 1].file)), grab(path.join(ROOT, sweeps[i].file)),
    ]);
    let changed = 0;
    for (let px = 0; px < before.length; px += 1) if (Math.abs(before[px] - after[px]) > 12) changed += 1;
    sweeps[i].changedPercent = Number(((changed / before.length) * 100).toFixed(1));
  }
  const deltas = sweeps.slice(1).map(s => s.changedPercent);
  process.stdout.write(`  ${sweeps.length} pointer sweep frames at ${sweepAt}px, frame changed ${deltas.join('%, ')}%\n`);
}

await browser.close();

const evidence = { url, reachable: true, declared, scrollLinked, strip, hovers, sweeps };
writeFileSync(path.join(dir, 'motion.json'), `${JSON.stringify(evidence, null, 2)}\n`);

process.stdout.write(`\n${path.relative(ROOT, path.join(dir, 'motion.json'))}\n`);
if (declared.libraries.length) process.stdout.write(`  animation libraries: ${declared.libraries.join(', ')}\n`);
for (const t of declared.transitions.slice(0, 3)) process.stdout.write(`  transition x${t.count}: ${t.spec}\n`);
for (const a of declared.animations.slice(0, 2)) process.stdout.write(`  animation x${a.count}: ${a.spec}\n`);

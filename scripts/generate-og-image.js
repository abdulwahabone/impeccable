#!/usr/bin/env node

/**
 * Generate OG Image (paper brand)
 *
 * Renders the social sharing card with Playwright using the site's paper
 * tokens: neutral paper ground, ink headline in Albert Sans, the gold mark
 * and one gold hairline. No art, no texture. Renders at 2x and downscales
 * with sharp for crisp text. The command count is read live from
 * command-metadata.json so it can never go stale.
 *
 * Output: site/public/og-image-v3.jpg (the cache-busted filename Base.astro
 * and index.astro reference). Bump the version suffix here and in those two
 * files together when you want social scrapers to re-fetch a fresh card.
 *
 * Usage: bun run og-image
 */

import { chromium } from 'playwright';
import sharp from 'sharp';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'site', 'public', 'og-image-v3.jpg');

// Count sub-commands from skill/scripts/command-metadata.json (the post-v3.0
// single source of truth), so the card's "N commands" tracks the real total.
function getCommandCount() {
  const metadataPath = path.join(ROOT_DIR, 'skill', 'scripts', 'command-metadata.json');
  if (!fs.existsSync(metadataPath)) return 0;
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  return Object.keys(metadata).length;
}

async function generateOgImage() {
  const commands = getCommandCount();
  console.log(`Detected ${commands} command(s)`);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600&family=Alumni+Sans:wght@400&display=swap" rel="stylesheet">
<style>
  :root {
    --ks-kinpaku:   oklch(84% 0.19 80.46);
    --ks-gold-line: oklch(77% 0.13 82);
    --ks-paper:     oklch(97.8% 0 0);
    --ks-ink:       oklch(13% 0 0);
    --ks-text:      oklch(22% 0 0);
    --ks-muted:     oklch(46% 0 0);
    --ks-rule:      oklch(13% 0 0 / 0.12);
    --ks-font:      "Albert Sans", system-ui, sans-serif;
    --ks-wordmark:  "Alumni Sans", "Albert Sans", sans-serif;
  }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    position: relative; overflow: hidden;
    background: var(--ks-paper);
    font-family: var(--ks-font);
    color: var(--ks-text);
    -webkit-font-smoothing: antialiased;
  }
  .stage { position: absolute; inset: 0; padding: 72px 80px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .mark { width: 44px; height: 44px; color: var(--ks-kinpaku); display: grid; place-items: center; }
  .mark svg { width: 38px; height: 38px; display: block; }
  .wordmark {
    color: var(--ks-ink); font-family: var(--ks-wordmark); font-weight: 400;
    font-size: 26px; letter-spacing: 0.15em; text-transform: uppercase; line-height: 1;
  }
  .headline-wrap { margin-top: auto; margin-bottom: auto; }
  .headline {
    color: var(--ks-ink); font-weight: 500;
    font-size: 76px; line-height: 1.04; letter-spacing: -0.025em; max-width: 860px;
  }
  .sub {
    margin-top: 28px; color: var(--ks-muted); font-size: 26px; font-weight: 400;
    line-height: 1.4; max-width: 640px;
  }
  .meta {
    display: flex; align-items: baseline; justify-content: space-between; gap: 24px;
    padding-top: 28px; border-top: 1px solid var(--ks-rule); position: relative;
  }
  /* One gold hairline: the brand as a line, sitting on the rule. */
  .meta::before { content: ""; position: absolute; left: 0; top: -1px; width: 88px; height: 2px; background: var(--ks-gold-line); }
  .meta-left { color: var(--ks-text); font-size: 21px; font-weight: 500; letter-spacing: 0.01em; }
  .meta-left .dot { color: var(--ks-gold-line); padding: 0 12px; }
  .meta-left .lead { color: var(--ks-ink); font-weight: 600; }
  .domain { color: var(--ks-muted); font-size: 21px; font-weight: 500; letter-spacing: 0.02em; }
</style>
</head>
<body>
  <div class="stage">
    <div class="brand">
      <span class="mark">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 2.5 L13.5 2.5 L5.5 21.5 L5 21.5 Q2.5 21.5 2.5 19 L2.5 5 Q2.5 2.5 5 2.5 Z"/>
          <path d="M16.5 2.5 L19 2.5 Q21.5 2.5 21.5 5 L21.5 19 Q21.5 21.5 19 21.5 L8.5 21.5 Z"/>
        </svg>
      </span>
      <span class="wordmark">Impeccable</span>
    </div>
    <div class="headline-wrap">
      <h1 class="headline">The missing design<br>vocabulary for agents.</h1>
      <p class="sub">Strips the slop from AI-generated interfaces, gives you precise commands to steer, and iterates variants live in your product.</p>
    </div>
    <div class="meta">
      <div class="meta-left"><span class="lead">${commands} commands</span><span class="dot">&middot;</span>Skill<span class="dot">&middot;</span>CLI<span class="dot">&middot;</span>Extension</div>
      <div class="domain">impeccable.style</div>
    </div>
  </div>
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });

  // Write to a temp file and load via file:// so networkidle waits for fonts.
  const tmpHtml = path.join(os.tmpdir(), `impeccable-og-${process.pid}.html`);
  fs.writeFileSync(tmpHtml, html);
  try {
    await page.goto(pathToFileURL(tmpHtml).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);

    // Screenshot at 2x (2400x1260), then downscale to 1200x630 for crisp text.
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
    await browser.close();
    await sharp(buf).resize(1200, 630).jpeg({ quality: 86 }).toFile(OUTPUT_PATH);
  } finally {
    fs.rmSync(tmpHtml, { force: true });
  }

  const size = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(0);
  console.log(`Generated ${OUTPUT_PATH} (${size} KB)`);
}

generateOgImage().catch((err) => {
  console.error('Failed to generate OG image:', err);
  process.exit(1);
});

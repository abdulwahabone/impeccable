import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { LIVE_UI_SURFACES } from '../skill/scripts/live/ui-core.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('Live UI lab is a focused state catalog', () => {
  const page = read('site/pages/labs/live-ui/index.astro');

  assert.match(page, /<LiveUiGallery\s*\/>/);
  assert.match(page, /canonicalPath="\/labs\/live-ui"/);
  assert.match(page, /noIndex/);
  assert.doesNotMatch(page, /benchmark|performance|provider/i);
});

test('Live UI gallery covers every visible production surface', () => {
  const gallery = read('site/components/LiveUiGallery.astro');
  const visibleSurfaces = LIVE_UI_SURFACES
    .map((surface) => surface.key)
    .filter((key) => key !== 'css-isolation-boundary');

  for (const surface of visibleSurfaces) {
    assert.match(gallery, new RegExp(`['"]${surface}['"]`), `${surface} needs a gallery snapshot`);
  }

  assert.match(gallery, /uncoveredSurfaces/);
  assert.match(gallery, /LIVE_COMMANDS/);
});

test('Live UI gallery organizes states into browsable workflow clusters', () => {
  const gallery = read('site/components/LiveUiGallery.astro');
  const runtime = read('site/scripts/live-ui-gallery.js');
  const styles = read('site/styles/live-ui-gallery.css');

  assert.match(gallery, /data-gallery-group=/);
  assert.match(gallery, /data-gallery-cluster/);
  assert.match(gallery, /data-gallery-host="light"/);
  assert.doesNotMatch(gallery, /<select|live-ui-gallery__quick-nav/);
  assert.match(runtime, /groups\.flatMap/);
  assert.match(runtime, /function renderGroup/);
  assert.match(runtime, /data-gallery-state-card/);
  assert.match(runtime, /button\[data-gallery-group\]/);
  assert.match(runtime, /button\[data-gallery-host\]/);
  assert.match(runtime, /galleryActiveHost/);
  assert.match(runtime, /function syncPreviewTargetGeometry/);
  assert.match(runtime, /targetRect\.top - stageRect\.top/);
  assert.match(runtime, /targetBox\.top - 28/);
  assert.doesNotMatch(styles, /\.lvg-selection-outline\s*\{[^}]*top:\s*70px/s);
  assert.match(styles, /\.live-ui-gallery :where\(button, input, select\)/);
  assert.match(styles, /\.lvg-configure-modifier:not\(\.is-count\) > span/);
  assert.match(styles, /\.lvg-pending-pill > span:not\(\.lvg-pending-count\)/);
  assert.match(styles, /\.lvg-steer-dots\s*\{[^}]*margin-left:\s*auto;[^}]*justify-content:\s*flex-end;/s);
});

test('Live UI gallery always uses dark ink on solid gold', () => {
  const styles = read('site/styles/live-ui-gallery.css');
  const solidGoldRules = [...styles.matchAll(/([^{}]+)\{([^{}]*background:\s*var\(--lvg-live-brand\)[^{}]*)\}/g)];

  assert.match(styles, /--lvg-live-on-brand:\s*var\(--lvg-live-ink\);/);
  assert.match(styles, /--lvg-live-brand-highlight:\s*color-mix\([^;]+var\(--lvg-live-brand\)[^;]+\);/);
  assert.ok(solidGoldRules.length > 0, 'expected solid-gold Live UI rules');

  for (const [, selector, declarations] of solidGoldRules) {
    assert.doesNotMatch(
      declarations,
      /color:\s*(?:white|#fff(?:fff)?|oklch\((?:9[0-9]|100)%)/i,
      `${selector.trim()} must not put light text on solid gold`,
    );
  }

  for (const selector of [
    '.lvg-tune-button[aria-expanded="true"] .lvg-tune-badge',
    '.lvg-param-steps button[aria-pressed="true"]',
  ]) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      styles,
      new RegExp(`${escapedSelector}\\s*\\{[^}]*color:\\s*var\\(--lvg-live-on-brand\\);[^}]*background:\\s*var\\(--lvg-live-brand\\);`, 's'),
      `${selector} should use the shared on-gold foreground`,
    );
  }

  assert.match(
    styles,
    /\.lvg-host-target\[data-edited="true"\] h4\s*\{[^}]*color:\s*var\(--lvg-live-on-brand\);[^}]*background:\s*var\(--lvg-live-brand-highlight\);/s,
    'edited host text should use dark ink on its gold highlight in either host theme',
  );
});

test('legacy Live Lab URL redirects to the labs namespace', () => {
  const redirect = read('site/pages/live-lab/index.astro');
  assert.match(redirect, /Astro\.redirect\('\/labs\/live-ui', 301\)/);
});

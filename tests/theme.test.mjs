import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// The site has one theme. These guard against the second system creeping
// back: a toggle in the header, a stored preference in the layout, or a
// theme-conditional rule in any stylesheet.
test('the site ships one theme and no switcher', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'site/scripts/utils/theme.js')), 'theme.js was retired');
  assert.doesNotMatch(read('site/components/Header.astro'), /theme-toggle/);
  assert.doesNotMatch(read('site/layouts/Base.astro'), /impeccable-theme|data-theme-pref/);
  assert.match(read('site/styles/kinpaku-tokens.css'), /color-scheme:\s*light/);
});

test('no stylesheet carries html.light, html.dark or prefers-color-scheme', () => {
  const dir = path.join(ROOT, 'site/styles');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.css') ? [path.join(d, e.name)] : []);
  const offenders = [];
  for (const file of walk(dir)) {
    read(path.relative(ROOT, file)).split('\n').forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('/*') || t.startsWith('*')) return;
      if (/html\.(light|dark)\b|prefers-color-scheme/.test(line)) offenders.push(`${path.relative(ROOT, file)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});

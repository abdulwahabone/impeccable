/**
 * Guards against the failure mode that keeps recurring in this stylesheet:
 * one behaviour described in two places with nothing forcing the two to agree.
 *
 * The instance that prompted this: `.worlds-family-button` had two blocks 95
 * lines apart, the first asking for `min-height: var(--ks-control-lg)` and the
 * second setting `min-height: 0`. Rows rendered at 24px, neither block was
 * wrong read on its own, and nothing in the build, the tests or the detector
 * had anything to say about it. The same shape produced a control ladder with
 * seven heights and four radii.
 *
 * Two checks, both deliberately narrow so that a failure always means a real
 * contradiction rather than a style opinion:
 *
 *   1. A selector that sets the same property to two different values inside
 *      the same at-rule context. One of the two is dead, and which one is dead
 *      depends on source order rather than on intent.
 *
 *   2. A literal where the design system has a token: an off-ladder radius or
 *      control height, or functional type below the 11px floor. DESIGN.md
 *      section 5 is the source of truth for the scales; this holds the CSS to
 *      what it says.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STYLE_DIR = path.join(ROOT, 'site/styles');

/** Properties where a second, different value is a contradiction rather than a
 *  deliberate layering. Shorthands and paint properties are excluded: a later
 *  `background` or `color` overriding an earlier one is how states, themes and
 *  progressive enhancement are normally written. */
const GEOMETRY_PROPS = new Set([
  'min-height', 'max-height', 'height',
  'min-width', 'max-width', 'width',
  'font-size', 'line-height',
  'border-radius',
  'display', 'position',
  'grid-template-columns', 'grid-template-rows',
]);

/** The scales DESIGN.md section 5 declares. A literal that is not on one of
 *  these has either invented a rung or hardcoded a token's value. */
const RADIUS_OK = new Set(['0', '0px', '50%', '999px', '100%']);
const CONTROL_HEIGHTS = new Set([26, 32, 44]);
const TYPE_FLOOR_PX = 11;

/** The scale check is opt-in, and the opt-in list is the application surfaces.
 *
 *  This is the whole point of the register split: on a marketing page design IS
 *  the product, a 6px radius on one card is a decision somebody made, and a
 *  lint that calls it drift is just wrong. On a workbench holding four hundred
 *  controls, the same 6px is drift every time. Running the check across
 *  site/styles produced 690 findings, essentially all of them from brand
 *  sheets, which is how a guard gets switched off.
 *
 *  Add a file here when it becomes an application surface, not before. */
const SCALE_ENFORCED = new Set([
  'worlds-lab.css',
]);

function cssFiles() {
  return fs.readdirSync(STYLE_DIR)
    .filter(f => f.endsWith('.css'))
    .map(f => ({ name: f, css: fs.readFileSync(path.join(STYLE_DIR, f), 'utf8') }));
}

/** Where a rule lives: its selector plus every at-rule wrapping it. Two blocks
 *  only contradict each other if they apply under the same conditions, so a
 *  media query or a :hover variant is a different context, not a duplicate. */
function contextOf(rule) {
  const conditions = [];
  for (let p = rule.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule') conditions.push(`@${p.name} ${p.params}`);
  }
  return conditions.reverse().join(' | ');
}

/** Whether a selector names something a pointer is meant to land on. Static and
 *  therefore approximate, which is why it errs toward not flagging: a control
 *  the heuristic misses keeps the status quo, while a container it wrongly
 *  claims sends someone off resizing a header bar. `kbd` is excluded on purpose
 *  — a keycap chip is a label drawn like a key, not a target. */
function isControlSelector(selector) {
  const s = selector.toLowerCase();
  if (/\bkbd\b/.test(s)) return false;
  return /\b(button|input|select|textarea)\b/.test(s)
    || /\[role="(button|tab|option|menuitem|switch)"\]/.test(s)
    || /-(toggle|button|action|stepper|chip)\b/.test(s);
}

function normalizeSelector(sel) {
  return sel.split(',').map(s => s.trim().replace(/\s+/g, ' ')).sort().join(', ');
}

describe('CSS contradictions', () => {
  it('no selector sets the same geometry property to two different values in one context', () => {
    const contradictions = [];

    for (const { name, css } of cssFiles()) {
      // selector + context + property -> first { value, line }
      const seen = new Map();
      let root;
      try { root = postcss.parse(css, { from: name }); } catch (err) {
        assert.fail(`${name} failed to parse: ${err.message}`);
      }

      root.walkRules(rule => {
        const ctx = contextOf(rule);
        const sel = normalizeSelector(rule.selector);
        // A rule may legitimately restate a property inside itself as a
        // fallback for older engines (`height: 100vh; height: 100dvh`), so
        // only the first declaration of each property per block is recorded.
        const inThisBlock = new Set();

        rule.walkDecls(decl => {
          const prop = decl.prop.toLowerCase();
          if (!GEOMETRY_PROPS.has(prop)) return;
          if (inThisBlock.has(prop)) return;
          inThisBlock.add(prop);

          const key = `${ctx}||${sel}||${prop}`;
          const value = decl.value.trim();
          const prev = seen.get(key);
          if (!prev) {
            seen.set(key, { value, line: decl.source?.start?.line ?? 0 });
            return;
          }
          if (prev.value === value) return;
          contradictions.push(
            `${name}: "${rule.selector}" sets ${prop} twice — `
            + `"${prev.value}" (line ${prev.line}) then "${value}" (line ${decl.source?.start?.line ?? 0})`
            + (ctx ? ` [${ctx}]` : ''),
          );
        });
      });
    }

    assert.deepEqual(
      contradictions, [],
      'A selector sets the same property to two different values, so one of them is dead and which one '
      + 'wins depends on source order. Merge the blocks:\n  ' + contradictions.join('\n  '),
    );
  });

  it('radii, control heights and functional type sizes stay on the DESIGN.md scales', () => {
    const offScale = [];

    for (const { name, css } of cssFiles()) {
      if (!SCALE_ENFORCED.has(name)) continue;
      const root = postcss.parse(css, { from: name });

      root.walkDecls(decl => {
        const prop = decl.prop.toLowerCase();
        const value = decl.value.trim();
        const line = decl.source?.start?.line ?? 0;
        // Anything reaching for a token is on the scale by construction.
        if (value.includes('var(--')) return;

        if (prop === 'border-radius' && !RADIUS_OK.has(value)) {
          // calc() off a token is how a nested control takes the inner radius.
          if (/calc\(/.test(value)) return;
          offScale.push(`${name}:${line} border-radius: ${value} — use --ks-radius-sm/md/pill`);
        }

        // The ladder governs controls, not every box that happens to be 34px
        // tall. A header bar, a logo mark and a keycap chip are all sized by
        // what they hold; flagging them taught nothing and buried the four
        // buttons that were genuinely off the ladder.
        if ((prop === 'min-height' || prop === 'height') && /^\d+px$/.test(value) && isControlSelector(decl.parent?.selector || '')) {
          const px = parseInt(value, 10);
          // Below the smallest rung these are icons and dots rather than
          // controls, and above the largest they are layout rather than chrome.
          if (px < 20 || px > 48) return;
          if (CONTROL_HEIGHTS.has(px)) return;
          offScale.push(`${name}:${line} ${prop}: ${value} — control ladder is 26 / 32 / 44 (--ks-control-sm/md/lg)`);
        }

        if (prop === 'font-size' && /^[\d.]+(px|rem)$/.test(value)) {
          const px = value.endsWith('rem') ? parseFloat(value) * 16 : parseFloat(value);
          if (px < TYPE_FLOOR_PX) {
            offScale.push(`${name}:${line} font-size: ${value} (${px}px) — nothing functional goes below ${TYPE_FLOOR_PX}px`);
          }
        }
      });
    }

    assert.deepEqual(
      offScale, [],
      'Literal values where the design system has a scale. DESIGN.md section 5 has the tokens:\n  '
      + offScale.join('\n  '),
    );
  });
});

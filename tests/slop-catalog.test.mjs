import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { ANTIPATTERNS } from '../cli/engine/registry/antipatterns.mjs';

const CRITIQUE_ONLY_RULES = new Set([
  'glassmorphism',
  // Retired from the deterministic engine but still documented on the slop page:
  // pairing a display face with a body face is a judgment call, not something a
  // regex can decide without flagging deliberate single-face systems.
  'single-font',
  'over-round',
  'sketchy-svg',
  'hero-metric-layout',
  'identical-card-grids',
]);

test('the Slop catalog covers every detector rule', () => {
  const source = fs.readFileSync(new URL('../site/pages/slop/index.astro', import.meta.url), 'utf8');
  const staticRuleIds = [...source.matchAll(/id="rule-([^"]+)"/g)].map((match) => match[1]);
  const catalogLists = source.match(/const CATALOG_RULE_IDS = \{([\s\S]*?)\n\};/);

  assert.ok(catalogLists, 'CATALOG_RULE_IDS should remain easy to audit');

  const dynamicRuleIds = [...catalogLists[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const catalogRuleIds = new Set([...staticRuleIds, ...dynamicRuleIds]);
  const registryRuleIds = new Set(ANTIPATTERNS.map((rule) => rule.id));
  const missingRuleIds = [...registryRuleIds].filter((id) => !catalogRuleIds.has(id));
  const critiqueOnlyRuleIds = [...catalogRuleIds].filter((id) => !registryRuleIds.has(id));

  assert.deepEqual(missingRuleIds, []);
  assert.deepEqual(new Set(critiqueOnlyRuleIds), CRITIQUE_ONLY_RULES);
  assert.equal(catalogRuleIds.size, ANTIPATTERNS.length + CRITIQUE_ONLY_RULES.size);
});

test('new detector rules read like catalog entries, not release notes', () => {
  const source = fs.readFileSync(new URL('../site/pages/slop/index.astro', import.meta.url), 'utf8');
  const copyBlock = source.match(/const CATALOG_RULE_COPY = \{([\s\S]*?)\n\};/);

  assert.ok(copyBlock, 'CATALOG_RULE_COPY should remain easy to audit');
  assert.doesNotMatch(source, /latest detector coverage|catalog had fallen behind/i);

  // Derived, not a literal. This was a hardcoded count, so every rule added to
  // CATALOG_RULE_IDS failed here for a reason unrelated to the copy, and the fix
  // was to bump a number rather than write the entry.
  const idsBlock = source.match(/const CATALOG_RULE_IDS = \{([\s\S]*?)\n\};/);
  const dynamicRuleIds = [...idsBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const descriptions = [...copyBlock[1].matchAll(/:\s*'([^']+)'/g)].map((match) => match[1]);
  const described = new Set([...copyBlock[1].matchAll(/'([^']+)':/g)].map((match) => match[1]));
  const undescribed = dynamicRuleIds.filter((id) => !described.has(id));
  assert.deepEqual(undescribed, [], 'every dynamically rendered rule needs catalog copy');
  assert.ok(descriptions.every((description) => description.length <= 155));
});

// The section headers state their own rule count, and three of them had to be
// hand-corrected when rules were added. Nothing derived them, so a wrong number
// simply shipped. This does not derive them either, because the cards are
// literal markup rather than data, but it makes a wrong number fail here.
test('each catalog section states the number of rule cards it contains', () => {
  const source = fs.readFileSync(new URL('../site/pages/slop/index.astro', import.meta.url), 'utf8');
  const idsBlock = source.match(/const CATALOG_RULE_IDS = \{([\s\S]*?)\n\};/);
  const dynamicPerGroup = Object.fromEntries(
    [...idsBlock[1].matchAll(/^\s*(\w+):\s*\[([^\]]*)\]/gm)].map((match) => [
      match[1],
      [...match[2].matchAll(/'([^']+)'/g)].length,
    ]),
  );

  const sections = source.split(/<section class="anti-patterns-section"/).slice(1);
  const mismatches = [];
  for (const section of sections) {
    const title = section.match(/anti-patterns-section-title">([^<]+)</)?.[1];
    const stated = Number(section.match(/anti-patterns-section-count">(\d+) rules?</)?.[1]);
    if (!title || Number.isNaN(stated)) continue;
    const staticCards = [...section.matchAll(/id="rule-[^"]+"/g)].length;
    const rendered = [...section.matchAll(/catalogRules\.(\w+)\.map/g)]
      .reduce((sum, match) => sum + (dynamicPerGroup[match[1]] ?? 0), 0);
    const actual = staticCards + rendered;
    if (actual !== stated) mismatches.push(`${title}: says ${stated}, contains ${actual}`);
  }
  assert.deepEqual(mismatches, []);
});

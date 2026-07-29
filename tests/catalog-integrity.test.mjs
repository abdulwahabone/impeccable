// The real world catalog's own health, checked through the skill's validator.
//
// This file used to be a fork of the public repo's tests/concept-seed.test.mjs,
// re-pointed at catalog/ instead of fixtures. That fork asserted on the seeder's
// rendered prose and on exact family rosters, so it broke whenever upstream
// reworded a line or a migration legitimately emptied a family, while telling us
// nothing about the catalog. Two of its cases were failing for exactly that
// reason: one expected a "Never expose promotion metadata" line that no longer
// exists anywhere in the skill, the other expected 26 families after five of one
// family's concepts were correctly migrated into the composition catalog.
//
// Skill behaviour is the public repo's to test and it does, with a strict
// superset of what the fork covered (including the breadth gate, staging rating
// weights, and the ticket-dedupe trap). What only this repo can check is whether
// the private catalog itself is well formed, so that is all this file does.
// Selection behaviour over the real catalog lives in world-roll-core.test.mjs.

import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  readConceptCatalog,
  validateConceptCatalog,
} from '../skill/scripts/lib/concept-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_DIR = path.join(ROOT, 'catalog');
const SCRIPT = path.join(ROOT, 'skill', 'scripts', 'concept-seed.mjs');

// The wells are the fixed taxonomy: seven translation distances, named once.
// Adding or renaming one is a deliberate architectural act, so unlike the family
// roster this stays an exact list.
const WELL_IDS = [
  'graphic-systems',
  'canon-movements',
  'vernacular-ephemera',
  'instruments-signals',
  'medium-native',
  'material-worlds',
  'performed-time',
];

const HIGH_TRANSFER_WELLS = [
  'graphic-systems',
  'canon-movements',
  'vernacular-ephemera',
  'instruments-signals',
  'medium-native',
];

function loadCatalog() {
  return readConceptCatalog(
    path.join(CATALOG_DIR, 'concept-ingredients.json'),
    path.join(CATALOG_DIR, 'concept-reviews.json')
  );
}

describe('real world catalog', () => {
  it('passes the skill validator with no errors', () => {
    const { catalog, reviewData } = loadCatalog();
    const result = validateConceptCatalog(catalog, reviewData, { minimumTotal: 260 });
    assert.deepEqual(result.errors, []);
    assert.equal(result.stats.concepts >= 260, true, `only ${result.stats.concepts} concepts`);
    assert.equal(
      result.stats.pending + result.stats.approved + result.stats.rejected,
      result.stats.concepts,
      'every concept must land in exactly one review bucket'
    );
  });

  it('keeps the seven wells as the fixed taxonomy', () => {
    const { catalog } = loadCatalog();
    assert.deepEqual(catalog.wells.map(well => well.id), WELL_IDS);
    for (const well of catalog.wells) {
      assert.equal(
        catalog.families.some(family => family.well === well.id),
        true,
        `well ${well.id} has no families`
      );
    }
  });

  // Families grow and occasionally empty out when their concepts migrate to the
  // composition catalog, so this asserts shape and a floor rather than a roster.
  it('keeps every family well formed and attached to a real well', () => {
    const { catalog } = loadCatalog();
    const wellIds = new Set(catalog.wells.map(well => well.id));
    const seen = new Set();
    assert.equal(catalog.families.length >= 20, true, `only ${catalog.families.length} families`);
    for (const family of catalog.families) {
      assert.equal(seen.has(family.id), false, `duplicate family id ${family.id}`);
      seen.add(family.id);
      assert.equal(wellIds.has(family.well), true, `family ${family.id} names unknown well ${family.well}`);
      // An empty family is a bug: retirements and migrations remove concepts,
      // and the family should go with the last one. Thinness above zero is a
      // curation matter, not a build gate. The old fork asserted a floor of two
      // but never reached that line, so `space` and `festivals-public-life` sat
      // at one concept unnoticed; they are listed by the diagnostic below.
      assert.equal(
        family.concepts.length >= 1,
        true,
        `family ${family.id} is empty; remove the family rather than leaving it`
      );
    }
  });

  // Not a gate: the seeder prefers a second pick from a different family, so a
  // one-concept family contributes almost nothing to diversity. Printing the
  // list keeps it visible for the next authoring round instead of failing a
  // build over a curation decision.
  it('reports families thin enough to be worth topping up', () => {
    const { catalog } = loadCatalog();
    const thin = catalog.families
      .filter(family => family.concepts.length < 2)
      .map(family => `${family.id} (${family.concepts.length})`);
    if (thin.length > 0) {
      console.log(`    thin families, consider topping up or retiring: ${thin.join(', ')}`);
    }
    assert.equal(Array.isArray(thin), true);
  });

  // A corpus that drifts toward atmosphere worlds costs the model more
  // translation work per roll than it can afford.
  it('does not let the high-transfer wells become a minority', () => {
    const { catalog, concepts } = loadCatalog();
    const totals = new Map();
    for (const family of catalog.families) {
      totals.set(family.well, (totals.get(family.well) || 0) + family.concepts.length);
    }
    const highTransfer = HIGH_TRANSFER_WELLS.reduce((sum, well) => sum + (totals.get(well) || 0), 0);
    assert.equal(
      highTransfer >= concepts.length * 0.45,
      true,
      `high-transfer wells hold ${highTransfer}/${concepts.length}`
    );
  });

  it('gives every concept the full authored payload', () => {
    const { concepts } = loadCatalog();
    for (const concept of concepts) {
      assert.equal(concept.system.length, 5, `${concept.id} has ${concept.system.length} system rules`);
      assert.equal(concept.spark.length >= 80, true, `${concept.id} has a thin spark`);
      assert.equal(concept.webLeverage.length >= 20, true, `${concept.id} has thin web leverage`);
    }
  });

  // Smoke test for the local path specifically: the seeder has to be able to
  // load this catalog off disk and deal from it. Asserts on exit status and the
  // absence of undefined, never on the wording, which the public repo owns.
  it('loads through the seeder and deals a reproducible roll', () => {
    const run = () => spawnSync(process.execPath, [SCRIPT, '--scope', 'direction', '--from', 'stable-test'], {
      cwd: ROOT,
      encoding: 'utf-8',
      env: { ...process.env, IMPECCABLE_CATALOG_DIR: CATALOG_DIR },
    });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.doesNotMatch(first.stdout, /undefined/);
    assert.equal(first.stdout, run().stdout, 'the same key must reproduce the same roll');
  });
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it, before } from 'node:test';
import {
  deriveConceptName,
  mergeConcepts,
  rollSeed,
} from '../functions/api/_worldroll-core.js';

const ROOT = path.resolve(import.meta.dirname, '..');

async function loadData() {
  const load = async name => JSON.parse(await readFile(path.join(ROOT, 'catalog', `${name}.json`), 'utf8'));
  const [conceptCatalog, conceptReviews, compositionCatalog, compositionReviews] = await Promise.all([
    load('concept-ingredients'),
    load('concept-reviews'),
    load('composition-ingredients'),
    load('composition-reviews'),
  ]);
  return { conceptCatalog, conceptReviews, compositionCatalog, compositionReviews };
}

describe('world roll core', () => {
  let data;
  before(async () => {
    data = await loadData();
  });

  it('derives display names by stripping the family sub-group prefix', () => {
    const family = [
      'posters-covers-sleeves-fillmore-handbill',
      'posters-covers-sleeves-wpa-park-poster',
      'posters-covers-sleeves-pulp-rack',
    ];
    assert.equal(deriveConceptName(family[0], family), 'Fillmore Handbill');
    assert.equal(deriveConceptName(family[1], family), 'WPA Park Poster');
    assert.equal(deriveConceptName('broadcast-programming-teletext-service', ['broadcast-programming-teletext-service']), 'Teletext Service');
  });

  it('keeps at least two tokens when a sibling shares almost the whole id', () => {
    const family = ['deep-sea-lantern-fish', 'deep-sea-lantern-reef'];
    assert.equal(deriveConceptName(family[0], family), 'Lantern Fish');
  });

  it('gives every merged concept a non-empty name', () => {
    for (const concept of mergeConcepts(data)) {
      assert.ok(concept.name && concept.name.trim().length > 1, `no name for ${concept.id}`);
    }
  });

  it('same key reproduces the same roll and exposes names', async () => {
    const [first, second] = await Promise.all([
      rollSeed({ scope: 'direction', key: 'test-key', mode: null, reroll: 0, data }),
      rollSeed({ scope: 'direction', key: 'test-key', mode: null, reroll: 0, data }),
    ]);
    assert.deepEqual(first.challengers.map(c => c.id), second.challengers.map(c => c.id));
    assert.equal(first.challengers.length, 6);
    for (const challenger of first.challengers) {
      assert.ok(challenger.name, `challenger ${challenger.id} has no name`);
      assert.ok(!('status' in challenger) && !('review' in challenger), 'review data must not leak');
    }
  });

  it('rating=3 deals only three-star flagships', async () => {
    const reviews = data.conceptReviews.reviews;
    const roll = await rollSeed({ scope: 'direction', key: 'test-key', mode: null, reroll: 0, rating: 3, data });
    assert.equal(roll.rating, 3);
    assert.equal(roll.challengers.length, 6);
    for (const challenger of roll.challengers) {
      assert.equal(reviews[challenger.id]?.rating, 3, `${challenger.id} is not a flagship`);
    }
  });

  it('rating filter changes the deal without touching the default roll', async () => {
    const plain = await rollSeed({ scope: 'direction', key: 'stable-key', mode: null, reroll: 0, data });
    const plainAgain = await rollSeed({ scope: 'direction', key: 'stable-key', mode: null, reroll: 0, rating: null, data });
    assert.deepEqual(plain.challengers.map(c => c.id), plainAgain.challengers.map(c => c.id));
    assert.equal(plain.rating, null);
  });

  it('reroll deals fresh flagships under the same key', async () => {
    const first = await rollSeed({ scope: 'direction', key: 'test-key', mode: null, reroll: 0, rating: 3, data });
    const second = await rollSeed({ scope: 'direction', key: 'test-key', mode: null, reroll: 1, rating: 3, data });
    const firstIds = new Set(first.challengers.map(c => c.id));
    const overlap = second.challengers.filter(c => firstIds.has(c.id));
    assert.equal(overlap.length, 0, `reroll repeated: ${overlap.map(c => c.id).join(', ')}`);
  });

  // The selection mechanics below existed in concept-seed.mjs but had never been
  // ported here, and nothing in this suite covered composition selection, so the
  // API dealt one unfiltered composition to every real user for as long as that gap
  // stood. These pin the contract so the two implementations cannot drift again.
  it('deals three compositions, all in the requested mode, from distinct families', async () => {
    for (const mode of ['persuade', 'operate', 'read', 'experience']) {
      const roll = await rollSeed({ scope: 'surface', key: `composition-${mode}`, mode, reroll: 0, data });
      assert.equal(roll.compositions.length, 3, `${mode} dealt ${roll.compositions.length}`);
      const ids = new Set(roll.compositions.map(s => s.id));
      assert.equal(ids.size, 3, `${mode} repeated a composition`);
      for (const composition of roll.compositions) {
        assert.equal(composition.surface, mode, `${composition.id} is not a ${mode} composition`);
      }
    }
  });

  // Two generations of installed skills read the old field names off the wire,
  // and the wire is the one place the rename cannot be coordinated. `stagings`
  // is what this dealt while they were called stagings; `staging` predates it
  // dealing three at all.
  it('keeps both legacy field names in step with compositions', async () => {
    const roll = await rollSeed({ scope: 'surface', key: 'legacy-shape', mode: 'operate', reroll: 0, data });
    assert.deepEqual(roll.stagings.map(s => s.id), roll.compositions.map(s => s.id));
    assert.equal(roll.staging.id, roll.compositions[0].id);
  });

  it('never deals a niche world, and deals a marginal one sparingly', async () => {
    const reviews = data.conceptReviews.reviews;
    const modes = ['persuade', 'operate', 'read', 'experience'];
    let dealt = 0;
    let marginal = 0;
    for (let n = 0; n < 40; n += 1) {
      const roll = await rollSeed({ scope: 'direction', key: `gate-${n}`, mode: modes[n % 4], reroll: 0, data });
      for (const challenger of roll.challengers) {
        dealt += 1;
        // Breadth is the real exclusion: a niche world cannot challenge an
        // arbitrary build however good it is, so it never deals.
        assert.notEqual(reviews[challenger.id]?.breadth, 'niche', `${challenger.id} is niche`);
        if (reviews[challenger.id]?.rating === 1) marginal += 1;
      }
    }
    assert.ok(dealt > 200, `only ${dealt} challengers dealt`);
    // A 1-star draws at half weight rather than not at all. Excluding it made a
    // rating do the job breadth already does, and a marginal keep records
    // "unexceptional" rather than "wrong". It should therefore appear, and
    // appear well below its share of the pool.
    const marginalShare = marginal / dealt;
    const poolShare = Object.values(reviews)
      .filter(review => review.status === 'approved' && review.rating === 1 && review.breadth !== 'niche').length
      / Object.values(reviews).filter(review => review.status === 'approved' && review.breadth !== 'niche').length;
    assert.ok(marginalShare < poolShare, `marginal share ${marginalShare.toFixed(3)} should sit below pool share ${poolShare.toFixed(3)}`);
  });

  // Driven by a synthetic verdict rather than catalog data: no composition is
  // marked niche yet, so a data-driven version of this would pass vacuously.
  it('drops a composition from the deal once it is marked niche', async () => {
    const mode = 'operate';
    const before = await rollSeed({ scope: 'surface', key: 'niche-comp', mode, reroll: 0, data });
    const gated = structuredClone(data);
    for (const composition of before.compositions) {
      gated.compositionReviews.reviews[composition.id] = {
        ...gated.compositionReviews.reviews[composition.id],
        breadth: 'niche',
      };
    }
    const after = await rollSeed({ scope: 'surface', key: 'niche-comp', mode, reroll: 0, data: gated });
    const excluded = new Set(before.compositions.map(s => s.id));
    for (const composition of after.compositions) {
      assert.ok(!excluded.has(composition.id), `${composition.id} was dealt after being marked niche`);
    }
    assert.equal(after.compositions.length, 3);
  });
});

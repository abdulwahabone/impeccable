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
});

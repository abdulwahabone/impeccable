// A world reserved for Pro must never be dealt by the free roll.
//
// This is the one thing in the roll where a mistake gives away the paid tier,
// and it is easy to make: the filter lives in this repo's _worldroll-core.js
// rather than in the selection code, because the selection code is materialized
// from the public repo and cannot be edited here. Anyone reading roll-selection
// looking for it will not find it.
//
// Withholding is the default and has to be asked out of, so the test proves both
// halves: that a pro world is absent without the flag, and that the flag is what
// brings it back.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rollSeed, mergeConcepts, WELL_TIERS } from '../functions/api/_worldroll-core.js';

// The deal draws one concept per challenger tier, so every tier needs an
// approved world or selection refuses before the Pro filter is ever reached.
const world = id => ({
  id, form: `${id}, a world`, spark: 'x', system: ['a'], webLeverage: 'y', strength: 'world', tags: [],
});
const conceptCatalog = {
  wells: WELL_TIERS.map(tier => ({ id: `well-${tier}`, tier })),
  families: WELL_TIERS.map(tier => ({
    id: `fam-${tier}`,
    well: `well-${tier}`,
    // Two per tier so removing the reserved one still leaves a legal deal.
    concepts: [world(`fam-${tier}-free`), world(`fam-${tier}-spare`), world(`fam-${tier}-paid`)],
  })),
};
const conceptReviews = {
  reviews: Object.fromEntries(WELL_TIERS.flatMap(tier => [
    [`fam-${tier}-free`, { status: 'approved', rating: 3 }],
    [`fam-${tier}-spare`, { status: 'approved', rating: 3 }],
    [`fam-${tier}-paid`, { status: 'approved', rating: 3, pro: true }],
  ])),
};
const PAID = WELL_TIERS.map(tier => `fam-${tier}-paid`);
const data = {
  conceptCatalog,
  conceptReviews,
  compositionCatalog: { compositions: [] },
  compositionReviews: { reviews: {} },
};

const dealtIds = result => (result.challengers || []).map(concept => concept.id);

describe('worlds reserved for Pro', () => {
  it('marks the flag on the merged concept and only there', () => {
    const merged = mergeConcepts(data);
    for (const id of PAID) assert.equal(merged.find(c => c.id === id).pro, true, `${id} should be pro`);
    assert.equal(merged.find(c => c.id === `fam-${WELL_TIERS[0]}-free`).pro, false);
  });

  it('never deals a pro world on the free roll, across many seeds', async () => {
    // Many keys, because a single roll proving absence proves nothing when only
    // two worlds exist and the deal is small.
    for (let i = 0; i < 40; i += 1) {
      const result = await rollSeed({ scope: 'surface', key: `k${i}`, mode: null, reroll: 0, data });
      const leaked = dealtIds(result).filter(id => PAID.includes(id));
      assert.deepEqual(leaked, [], `seed k${i} dealt ${leaked.join(', ')} on the free roll`);
    }
  });

  it('deals it when Pro is asked for explicitly', async () => {
    const seen = new Set();
    for (let i = 0; i < 40; i += 1) {
      const result = await rollSeed({ scope: 'surface', key: `k${i}`, mode: null, reroll: 0, includePro: true, data });
      for (const id of dealtIds(result)) seen.add(id);
    }
    assert.ok(PAID.some(id => seen.has(id)), 'includePro should bring reserved worlds back into the pool');
  });

  it('counts and revisions describe the pool actually dealt from', async () => {
    const free = await rollSeed({ scope: 'surface', key: 'k', mode: null, reroll: 0, data });
    const pro = await rollSeed({ scope: 'surface', key: 'k', mode: null, reroll: 0, includePro: true, data });
    assert.equal(free.approvedCount, WELL_TIERS.length * 2, 'the free approved count should not include reserved worlds');
    assert.equal(pro.approvedCount, WELL_TIERS.length * 3);
    assert.notEqual(free.poolRevision, pro.poolRevision, 'the pools differ, so their revisions must too');
  });

  it('withholds by default, so a caller that forgets the flag underserves rather than overserves', async () => {
    const result = await rollSeed({ scope: 'surface', key: 'k', mode: null, reroll: 0, data });
    assert.deepEqual(dealtIds(result).filter(id => PAID.includes(id)), []);
  });
});

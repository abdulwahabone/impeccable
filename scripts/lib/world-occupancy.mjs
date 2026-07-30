// Where the world catalog is crowded and where it is empty.
//
// Used by scripts/world-coverage.mjs and by the coverage view in the worlds lab,
// so the report and the page can never disagree. Pure: callers pass the catalog,
// the reviews and the axes definition.
//
// The inversion is the point. Occupancy is not a description of the corpus for
// its own sake, it is the exclusion map a wave draws against: a value that 2% of
// the catalog occupies is an opening, and the suggested weight says so. Reading
// it the other way round, as "author more of what we already have", is how a
// catalog turns into a monoculture.

export const DIGITAL_FAMILIES = new Set(['medium-native', 'digital-design-canon']);
export const MODES = ['persuade', 'operate', 'read', 'experience'];
export const TIERS = ['graphic', 'interaction', 'atmosphere'];

export function mergeWorlds(catalog, reviewData) {
  const tierOf = Object.fromEntries((catalog.wells || []).map(well => [well.id, well.tier]));
  const reviews = reviewData?.reviews || {};
  const worlds = [];
  for (const family of catalog.families || []) {
    for (const concept of family.concepts || []) {
      const review = reviews[concept.id];
      if (review?.status !== 'approved') continue;
      const modes = Array.isArray(review.allowedModes) && review.allowedModes.length > 0
        ? review.allowedModes
        : MODES;
      worlds.push({
        id: concept.id,
        form: concept.form,
        familyId: family.id,
        tier: tierOf[family.well] || null,
        digital: DIGITAL_FAMILIES.has(family.id),
        modes,
        rating: review.rating ?? null,
        system: concept.system || [],
        haystack: `${concept.form} ${(concept.system || []).join(' ')}`.toLowerCase(),
      });
    }
  }
  return worlds;
}

// Word-boundary matching against one named system rule, or the whole entry when
// the axis says "all". Anchored because a bare includes() matched "akan" inside
// "Wakandan" earlier in this catalog's life and reported a franchise world as
// cultural material.
function matches(world, axis, value) {
  const text = axis.rule === 'all'
    ? world.haystack
    : (world.system.find(rule => rule.startsWith(axis.rule)) || '').toLowerCase();
  if (!text) return false;
  return value.match.some(word => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
}

export function computeOccupancy(worlds, axesDefinition) {
  const total = worlds.length || 1;
  const axes = (axesDefinition.axes || []).map(axis => {
    const values = (axis.values || []).map(value => {
      const hits = worlds.filter(world => matches(world, axis, value));
      const share = hits.length / total;
      return {
        id: value.id,
        label: value.label,
        count: hits.length,
        digital: hits.filter(world => world.digital).length,
        share,
        // Inverse of occupancy, so a wave over-samples the openings. Floored so a
        // crowded value never drops out entirely: the goal is a different mix,
        // not a ban.
        weight: Math.max(1, Math.round((1 - share) * 10)),
        thin: share < 0.1,
      };
    });
    // How many worlds this axis places at all. A low number means the values are
    // wrong, not that the corpus is empty, and without it a broken probe reads as
    // a wide-open opening and misdirects the wave written from it.
    const placed = worlds.filter(world => (axis.values || []).some(value => matches(world, axis, value))).length;
    return {
      id: axis.id,
      label: axis.label,
      question: axis.question,
      rule: axis.rule,
      values,
      placed,
      unplaced: worlds.length - placed,
      trustworthy: placed >= worlds.length * 0.6,
    };
  });
  return { total: worlds.length, axes };
}

export function lineageGrid(worlds) {
  return {
    rows: [
      { label: 'digital-native', cells: TIERS.map(tier => worlds.filter(w => w.digital && w.tier === tier).length) },
      { label: 'physical/cultural', cells: TIERS.map(tier => worlds.filter(w => !w.digital && w.tier === tier).length) },
    ],
    tiers: TIERS,
  };
}

export function modePools(worlds) {
  return MODES.map(mode => {
    const pool = worlds.filter(world => world.modes.includes(mode));
    return {
      mode,
      total: pool.length,
      digital: pool.filter(world => world.digital).length,
      byTier: Object.fromEntries(TIERS.map(tier => [tier, pool.filter(world => world.tier === tier).length])),
    };
  });
}

// The openings, ranked. This is what a wave brief is written from.
export function openings(occupancy, limit = 10) {
  return occupancy.axes
    .filter(axis => axis.trustworthy)
    .flatMap(axis => axis.values.map(value => ({ axis: axis.label, ...value })))
    .filter(value => value.thin)
    .sort((a, b) => a.share - b.share)
    .slice(0, limit);
}

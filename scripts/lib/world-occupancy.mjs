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
        // Explicitly recorded axis values, when a wave assigned them rather than
        // leaving them to be inferred from prose.
        axes: concept.axes || null,
        haystack: `${concept.form} ${(concept.system || []).join(' ')}`.toLowerCase(),
      });
    }
  }
  return worlds;
}

// Word-boundary matching, anchored because a bare includes() matched "akan"
// inside "Wakandan" earlier in this catalog's life and reported a franchise
// world as cultural material.
const escapeWord = word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, word) => new RegExp(`\\b${escapeWord(word)}\\b`, 'i').test(text);

function axisText(world, axis) {
  return axis.rule === 'all'
    ? world.haystack
    : (world.system.find(rule => rule.startsWith(axis.rule)) || '').toLowerCase();
}

// Two kinds of probe. A keyword axis asks whether a rule says a thing. A count
// axis asks how many things it names, which is what chroma needed: palette rules
// enumerate pigments rather than naming a colour strategy, so matching on
// "monochrome" or "full spectrum" placed 9 of 281 worlds, while counting the
// colours they name places 93% and produces a real distribution.
// A recorded value is authoritative and a probe is a fallback. Three axes cannot
// be read from prose at all: depth's keywords matched worlds saying "no cast
// shadow anywhere", and motion and colour strategy describe properties the system
// rules never state. Widening keywords there manufactures signal. Recording the
// value when a wave assigns it is what makes those axes real, and it is why the
// assignment and the record are the same act.
function matches(world, axis, value) {
  const recorded = world.axes?.[axis.id];
  if (recorded != null) return recorded === value.id;
  const text = axisText(world, axis);
  if (!text) return false;
  if (axis.kind === 'count') {
    const found = new Set((axis.lexicon || []).filter(word => mentions(text, word)));
    if (found.size === 0) return false;
    if (value.min != null && found.size < value.min) return false;
    if (value.max != null && found.size > value.max) return false;
    return true;
  }
  return (value.match || []).some(word => mentions(text, word));
}

export function computeOccupancy(worlds, axesDefinition) {
  const total = worlds.length || 1;
  const axes = (axesDefinition.axes || []).map(axis => {
    // How many worlds this axis places at all, computed first because whether a
    // value counts as an opening depends on it. A low number means the values are
    // wrong, or the dimension was never authored, not that the corpus is empty.
    const placed = worlds.filter(world => (axis.values || []).some(value => matches(world, axis, value))).length;
    const recorded = worlds.filter(world => world.axes?.[axis.id] != null).length;
    // An axis can be recorded-only: prohibition is an absence and variance needs
    // two instances to see, so neither can be probed from one world's prose. At
    // zero those are not broken probes waiting to be fixed, they are dimensions
    // no wave has assigned yet, and reporting them as failures would send someone
    // hunting for keywords that cannot exist.
    const recordedOnly = axis.recorded === true;
    // An axis is trustworthy when it places most of the corpus, however it got
    // there. Recorded values are exact, so an axis moves from guesswork to fact
    // as a wave fills them in rather than needing a cleverer probe.
    // A recorded-only axis is trusted once most worlds carry a recorded value,
    // never on the strength of a probe it does not have.
    const trustworthy = axis.recorded === true
      ? recorded >= worlds.length * 0.6
      : placed >= worlds.length * 0.6;
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
        // Only an opening if the axis can be trusted. On an axis that places
        // almost nothing every value looks wide open, which is the misreading the
        // health check exists to prevent, so it must not be marked here either.
        thin: share < 0.1 && trustworthy,
      };
    });
    return {
      id: axis.id,
      label: axis.label,
      question: axis.question,
      rule: axis.rule,
      values,
      placed,
      recorded,
      recordedOnly,
      unplaced: worlds.length - placed,
      trustworthy,
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

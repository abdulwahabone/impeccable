// Pure world-roll selection logic, parameterized by catalog data.
//
// This mirrors the selection mechanics in skill/scripts/concept-seed.mjs
// exactly (same salts, same sha256 ranking, same rating weights), computed
// with Web Crypto because Workers have no sync hash. Same key + same pool
// revision therefore reproduces a roll bit-for-bit.
//
// functions/api/_worldroll.js binds this to the catalog snapshot bundled at
// deploy time; the dev server middleware and tests bind it to catalog/ on
// disk. Keeping the logic data-free means both paths run identical code.

export const WELL_TIERS = ['graphic', 'interaction', 'atmosphere'];
export const SEED_MODES = new Set(['persuade', 'operate', 'read', 'experience']);

const encoder = new TextEncoder();

async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function deterministicRank(items, input, idFor = item => item.id) {
  const scored = await Promise.all(items.map(async item => ({
    item,
    id: idFor(item),
    score: await sha256Hex(`${input}:${idFor(item)}`),
  })));
  scored.sort((a, b) => b.score.localeCompare(a.score) || a.id.localeCompare(b.id));
  return scored.map(entry => entry.item);
}

// Concepts carry no display name, so one is derived from the id: strip the
// longest leading token run shared with a sibling in the same family (the
// authoring sub-group prefix), keep at least two tokens, and title-case.
// Overrides catch ids whose sub-group has no sibling to reveal the prefix.
const NAME_ACRONYMS = new Set(['wpa', 'vhs', 'ansi', 'bbs', 'crt', 'ecm', 'ddb', 'lcd', 'tv', 'ui']);
const NAME_OVERRIDES = new Map([
  ['broadcast-programming-teletext-service', 'Teletext Service'],
]);

export function deriveConceptName(conceptId, familyConceptIds) {
  const override = NAME_OVERRIDES.get(conceptId);
  if (override) return override;
  const tokens = conceptId.split('-');
  let shared = 0;
  for (const siblingId of familyConceptIds) {
    if (siblingId === conceptId) continue;
    const siblingTokens = siblingId.split('-');
    let run = 0;
    while (run < tokens.length && run < siblingTokens.length && tokens[run] === siblingTokens[run]) run += 1;
    shared = Math.max(shared, run);
  }
  shared = Math.min(shared, tokens.length - 2);
  return tokens.slice(Math.max(shared, 0))
    .map(word => NAME_ACRONYMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function mergeConcepts({ conceptCatalog, conceptReviews }) {
  const reviews = conceptReviews.reviews || {};
  const wellsById = new Map((conceptCatalog.wells || []).map(well => [well.id, well]));
  const concepts = [];
  for (const family of conceptCatalog.families || []) {
    const familyConceptIds = (family.concepts || []).map(concept => concept.id);
    for (const concept of family.concepts || []) {
      concepts.push({
        ...concept,
        name: deriveConceptName(concept.id, familyConceptIds),
        familyId: family.id,
        wellTier: wellsById.get(family.well)?.tier || null,
        status: reviews[concept.id]?.status || 'pending',
        review: reviews[concept.id] || null,
      });
    }
  }
  return concepts;
}

export function mergeCompositions({ compositionCatalog, compositionReviews }) {
  const reviews = compositionReviews.reviews || {};
  return (compositionCatalog.compositions || []).map(composition => ({
    ...composition,
    status: reviews[composition.id]?.status || 'pending',
  }));
}

export async function approvedPoolRevision(concepts) {
  const payload = concepts
    .filter(concept => concept.status === 'approved')
    .map(concept => `${concept.familyId}:${concept.id}:${concept.strength}:${concept.form}:${concept.spark}:${JSON.stringify(concept.system)}:${concept.webLeverage}`)
    .sort()
    .join('\n');
  return (await sha256Hex(payload)).slice(0, 12);
}

export async function selectApprovedChallengers({ scope, key, reroll = 0, rating = null, concepts }) {
  const approved = concepts.filter(concept => concept.status === 'approved');
  const wanted = scope === 'direction'
    ? new Set(['world', 'dual'])
    : new Set(['composition', 'dual']);
  const approvedByTier = new Map();
  for (const concept of approved) {
    const tier = approvedByTier.get(concept.wellTier) || [];
    tier.push(concept);
    approvedByTier.set(concept.wellTier, tier);
  }
  if (WELL_TIERS.some(tier => !(approvedByTier.get(tier) || []).length)) {
    throw new Error('every challenger tier needs at least one approved concept');
  }
  // Optional minimum-rating gate. Applied per tier and skipped for any tier
  // it would empty, so a thin tier degrades to its full approved pool
  // instead of failing the roll.
  if (rating) {
    for (const [tier, pool] of approvedByTier) {
      const rated = pool.filter(concept => (concept.review?.rating || 0) >= rating);
      if (rated.length > 0) approvedByTier.set(tier, rated);
    }
  }
  for (const [tier, pool] of approvedByTier) {
    const matching = pool.filter(concept => wanted.has(concept.strength));
    if (matching.length > 0) approvedByTier.set(tier, matching);
  }
  const ticketsFor = pool => pool.flatMap(concept => {
    const conceptRating = concept.review?.rating;
    if (conceptRating === 1) return [];
    return conceptRating === 3
      ? [{ concept, ticket: 0 }, { concept, ticket: 1 }]
      : [{ concept, ticket: 0 }];
  });
  const pickRound = async (round, excluded) => {
    const salt = round === 0 ? '' : `:reroll-${round}`;
    const tierOrder = (await deterministicRank(
      WELL_TIERS.map(id => ({ id })),
      `${scope}:${key}:tiers${salt}`
    )).map(item => item.id);
    const picks = [];
    for (const [index, tier] of tierOrder.entries()) {
      let pool = approvedByTier.get(tier).filter(concept => !excluded.has(concept.id));
      if (pool.length === 0) pool = approvedByTier.get(tier);
      let tickets = ticketsFor(pool);
      if (tickets.length === 0) tickets = pool.map(concept => ({ concept, ticket: 0 }));
      const ranked = await deterministicRank(
        tickets,
        `${scope}:${key}:challenger-${index}${salt}`,
        entry => `${entry.concept.id}#${entry.ticket}`
      );
      const order = [];
      const seen = new Set();
      for (const entry of ranked) {
        if (seen.has(entry.concept.id)) continue;
        seen.add(entry.concept.id);
        order.push(entry.concept);
      }
      const first = order[0];
      const second = order.find(concept => concept.familyId !== first.familyId)
        || order.find(concept => concept.id !== first.id);
      picks.push(...(second ? [first, second] : [first]));
    }
    return picks;
  };
  const excluded = new Set();
  let picks = await pickRound(0, excluded);
  for (let round = 1; round <= reroll; round += 1) {
    for (const pick of picks) excluded.add(pick.id);
    picks = await pickRound(round, excluded);
  }
  return { approved, picks };
}

export async function selectApprovedStaging({ scope, key, reroll = 0, mode = null, compositions }) {
  let approved = compositions.filter(composition => composition.status === 'approved');
  if (approved.length === 0) return null;
  if (mode) {
    const matching = approved.filter(composition => composition.surface === mode);
    if (matching.length === 0) return null;
    approved = matching;
  }
  const prior = new Set();
  let pick = (await deterministicRank(approved, `${scope}:${key}:staging`))[0];
  for (let round = 1; round <= reroll; round += 1) {
    prior.add(pick.id);
    const pool = approved.filter(composition => !prior.has(composition.id));
    pick = (await deterministicRank(
      pool.length > 0 ? pool : approved,
      `${scope}:${key}:staging:reroll-${round}`
    ))[0];
  }
  return pick;
}

const CARD_BASE = 'https://impeccable.style/worlds/cards';

const publicConcept = concept => ({
  id: concept.id,
  name: concept.name,
  form: concept.form,
  spark: concept.spark,
  system: concept.system,
  webLeverage: concept.webLeverage,
  wellTier: concept.wellTier,
  // Rendered reference cards: a design-system board and a desktop hero built
  // in this world. They are a craft bar, not a mockup to copy.
  cardBoard: `${CARD_BASE}/${concept.id}.webp`,
  cardHero: `${CARD_BASE}/${concept.id}-hero.webp`,
});

const publicComposition = composition => ({
  id: composition.id,
  form: composition.form,
  spark: composition.spark,
  grammar: composition.grammar,
  webLeverage: composition.webLeverage,
  surface: composition.surface,
});

export async function rollSeed({ scope, key, mode, reroll, rating = null, data }) {
  const concepts = mergeConcepts(data);
  const compositions = mergeCompositions(data);
  const [poolRevision, { approved, picks }, staging] = await Promise.all([
    approvedPoolRevision(concepts),
    selectApprovedChallengers({ scope, key, reroll, rating, concepts }),
    selectApprovedStaging({ scope, key, reroll, mode, compositions }),
  ]);
  return {
    key,
    scope,
    mode: mode || null,
    reroll,
    rating: rating || null,
    poolRevision,
    approvedCount: approved.length,
    catalogCount: concepts.length,
    challengers: picks.map(publicConcept),
    staging: staging ? publicComposition(staging) : null,
  };
}

// Catalog merging and response shaping for the roll API.
//
// Selection itself is NOT here. It lives in the public repo's
// skill/scripts/lib/roll-selection.mjs, which concept-seed.mjs drives too.
// This file used to carry its own copy under a header claiming the two matched
// "exactly"; they did not, and because the catalog never ships with the skill,
// every real user rolls through this path and got none of the gates the seeder
// had. One module, two drivers, no drift.
//
// skill/ is materialized from public main before every build (see
// scripts/fetch-public-skill.mjs), so this import resolves to the released
// selection logic and never to a local mirror. wrangler bundles it: verified,
// and an unresolvable path fails the Functions build loudly rather than
// silently falling back.
//
// functions/api/_worldroll.js binds this to the catalog snapshot bundled at
// deploy time; the dev server middleware and tests bind it to catalog/ on disk.
import {
  runAsyncSelection,
  selectApprovedChallengers as selectApprovedChallengersCore,
  selectApprovedCompositions as selectApprovedCompositionsCore,
  WELL_TIERS,
} from '../../skill/scripts/lib/roll-selection.mjs';

export { WELL_TIERS };
export const SEED_MODES = new Set(['persuade', 'operate', 'read', 'experience']);

const encoder = new TextEncoder();

async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Workers have no synchronous hash, so this side drives the shared generator
// asynchronously. Node's sync hash and Web Crypto return the same bytes, so a
// key reproduces the same roll from either driver.
function driveSelection(generator) {
  return runAsyncSelection(generator, sha256Hex);
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
    // The whole verdict, not just status: selection reads breadth and rating
    // off it. Keeping only status silently disabled both gates here while they
    // were live in concept-seed.mjs.
    review: reviews[composition.id] || null,
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

// The rating query parameter is this API's own feature (a minimum-rating floor
// on a deal); the shared module calls it minRating.
export function selectApprovedChallengers({ scope, key, reroll = 0, rating = null, mode = null, concepts }) {
  return driveSelection(selectApprovedChallengersCore({ scope, key, reroll, minRating: rating, mode, concepts }));
}

export function selectApprovedCompositions({ scope, key, reroll = 0, mode = null, area = null, compositions, count = 3 }) {
  return driveSelection(selectApprovedCompositionsCore({ scope, key, reroll, mode, area, compositions, count }));
}

// Compatibility for callers that need a single sample.
export async function selectApprovedComposition(options) {
  return (await selectApprovedCompositions({ ...options, count: 1 }))[0] ?? null;
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
  // Exposed so a client can tell an on-target composition from a top-up when a
  // thin area was filled out from the rest of the surface.
  area: composition.area ?? null,
});

export async function rollSeed({ scope, key, mode, area = null, reroll, rating = null, data }) {
  const concepts = mergeConcepts(data);
  const compositions = mergeCompositions(data);
  const [poolRevision, { approved, picks }, dealt] = await Promise.all([
    approvedPoolRevision(concepts),
    selectApprovedChallengers({ scope, key, reroll, rating, mode, concepts }),
    selectApprovedCompositions({ scope, key, reroll, mode, area, compositions }),
  ]);
  const publicCompositions = dealt.map(publicComposition);
  return {
    key,
    scope,
    mode: mode || null,
    area: area || null,
    reroll,
    rating: rating || null,
    poolRevision,
    approvedCount: approved.length,
    catalogCount: concepts.length,
    challengers: picks.map(publicConcept),
    compositions: publicCompositions,
    // Two generations of installed skills still read the old field names, and
    // the wire is the one place a rename cannot be coordinated: `stagings` is
    // what this dealt while they were called stagings, `staging` predates it
    // dealing three. Newer clients prefer `compositions` and ignore both.
    stagings: publicCompositions,
    staging: publicCompositions[0] ?? null,
  };
}

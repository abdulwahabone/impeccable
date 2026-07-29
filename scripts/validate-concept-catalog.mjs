#!/usr/bin/env node

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConceptCatalog, validateConceptCatalog } from '../skill/scripts/lib/concept-catalog.mjs';
import { readCompositionCatalog, validateCompositionCatalog } from '../skill/scripts/lib/composition-catalog.mjs';

const CATALOG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'catalog');
const { catalog, reviewData } = readConceptCatalog(
  join(CATALOG_DIR, 'concept-ingredients.json'),
  join(CATALOG_DIR, 'concept-reviews.json')
);
const result = validateConceptCatalog(catalog, reviewData, { minimumTotal: 260 });

const compositionState = readCompositionCatalog(
  join(CATALOG_DIR, 'composition-ingredients.json'),
  join(CATALOG_DIR, 'composition-reviews.json')
);
const compositionResult = validateCompositionCatalog(compositionState.catalog, compositionState.reviewData);

// A world-catalog entry at composition strength cannot be approved: the review
// plugin refuses it outright ("compositions live in the composition catalog"), so
// authoring one guarantees a rejection and a wasted pair of renders. The shared
// validator in skill/ is owned by the public repo and permits it, so this gate
// lives here, where the authoring round actually runs.
// Only pending ones are an error. A reviewer marking an entry "composition" and
// rejecting it is the documented routing flow: it joins the mining queue and
// waits to be migrated, so failing on those would break the reviewer's own
// workflow. A pending one is an authoring mistake that costs a guaranteed
// rejection and a wasted pair of renders.
const compositionStrength = catalog.families
  .flatMap(family => family.concepts.map(concept => ({ family: family.id, concept })))
  .filter(({ concept }) => concept.strength === 'composition');
const unrouted = compositionStrength.filter(({ concept }) => (reviewData.reviews?.[concept.id]?.status || 'pending') === 'pending');
for (const { family, concept } of unrouted) {
  result.errors.push(
    `concept ${concept.id} (${family}) is strength "composition" and still pending: author world-catalog entries as world or dual, since a staging cannot be approved here`
  );
}
const miningQueue = compositionStrength.length - unrouted.length;
if (miningQueue > 0) {
  process.stdout.write(`concept-catalog: ${miningQueue} rejected staging-strength entr${miningQueue === 1 ? 'y' : 'ies'} awaiting migration to the composition catalog\n`);
}

let failed = false;
if (result.errors.length > 0) {
  for (const error of result.errors) process.stderr.write(`concept-catalog: ${error}\n`);
  failed = true;
} else {
  process.stdout.write(
    `concept-catalog: ${result.stats.concepts} concepts across ${result.stats.families} families in ${result.stats.wells} wells; ` +
    `${result.stats.approved} approved, ${result.stats.pending} pending, ${result.stats.rejected} rejected\n`
  );
}
if (compositionResult.errors.length > 0) {
  for (const error of compositionResult.errors) process.stderr.write(`composition-catalog: ${error}\n`);
  failed = true;
} else {
  process.stdout.write(
    `composition-catalog: ${compositionResult.stats.compositions} compositions across ${compositionResult.stats.families} families; ` +
    `${compositionResult.stats.approved} approved, ${compositionResult.stats.rejected} rejected\n`
  );
}
if (failed) process.exitCode = 1;

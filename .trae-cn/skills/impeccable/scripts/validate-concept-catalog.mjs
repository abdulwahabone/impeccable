#!/usr/bin/env node

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConceptCatalog, validateConceptCatalog } from './lib/concept-catalog.mjs';
import { readCompositionCatalog, validateCompositionCatalog } from './lib/composition-catalog.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { catalog, reviewData } = readConceptCatalog(
  join(here, 'concept-ingredients.json'),
  join(here, 'concept-reviews.json')
);
const result = validateConceptCatalog(catalog, reviewData, { minimumTotal: 260 });

const compositionState = readCompositionCatalog(
  join(here, 'composition-ingredients.json'),
  join(here, 'composition-reviews.json')
);
const compositionResult = validateCompositionCatalog(compositionState.catalog, compositionState.reviewData);

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

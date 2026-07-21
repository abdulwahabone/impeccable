// Shared world-roll logic for the /api/roll and /api/chosen endpoints.
//
// The selection mechanics live in _worldroll-core.js, parameterized by
// catalog data so the dev-server middleware and tests can run the same code
// against catalog/ on disk. This module binds the core to the snapshot
// bundled at deploy time from functions/api/_data/, refreshed by
// scripts/sync-api-data.mjs. The catalog never ships to clients in full:
// a roll exposes exactly the entries it deals.

import conceptCatalog from './_data/concept-ingredients.json';
import conceptReviews from './_data/concept-reviews.json';
import compositionCatalog from './_data/composition-ingredients.json';
import compositionReviews from './_data/composition-reviews.json';
import { rollSeed as rollSeedCore, SEED_MODES, WELL_TIERS } from './_worldroll-core.js';

export { SEED_MODES, WELL_TIERS };

const DATA = { conceptCatalog, conceptReviews, compositionCatalog, compositionReviews };

export function rollSeed({ scope, key, mode, reroll, rating = null }) {
  return rollSeedCore({ scope, key, mode, reroll, rating, data: DATA });
}

// Impressions and choices land in Workers Analytics Engine when the binding
// exists; without it, logging is a silent no-op so the roll never fails.
export function logEvent(env, event, fields) {
  try {
    env.ROLL_ANALYTICS?.writeDataPoint({
      blobs: [
        event,
        fields.scope || '',
        fields.mode || '',
        fields.poolRevision || '',
        fields.chosenId || '',
        ...(fields.dealtIds || []),
      ],
      doubles: [fields.reroll || 0],
      indexes: [event],
    });
  } catch {
    // Telemetry must never break a roll.
  }
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

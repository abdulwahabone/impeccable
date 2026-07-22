// The flagship deck, resolved at build time.
//
// impeccable.pro reveals a different world behind the torn paper on every load.
// The list is baked into the page rather than fetched from impeccable.style's
// /api/roll: that endpoint lives on another origin, and a cross-origin image
// would taint the WebGL canvas. Reading the catalog directly also means this
// page has no runtime dependency on the main site being up.
//
// Names come from the same deriveConceptName the roll API uses (via
// mergeConcepts), so a world is called the same thing here as on the homepage.

import fs from 'node:fs';
import path from 'node:path';
import { mergeConcepts } from '../../../functions/api/_worldroll-core.js';

// Walking up for a marker rather than resolving against import.meta.dirname:
// Astro bundles this module into pro/build/.prerender/chunks, so a path relative
// to the module lands somewhere different at build time than in source. The cwd
// also differs between `build:pro` (repo root) and `dev:pro` (pro/).
const ROOT_MARKER = path.join('catalog', 'concept-ingredients.json');

function findRepoRoot() {
  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    if (fs.existsSync(path.join(dir, ROOT_MARKER))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const REPO_ROOT = findRepoRoot();

// Only rating-3 approved concepts. Deliberately stricter than the homepage
// roll, which deals two-star and up: the tear shows one card at a time, so it
// should only ever be a flagship.
const FLAGSHIP_RATING = 3;

function readJson(...segments) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ...segments), 'utf8'));
}

/**
 * @returns {Array<{id: string, name: string, tier: string, v: string}>}
 *   One entry per flagship world that has a generated hero card. `v` is the
 *   card's content hash, used as a cache-busting stamp on the image URL.
 */
export function flagshipWorlds() {
  // A checkout without the catalog is a valid state: the page falls back to the
  // procedural reveal rather than failing the build.
  if (!REPO_ROOT) return [];

  const concepts = mergeConcepts({
    conceptCatalog: readJson('catalog', 'concept-ingredients.json'),
    conceptReviews: readJson('catalog', 'concept-reviews.json'),
  });

  // The manifest is the record of which cards actually exist. A flagship world
  // without a generated hero would render as a blank tear, so it is skipped.
  let manifest = {};
  try {
    manifest = readJson('site', 'public', 'worlds', 'cards', 'manifest.json');
  } catch {
    // A fresh clone has no manifest. The page falls back to the procedural
    // reveal, so an empty list is a valid state rather than a build failure.
    return [];
  }

  return concepts
    .filter(concept => concept.status === 'approved'
      && concept.review?.rating === FLAGSHIP_RATING
      && manifest[concept.id]?.heroGeneratedAt)
    .map(concept => ({
      id: concept.id,
      name: concept.name,
      tier: concept.wellTier,
      v: manifest[concept.id].hash || '',
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

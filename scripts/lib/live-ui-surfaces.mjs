// The Live UI surface keys, read out of the browser script that defines them.
//
// This is a stopgap and it should not survive. The public repo used to export
// this list from skill/scripts/live/ui-core.mjs; commit 667095d2 deleted that
// module and inlined the list inside live-browser.js, where it is a const in
// function scope and cannot be imported. The site build kept working only
// because its materialized copy of skill/ was stale, so the break was latent
// and would have surfaced on any fresh clone or CI run.
//
// The guard it feeds is worth keeping: the Live UI lab must hold a snapshot for
// every surface Live defines, and the build fails when one is missing. Reading
// the real source keeps that true rather than letting the site keep its own list
// and check itself against itself, which would guard nothing.
//
// The proper fix is in the public repo: export the list from a module that
// live-browser.js also consumes. Until then this parses, and it throws rather
// than returning an empty set, because a guard that silently finds nothing is
// worse than no guard.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = path.join(ROOT, 'skill', 'scripts', 'live-browser.js');

export function readLiveUiSurfaces() {
  const source = readFileSync(SOURCE, 'utf8');
  const block = source.match(/const LIVE_UI_SURFACES = \[([\s\S]*?)\n\s*\];/);
  if (!block) {
    throw new Error(`live-ui-surfaces: could not find LIVE_UI_SURFACES in ${path.relative(ROOT, SOURCE)}. `
      + 'The upstream shape changed; fix this parser or, better, export the list from the public repo.');
  }
  const keys = [...block[1].matchAll(/\{\s*key:\s*'([^']+)'/g)].map(match => match[1]);
  if (keys.length === 0) {
    throw new Error('live-ui-surfaces: found the block but no keys. The entry shape changed.');
  }
  return keys.map(key => ({ key }));
}

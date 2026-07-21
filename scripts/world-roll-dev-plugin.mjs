// Dev-server stand-in for the /api/roll Pages Function.
//
// `astro dev` serves static pages only, so the homepage worlds section would
// have nothing to fetch. This middleware runs the same selection core the
// deployed function uses (functions/api/_worldroll-core.js) against the live
// catalog/ files on disk. Deterministic keys reproduce production rolls
// whenever the local catalog matches the deployed _data snapshot.
//
// /api/chosen is accepted and dropped: dev choices are not telemetry.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { rollSeed, SEED_MODES } from '../functions/api/_worldroll-core.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

async function readCatalogData() {
  const load = async name => JSON.parse(await readFile(path.join(ROOT, 'catalog', `${name}.json`), 'utf8'));
  const [conceptCatalog, conceptReviews, compositionCatalog, compositionReviews] = await Promise.all([
    load('concept-ingredients'),
    load('concept-reviews'),
    load('composition-ingredients'),
    load('composition-reviews'),
  ]);
  return { conceptCatalog, conceptReviews, compositionCatalog, compositionReviews };
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`${JSON.stringify(payload)}\n`);
}

export function worldRollDevPlugin() {
  return {
    name: 'impeccable-world-roll-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/chosen', (req, res) => {
        res.statusCode = 204;
        res.end();
      });
      server.middlewares.use('/api/roll', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const scope = url.searchParams.get('scope') || 'surface';
          const mode = url.searchParams.get('mode') || null;
          const key = url.searchParams.get('key') || Math.random().toString(36).slice(2, 10);
          const reroll = Number(url.searchParams.get('reroll') || 0);
          const rating = url.searchParams.has('rating') ? Number(url.searchParams.get('rating')) : null;
          if (scope !== 'direction' && scope !== 'surface') {
            return json(res, 400, { error: 'scope must be direction or surface' });
          }
          if (mode !== null && !SEED_MODES.has(mode)) {
            return json(res, 400, { error: 'mode must be persuade, operate, read, or experience' });
          }
          if (!Number.isInteger(reroll) || reroll < 0 || reroll > 8) {
            return json(res, 400, { error: 'reroll must be an integer between 0 and 8' });
          }
          if (!/^[a-z0-9-]{1,64}$/i.test(key)) {
            return json(res, 400, { error: 'key must be 1-64 alphanumeric characters' });
          }
          if (rating !== null && ![1, 2, 3].includes(rating)) {
            return json(res, 400, { error: 'rating must be 1, 2, or 3' });
          }
          const data = await readCatalogData();
          json(res, 200, await rollSeed({ scope, key, mode, reroll, rating, data }));
        } catch (error) {
          json(res, 500, { error: error.message });
        }
      });
    },
  };
}

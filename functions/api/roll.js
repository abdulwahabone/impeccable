// GET /api/roll?scope=direction|surface&mode=<persuade|operate|read|experience>&key=<key>&reroll=<n>&rating=<min>
//
// Deals a deterministic concept roll: six challengers (two per translation
// tier, rating-weighted) plus three mode-matched compositions. Same key and
// same pool revision reproduces the roll. The request is the impression record.
// The optional rating param gates challengers to reviews at or above that
// star rating (rating=3 deals flagships only); omitted, the full approved
// pool stays in play.

import { rollSeed, logEvent, SEED_MODES, CORS_HEADERS } from './_worldroll.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') || 'surface';
  const mode = url.searchParams.get('mode') || null;
  const key = url.searchParams.get('key') || crypto.randomUUID().slice(0, 8);
  const reroll = Number(url.searchParams.get('reroll') || 0);
  const rating = url.searchParams.has('rating') ? Number(url.searchParams.get('rating')) : null;

  if (scope !== 'direction' && scope !== 'surface') {
    return Response.json({ error: 'scope must be direction or surface' }, { status: 400, headers: CORS_HEADERS });
  }
  if (mode !== null && !SEED_MODES.has(mode)) {
    return Response.json({ error: 'mode must be persuade, operate, read, or experience' }, { status: 400, headers: CORS_HEADERS });
  }
  if (!Number.isInteger(reroll) || reroll < 0 || reroll > 8) {
    return Response.json({ error: 'reroll must be an integer between 0 and 8' }, { status: 400, headers: CORS_HEADERS });
  }
  if (!/^[a-z0-9-]{1,64}$/i.test(key)) {
    return Response.json({ error: 'key must be 1-64 alphanumeric characters' }, { status: 400, headers: CORS_HEADERS });
  }
  if (rating !== null && ![1, 2, 3].includes(rating)) {
    return Response.json({ error: 'rating must be 1, 2, or 3' }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const roll = await rollSeed({ scope, key, mode, reroll, rating });
    logEvent(env, 'roll', {
      scope,
      mode,
      reroll,
      poolRevision: roll.poolRevision,
      // Every dealt composition, not just the first. This read roll.staging back
      // when the API dealt one, so two of the three went unrecorded.
      dealtIds: [
        ...roll.challengers.map(challenger => challenger.id),
        ...roll.compositions.map(composition => composition.id),
      ].filter(Boolean),
    });
    return Response.json(roll, {
      headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}

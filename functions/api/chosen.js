// POST /api/chosen { key, poolRevision, chosenId?, scope?, mode?, kind?, register? }
//
// Anonymous choice ping: one per resolved attended direction round. kind
// names which card class won (assigned / pick / challenger / canon) so
// pick-share and canon-share have a denominator; chosenId rides along only
// when a dealt catalog world won; register (safer / bolder) marks a round
// that came from a steered hand. The legacy id-only shape (no kind) stays
// valid. No project data, no user identity, and the client never sends its
// grounded candidates' names; senders honor DO_NOT_TRACK and
// IMPECCABLE_NO_TELEMETRY before calling. Always answers 204 so a failed
// record can never disturb a design flow.

import { logEvent, CORS_HEADERS } from './_worldroll.js';

const CARD_KINDS = new Set(['assigned', 'pick', 'challenger', 'canon']);

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const rawId = typeof body.chosenId === 'string' ? body.chosenId.slice(0, 120) : '';
    const chosenId = rawId && /^[a-z0-9-]+$/.test(rawId) ? rawId : '';
    const kind = typeof body.kind === 'string' && CARD_KINDS.has(body.kind) ? body.kind : '';
    const register = body.register === 'safer' || body.register === 'bolder' ? body.register : '';
    // A valid catalog id (legacy shape) or a valid kind (denominator ping)
    // records; anything else drops.
    if (chosenId || kind) {
      logEvent(env, 'chosen', {
        scope: typeof body.scope === 'string' ? body.scope.slice(0, 16) : '',
        mode: typeof body.mode === 'string' ? body.mode.slice(0, 16) : '',
        poolRevision: typeof body.poolRevision === 'string' ? body.poolRevision.slice(0, 16) : '',
        chosenId,
        kind,
        register,
      });
    }
  } catch {
    // Malformed pings are dropped silently.
  }
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

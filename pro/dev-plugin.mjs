// Dev-server stand-ins for this project's Pages Functions.
//
// `astro dev` serves static pages only, so the form would post into nothing.
// This middleware runs the same validation core the deployed function uses
// (pro/functions/api/_waitlist-core.js) and keeps signups in memory, so the
// success and error states are both reachable locally without touching D1.
//
// No email is sent in dev. Signups are logged to the terminal instead.

import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeEmail,
  isValidEmail,
  sanitizeField,
  RATE_LIMIT_MAX,
} from './functions/api/_waitlist-core.js';

// Cards live in R2 in production (pro/functions/worlds/cards). In dev they come
// off disk from the main site's generation output, so the shader has a texture
// without a network round trip to impeccable.style.
const LOCAL_CARD_DIR = path.resolve(
  import.meta.dirname, '..', 'site', 'public', 'worlds', 'cards',
);

function serveLocalCard(req, res) {
  const name = (req.url || '').split('?')[0].replace(/^\//, '');
  if (!/^[a-z0-9-]+\.webp$/.test(name)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  const file = path.join(LOCAL_CARD_DIR, name);
  if (!file.startsWith(LOCAL_CARD_DIR) || !fs.existsSync(file)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(file).pipe(res);
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`${JSON.stringify(payload)}\n`);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export function proDevPlugin() {
  // Module-scoped so a hot reload of a page does not wipe the list mid-test.
  const signups = new Map();
  let submissions = 0;

  return {
    name: 'impeccable-pro-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/worlds/cards', serveLocalCard);

      server.middlewares.use('/api/waitlist', async (req, res) => {
        if (req.method !== 'POST') {
          json(res, 405, { ok: false, error: 'method-not-allowed' });
          return;
        }

        let body;
        try {
          body = JSON.parse(await readBody(req));
        } catch {
          json(res, 400, { ok: false, error: 'bad-request' });
          return;
        }

        const email = normalizeEmail(body?.email);
        if (!isValidEmail(email)) {
          json(res, 400, { ok: false, error: 'invalid-email' });
          return;
        }

        // Everything in dev shares one client, so the counter stands in for the
        // per-IP window. Restart the server to clear it.
        submissions += 1;
        if (submissions > RATE_LIMIT_MAX) {
          json(res, 429, { ok: false, error: 'rate-limited' });
          return;
        }

        const isNew = !signups.has(email);
        signups.set(email, {
          source: sanitizeField(body?.source, 60),
          at: new Date().toISOString(),
        });
        server.config.logger.info(
          `  waitlist(dev) ${isNew ? 'added' : 'already listed'} ${email} `
          + `(${signups.size} total, ${RATE_LIMIT_MAX - submissions} before rate limit)`,
        );

        json(res, 200, { ok: true });
      });
    },
  };
}

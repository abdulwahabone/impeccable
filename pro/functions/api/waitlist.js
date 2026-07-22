// POST /api/waitlist: the Impeccable Pro waitlist.
//
// Storage is D1 (binding DB, see pro/wrangler.toml). The confirmation email goes
// out through the Cloudflare Email Service REST API rather than the Workers
// `EMAIL` binding, because send bindings are a Workers feature and this is a
// Pages Function. That also means the whole thing degrades to "stored, not
// mailed" if the sending domain is not onboarded yet.
//
// Env:
//   DB                  D1 binding (required)
//   CF_ACCOUNT_ID       Cloudflare account id       (optional; no id, no email)
//   CF_EMAIL_TOKEN      API token with email send   (optional; no token, no email)
//   WAITLIST_FROM       verified sender, e.g. hello@impeccable.pro
//   WAITLIST_IP_SALT    salt for the stored IP hash

import {
  normalizeEmail,
  isValidEmail,
  sanitizeField,
  hashIp,
  windowStartIso,
  RATE_LIMIT_MAX,
} from './_waitlist-core.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function json(payload, status = 200) {
  return new Response(`${JSON.stringify(payload)}\n`, { status, headers: JSON_HEADERS });
}

const CONFIRMATION_SUBJECT = 'You are on the Impeccable Pro list';

function confirmationText() {
  return [
    'You are on the list for Impeccable Pro.',
    '',
    'What you can count on: the world catalog grows every week, human-reviewed,',
    'and every design in it works as a direct seed for a build.',
    '',
    'What is still being figured out: detector rules learned from your own design',
    'system, and a hosted place to keep every generation, variant and audit.',
    'You will hear about those when they work, not before.',
    '',
    'No other mail from this address until there is something to open.',
    '',
    'Paul',
    'https://impeccable.style',
  ].join('\n');
}

function confirmationHtml() {
  return [
    '<p>You are on the list for Impeccable Pro.</p>',
    '<p><strong>What you can count on:</strong> the world catalog grows every week,',
    'human-reviewed, and every design in it works as a direct seed for a build.</p>',
    '<p><strong>What is still being figured out:</strong> detector rules learned from',
    'your own design system, and a hosted place to keep every generation, variant',
    'and audit. You will hear about those when they work, not before.</p>',
    '<p>No other mail from this address until there is something to open.</p>',
    '<p>Paul<br><a href="https://impeccable.style">impeccable.style</a></p>',
  ].join('\n');
}

/**
 * Fire the confirmation. Never throws: a signup that is stored but unmailed is a
 * far better outcome than a 500 that loses the address, and the sending domain
 * may not be onboarded yet.
 */
async function sendConfirmation(env, email) {
  const accountId = env.CF_ACCOUNT_ID;
  const token = env.CF_EMAIL_TOKEN;
  const from = env.WAITLIST_FROM;
  if (!accountId || !token || !from) return { sent: false, reason: 'not-configured' };

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          from,
          subject: CONFIRMATION_SUBJECT,
          text: confirmationText(),
          html: confirmationHtml(),
        }),
      },
    );
    if (!res.ok) {
      console.error(`waitlist: email send failed with HTTP ${res.status}`);
      return { sent: false, reason: `http-${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error('waitlist: email send threw', err?.message || err);
    return { sent: false, reason: 'threw' };
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    console.error('waitlist: DB binding missing');
    return json({ ok: false, error: 'unavailable' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad-request' }, 400);
  }

  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) {
    return json({ ok: false, error: 'invalid-email' }, 400);
  }

  const ip = request.headers.get('CF-Connecting-IP');
  const ipHash = await hashIp(ip, env.WAITLIST_IP_SALT || '');
  const source = sanitizeField(body?.source, 60);
  const referrer = sanitizeField(request.headers.get('Referer'), 300);
  const country = sanitizeField(request.headers.get('CF-IPCountry'), 2);

  try {
    if (ipHash) {
      const since = windowStartIso(Date.now());
      const recent = await env.DB
        .prepare('SELECT COUNT(*) AS n FROM waitlist WHERE ip_hash = ? AND created_at > ?')
        .bind(ipHash, since)
        .first();
      if ((recent?.n ?? 0) >= RATE_LIMIT_MAX) {
        return json({ ok: false, error: 'rate-limited' }, 429);
      }
    }

    // INSERT OR IGNORE plus the UNIQUE index on email makes a repeat submit a
    // no-op. `changes` tells us whether this was a new signup, which is the only
    // thing that decides if an email goes out.
    const result = await env.DB
      .prepare(
        `INSERT OR IGNORE INTO waitlist (email, source, referrer, ip_hash, country)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(email, source, referrer, ipHash, country)
      .run();

    const isNew = (result?.meta?.changes ?? 0) > 0;
    if (isNew) {
      await sendConfirmation(env, email);
    }

    // Deliberately identical for new and already-present addresses. Telling the
    // client which one it was would turn this endpoint into a way to test
    // whether a given person is on the list.
    return json({ ok: true });
  } catch (err) {
    console.error('waitlist: insert failed', err?.message || err);
    return json({ ok: false, error: 'server-error' }, 500);
  }
}

// A GET here is someone poking at the URL, not a bug worth a stack trace.
export function onRequestGet() {
  return json({ ok: false, error: 'method-not-allowed' }, 405);
}

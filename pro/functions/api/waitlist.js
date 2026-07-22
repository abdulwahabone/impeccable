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
//   WAITLIST_UNSUB_SECRET  HMAC key for unsubscribe links. Treat as write-once:
//                          rotating it invalidates the links in mail already
//                          delivered. Unset falls back to a mailto unsubscribe.

import {
  normalizeEmail,
  isValidEmail,
  sanitizeField,
  hashIp,
  windowStartIso,
  unsubscribeToken,
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

function confirmationText(unsubUrl) {
  return [
    'You are on the list for Impeccable Pro.',
    '',
    'Many have asked me what a paid version of Impeccable would look like. We are',
    'hard at work so we can answer that question in the most satisfying way',
    'possible.',
    '',
    'You will get one mail when there is something to open. Nothing before that.',
    '',
    'Now go forth and explore some visual worlds with Impeccable 4.',
    '',
    'Paul',
    'https://impeccable.style',
    '',
    `Unsubscribe: ${unsubUrl}`,
  ].join('\n');
}

function confirmationHtml(unsubUrl) {
  return [
    '<p>You are on the list for Impeccable Pro.</p>',
    '<p>Many have asked me what a paid version of Impeccable would look like. We are',
    'hard at work so we can answer that question in the most satisfying way',
    'possible.</p>',
    '<p>You will get one mail when there is something to open. Nothing before that.</p>',
    '<p>Now go forth and explore some visual worlds with Impeccable 4.</p>',
    '<p>Paul<br><a href="https://impeccable.style">impeccable.style</a></p>',
    `<p style="font-size:13px;color:#888"><a href="${unsubUrl}">Unsubscribe</a></p>`,
  ].join('\n');
}

/**
 * Fire the confirmation. Never throws: a signup that is stored but unmailed is a
 * far better outcome than a 500 that loses the address, and the sending domain
 * may not be onboarded yet.
 */
async function sendConfirmation(env, email, origin) {
  const accountId = env.CF_ACCOUNT_ID;
  const token = env.CF_EMAIL_TOKEN;
  const from = env.WAITLIST_FROM;
  if (!accountId || !token || !from) return { sent: false, reason: 'not-configured' };

  // Every mail carries a way out. With the secret set that is a one-click link;
  // without it, a mailto so the message is never sent with no route at all,
  // which is what the signup form promises.
  const unsubToken = await unsubscribeToken(email, env.WAITLIST_UNSUB_SECRET);
  const unsubUrl = unsubToken
    ? `${origin}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken}`
    : `mailto:${from}?subject=${encodeURIComponent('Unsubscribe')}`;
  if (!unsubToken) {
    console.error('waitlist: WAITLIST_UNSUB_SECRET unset, falling back to mailto unsubscribe');
  }

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
          text: confirmationText(unsubUrl),
          html: confirmationHtml(unsubUrl),
          // RFC 8058. List-Unsubscribe-Post is what turns the header into the
          // native one-click button in Gmail and Apple Mail, and it POSTs, which
          // is why the endpoint keeps GET read-only.
          headers: unsubToken
            ? {
              'List-Unsubscribe': `<${unsubUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            }
            : { 'List-Unsubscribe': `<${unsubUrl}>` },
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
      await sendConfirmation(env, email, new URL(request.url).origin);
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

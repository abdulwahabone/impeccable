// Unsubscribe from the Impeccable Pro waitlist.
//
// GET  shows a confirm page and changes nothing.
// POST removes the address.
//
// The split matters. Mail clients, security scanners and link previewers fetch
// every URL in a message, so a GET that unsubscribed on sight would quietly
// remove people who never clicked anything. RFC 8058 one-click unsubscribe uses
// POST for exactly this reason, and the List-Unsubscribe-Post header on the
// outgoing mail opts into it, so Gmail and Apple Mail show a native button that
// lands on the POST below.
//
// The token authenticates the request, so there is no CSRF concern and no need
// for a session: a one-click POST arrives with no cookies by design.

import { normalizeEmail, unsubscribeToken, tokensMatch } from './_waitlist-core.js';

const PAGE_STYLE = `
  body { margin:0; min-height:100vh; display:flex; align-items:center;
    justify-content:center; background:oklch(7% 0.006 95); color:oklch(88% 0 0);
    font:400 15px/1.7 "Albert Sans","Avenir Next",Helvetica,Arial,sans-serif; }
  main { max-width:34rem; padding:40px 28px; }
  h1 { margin:0 0 14px; font-size:1.5rem; font-weight:400; color:oklch(91% 0 0); }
  p { margin:0 0 18px; color:oklch(72% 0 0); }
  .addr { color:oklch(91% 0 0); }
  button { padding:13px 22px; border:1px solid oklch(84% 0.19 80.46);
    border-radius:2px; background:oklch(84% 0.19 80.46); color:oklch(14% 0.018 95);
    font:500 15px/1 inherit; cursor:pointer; }
  a { color:oklch(77% 0.13 82); }
`;

function page(title, bodyHtml, status = 200) {
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${title}</title><style>${PAGE_STYLE}</style></head>
<body><main>${bodyHtml}</main></body></html>`;
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// A function, not a constant. Two reasons, and the deploy caught the first:
// building a Response in module scope is a disallowed global-scope operation in
// the Workers runtime, and a Response body can only be consumed once, so a
// shared instance would break every request after the first.
function badLink() {
  return page(
    'Link not valid',
    `<h1>That link is not valid</h1>
     <p>It may have been broken across lines by a mail client, or the address may
     already be off the list. Nothing has changed.</p>
     <p><a href="https://impeccable.style">impeccable.style</a></p>`,
    400,
  );
}

/** Validate the query pair. Returns the address, or null when it does not check out. */
async function authorize(request, env) {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get('e'));
  const token = url.searchParams.get('t') || '';
  if (!email || !token) return null;

  const expected = await unsubscribeToken(email, env.WAITLIST_UNSUB_SECRET);
  // No secret configured means no token can be verified, so refuse rather than
  // fall through to removing whatever address the query names.
  if (!expected) return null;

  return tokensMatch(token, expected) ? email : null;
}

export async function onRequestGet({ request, env }) {
  const email = await authorize(request, env);
  if (!email) return badLink();

  const url = new URL(request.url);
  return page(
    'Unsubscribe',
    `<h1>Leave the Pro list?</h1>
     <p><span class="addr">${escapeHtml(email)}</span> is on the Impeccable Pro
     waitlist. Confirm below and the address is removed, not flagged: nothing of
     it is kept.</p>
     <form method="POST" action="${escapeHtml(url.pathname + url.search)}">
       <button type="submit">Unsubscribe</button>
     </form>`,
  );
}

export async function onRequestPost({ request, env }) {
  const email = await authorize(request, env);
  if (!email) return badLink();

  if (!env.DB) {
    console.error('unsubscribe: DB binding missing');
    return page(
      'Not available',
      `<h1>Briefly unavailable</h1><p>Try the link again in a minute.</p>`,
      503,
    );
  }

  try {
    // Deleted, not flagged. There is no reason to keep an address that asked to
    // be gone, and a later signup by the same person is theirs to make.
    await env.DB.prepare('DELETE FROM waitlist WHERE email = ?').bind(email).run();
  } catch (err) {
    console.error('unsubscribe: delete failed', err?.message || err);
    return page(
      'Something broke',
      `<h1>That did not go through</h1><p>Try the link again in a minute.</p>`,
      500,
    );
  }

  return page(
    'Unsubscribed',
    `<h1>Removed</h1>
     <p><span class="addr">${escapeHtml(email)}</span> is off the list, and no
     further mail will go to it.</p>
     <p><a href="https://impeccable.style">impeccable.style</a></p>`,
  );
}

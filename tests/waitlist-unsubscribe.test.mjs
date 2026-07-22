// The unsubscribe endpoint for the impeccable.pro waitlist.
//
// Two properties matter enough to pin down here. A GET must never remove an
// address, because mail clients and security scanners fetch every link in a
// message and would otherwise unsubscribe people who never clicked. And a
// request must carry the token for the address it names, or one person's link
// would remove someone else.

import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet, onRequestPost } from '../pro/functions/api/unsubscribe.js';
import { unsubscribeToken } from '../pro/functions/api/_waitlist-core.js';

const SECRET = 'test-unsub-secret';
const EMAIL = 'paul@example.com';

/** A D1 stand-in that records every statement it is given. */
function stubDb() {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      const record = { sql, bindings: null };
      statements.push(record);
      return {
        bind(...bindings) {
          record.bindings = bindings;
          return this;
        },
        run: async () => ({ meta: { changes: 1 } }),
      };
    },
  };
}

function url(email, token) {
  const params = new URLSearchParams();
  if (email !== undefined) params.set('e', email);
  if (token !== undefined) params.set('t', token);
  return `https://impeccable.pro/api/unsubscribe?${params}`;
}

async function validToken(email = EMAIL) {
  return unsubscribeToken(email, SECRET);
}

test('GET with a valid token confirms and removes nothing', async () => {
  const db = stubDb();
  const res = await onRequestGet({
    request: new Request(url(EMAIL, await validToken())),
    env: { DB: db, WAITLIST_UNSUB_SECRET: SECRET },
  });

  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /Leave the Pro list\?/);
  assert.match(body, /method="POST"/, 'the confirm action has to be a POST');
  assert.match(body, /paul@example\.com/);
  assert.deepEqual(db.statements, [], 'a GET must not touch the database');
});

test('GET with a bad token is refused', async () => {
  const db = stubDb();
  const res = await onRequestGet({
    request: new Request(url(EMAIL, 'f'.repeat(32))),
    env: { DB: db, WAITLIST_UNSUB_SECRET: SECRET },
  });

  assert.equal(res.status, 400);
  assert.deepEqual(db.statements, []);
});

test('POST with a valid token deletes exactly that address', async () => {
  const db = stubDb();
  const res = await onRequestPost({
    request: new Request(url(EMAIL, await validToken()), { method: 'POST' }),
    env: { DB: db, WAITLIST_UNSUB_SECRET: SECRET },
  });

  assert.equal(res.status, 200);
  assert.match(await res.text(), /Removed/);
  assert.equal(db.statements.length, 1);
  assert.match(db.statements[0].sql, /^DELETE FROM waitlist WHERE email = \?$/);
  assert.deepEqual(db.statements[0].bindings, [EMAIL]);
});

test('POST normalizes the address before matching, so casing cannot miss the row', async () => {
  const db = stubDb();
  const res = await onRequestPost({
    request: new Request(url('  PAUL@Example.COM ', await validToken()), { method: 'POST' }),
    env: { DB: db, WAITLIST_UNSUB_SECRET: SECRET },
  });

  assert.equal(res.status, 200);
  assert.deepEqual(db.statements[0].bindings, [EMAIL]);
});

test('POST refuses one address with another address token', async () => {
  const db = stubDb();
  const res = await onRequestPost({
    request: new Request(
      url('someone@example.com', await validToken(EMAIL)),
      { method: 'POST' },
    ),
    env: { DB: db, WAITLIST_UNSUB_SECRET: SECRET },
  });

  assert.equal(res.status, 400);
  assert.deepEqual(db.statements, [], 'a mismatched token must delete nothing');
});

test('POST refuses when no secret is configured', async () => {
  const db = stubDb();
  // Without a secret no token can be verified, so the endpoint must refuse
  // rather than fall through to deleting whatever the query names.
  const res = await onRequestPost({
    request: new Request(url(EMAIL, 'a'.repeat(32)), { method: 'POST' }),
    env: { DB: db },
  });

  assert.equal(res.status, 400);
  assert.deepEqual(db.statements, []);
});

test('POST refuses a missing address or token', async () => {
  for (const target of [url(EMAIL, undefined), url(undefined, 'a'.repeat(32)), url()]) {
    const db = stubDb();
    const res = await onRequestPost({
      request: new Request(target, { method: 'POST' }),
      env: { DB: db, WAITLIST_UNSUB_SECRET: SECRET },
    });
    assert.equal(res.status, 400, `expected refusal for ${target}`);
    assert.deepEqual(db.statements, []);
  }
});

test('the address is escaped into the page, not injected', async () => {
  // The address comes off the query string, so it reaches the HTML unvalidated
  // beyond the token check. A token holder should not be able to inject markup.
  const nasty = 'a<script>alert(1)</script>@example.com';
  const res = await onRequestGet({
    request: new Request(url(nasty, await validToken(nasty.toLowerCase()))),
    env: { DB: stubDb(), WAITLIST_UNSUB_SECRET: SECRET },
  });

  const body = await res.text();
  assert.ok(!body.includes('<script>alert(1)</script>'), 'raw markup must not survive');
  assert.match(body, /&lt;script&gt;/);
});

test('a DB failure reports rather than claiming success', async () => {
  const res = await onRequestPost({
    request: new Request(url(EMAIL, await validToken()), { method: 'POST' }),
    env: {
      DB: { prepare() { throw new Error('d1 down'); } },
      WAITLIST_UNSUB_SECRET: SECRET,
    },
  });

  assert.equal(res.status, 500);
  assert.doesNotMatch(await res.text(), /Removed/);
});

test('a missing DB binding is a 503, not a crash', async () => {
  const res = await onRequestPost({
    request: new Request(url(EMAIL, await validToken()), { method: 'POST' }),
    env: { WAITLIST_UNSUB_SECRET: SECRET },
  });

  assert.equal(res.status, 503);
});

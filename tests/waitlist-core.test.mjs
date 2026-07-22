// Validation core for the impeccable.pro waitlist. Both the deployed Pages
// Function and the dev middleware import these, so a regression here would let
// junk into D1 through either path.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeEmail,
  isValidEmail,
  sanitizeField,
  hashIp,
  windowStartIso,
  MAX_EMAIL_LENGTH,
  RATE_LIMIT_WINDOW_MS,
} from '../pro/functions/api/_waitlist-core.js';

// Control characters by code point, so no raw bytes sit in this file where an
// editor or a diff could silently eat them.
const ctrl = code => String.fromCharCode(code);

test('normalizeEmail collapses the case and padding that create duplicate rows', () => {
  assert.equal(normalizeEmail('  Paul@Example.COM '), 'paul@example.com');
  assert.equal(normalizeEmail('paul@example.com'), 'paul@example.com');
  // Non-strings arrive from JSON bodies we do not control.
  assert.equal(normalizeEmail(undefined), '');
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail(42), '');
  assert.equal(normalizeEmail({ email: 'x@y.com' }), '');
});

test('isValidEmail accepts the addresses people actually sign up with', () => {
  for (const email of [
    'paul@example.com',
    'paul.bakaus@example.co.uk',
    'paul+pro@example.com',
    'p@e.io',
    'first_last@sub.domain.example.com',
    "o'brien@example.com",
  ]) {
    assert.equal(isValidEmail(email), true, `expected valid: ${email}`);
  }
});

test('isValidEmail rejects malformed input', () => {
  for (const email of [
    '',
    'not-an-email',
    'no-at-sign.com',
    '@example.com',
    'paul@',
    'paul@localhost', // no dot in the domain, undeliverable from a signup form
    'paul@example..com',
    'paul with space@example.com',
    'paul@exam ple.com',
    'paul@example.com,other@example.com', // a pasted list, not one address
    'paul@example.com;other@example.com',
    '<paul@example.com>',
    'paul\t@example.com',
  ]) {
    assert.equal(isValidEmail(email), false, `expected invalid: ${email}`);
  }
});

test('isValidEmail rejects an address longer than SMTP allows', () => {
  const localPart = 'a'.repeat(MAX_EMAIL_LENGTH);
  const tooLong = `${localPart}@example.com`;
  assert.ok(tooLong.length > MAX_EMAIL_LENGTH);
  assert.equal(isValidEmail(tooLong), false);

  // Exactly at the limit still passes.
  const atLimit = `${'a'.repeat(MAX_EMAIL_LENGTH - '@example.com'.length)}@example.com`;
  assert.equal(atLimit.length, MAX_EMAIL_LENGTH);
  assert.equal(isValidEmail(atLimit), true);
});

test('sanitizeField strips control characters and caps length', () => {
  assert.equal(sanitizeField('  homepage-worlds  '), 'homepage-worlds');
  assert.equal(sanitizeField(`pro${ctrl(0)}page${ctrl(31)}`), 'propage');
  assert.equal(sanitizeField(`drop${ctrl(127)}`), 'drop');
  // Newlines are control characters too, which is what keeps a stored value
  // from spanning lines in an export.
  assert.equal(sanitizeField('one\ntwo'), 'onetwo');
  assert.equal(sanitizeField('x'.repeat(50), 10), 'x'.repeat(10));
});

test('sanitizeField returns null for absent or empty values', () => {
  assert.equal(sanitizeField(undefined), null);
  assert.equal(sanitizeField(null), null);
  assert.equal(sanitizeField(''), null);
  assert.equal(sanitizeField('   '), null);
  assert.equal(sanitizeField(`${ctrl(0)}${ctrl(1)}`), null);
  assert.equal(sanitizeField(123), null);
});

test('hashIp is deterministic, salted, and never returns the address', async () => {
  const a = await hashIp('203.0.113.7', 'salt');
  const b = await hashIp('203.0.113.7', 'salt');
  assert.equal(a, b, 'same ip and salt must collide so rate limiting works');
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes('203.0.113.7'));

  const different = await hashIp('203.0.113.8', 'salt');
  assert.notEqual(a, different);

  // Rotating the salt must invalidate old hashes.
  const resalted = await hashIp('203.0.113.7', 'other-salt');
  assert.notEqual(a, resalted);
});

test('hashIp returns null when the platform gave us no IP', async () => {
  assert.equal(await hashIp(null), null);
  assert.equal(await hashIp(undefined), null);
  assert.equal(await hashIp(''), null);
});

test('windowStartIso returns the ISO timestamp one window back', () => {
  const now = Date.parse('2026-07-21T12:00:00.000Z');
  assert.equal(windowStartIso(now, 60 * 60 * 1000), '2026-07-21T11:00:00.000Z');
  // Default window is the one the function enforces against.
  assert.equal(
    windowStartIso(now),
    new Date(now - RATE_LIMIT_WINDOW_MS).toISOString(),
  );
});

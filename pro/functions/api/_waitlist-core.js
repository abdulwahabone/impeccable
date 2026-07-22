// Pure helpers shared by the deployed /api/waitlist function and its dev-server
// stand-in (pro/dev-plugin.mjs). No platform APIs in here beyond
// WebCrypto, which both Workers and Node expose, so the two paths cannot drift.

// Deliberately not RFC 5322. That grammar accepts addresses no signup form
// should take, and every practical rejection we care about (no @, no dot in the
// domain, spaces, a trailing comma from a paste) is covered by this.
const EMAIL_RE = /^[^\s@,;:<>()[\]\\"]+@[^\s@.,;:<>()[\]\\"]+(\.[^\s@.,;:<>()[\]\\"]+)+$/;

/** True for C0 control characters and DEL, which have no place in a stored field. */
function isControlChar(code) {
  return code < 32 || code === 127;
}

// 254 is the SMTP maximum for a full address; anything longer cannot be
// delivered, so it is a bad value rather than a big one.
export const MAX_EMAIL_LENGTH = 254;

// Signups accepted from one IP per window before we stop writing rows.
export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** Trim and lowercase so `Paul@X.com ` and `paul@x.com` collide on the UNIQUE index. */
export function normalizeEmail(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

export function isValidEmail(email) {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  if (email.includes('..')) return false;
  return EMAIL_RE.test(email);
}

/**
 * Free-text fields arrive from the client and land in a database we later read
 * in a dashboard, so cap them and drop control characters.
 */
export function sanitizeField(raw, maxLength = 200) {
  if (typeof raw !== 'string') return null;
  const cleaned = [...raw].filter(ch => !isControlChar(ch.codePointAt(0))).join('').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

/**
 * Store a hash, never the address itself. Rate limiting only needs to know that
 * two requests came from the same client, and the raw IP would make the
 * waitlist table personal data we have no use for.
 */
export async function hashIp(ip, salt = '') {
  if (!ip) return null;
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function windowStartIso(nowMs, windowMs = RATE_LIMIT_WINDOW_MS) {
  return new Date(nowMs - windowMs).toISOString();
}

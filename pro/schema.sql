-- impeccable.pro waitlist. Apply with:
--   bun run d1:pro:schema         (remote, the deployed database)
--   bun run d1:pro:schema:local   (local, for wrangler pages dev)
--
-- Emails are stored normalized (trimmed + lowercased) by the API, so the UNIQUE
-- index is what makes a repeat signup a no-op rather than a duplicate row.

CREATE TABLE IF NOT EXISTS waitlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,
  -- Which surface sent them: "homepage-worlds", "pro-page", or null.
  source     TEXT,
  referrer   TEXT,
  -- SHA-256 of the client IP, for rate limiting only. Never the raw address.
  ip_hash    TEXT,
  country    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Ordering the list by signup time, for "you were number N" and for export.
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at
  ON waitlist (created_at);

-- The rate-limit lookup: rows from this IP inside the current window.
CREATE INDEX IF NOT EXISTS idx_waitlist_ip_hash_created_at
  ON waitlist (ip_hash, created_at);

// The site queue's rules, in one place, because two of them now write it: the
// CLI and the review lab's dev endpoint. A normalizer that disagrees with
// itself between those two would let the same page in twice wearing a different
// query string, and nothing downstream would notice until a screenshot run.
//
// Pure functions only. Each caller does its own IO, because the CLI writes
// directly and the dev plugin writes atomically through a temp file.

export const QUEUE_RELATIVE = ['catalog', 'site-queue.json'];

export const QUEUE_NOTE = 'Sites worth deriving a world from, kept here rather than in .waves/ so a session can pick up where the last one stopped. Add freely and judge later: the cost of a bad candidate is one look, and the cost of a lost one is that it never comes back. status is pending until someone has actually used the page; done records the concept it became, passed records why it did not, so neither gets re-litigated.';

export const SITE_STATUSES = new Set(['pending', 'done', 'passed']);

export function emptyQueue() {
  return { schemaVersion: 1, note: QUEUE_NOTE, sites: [] };
}

// Two URLs that differ only by scheme, www, a trailing slash or a tracking
// parameter are the same candidate. Returns null for anything that is not a
// fetchable http(s) address.
export function normalizeUrl(raw) {
  let url;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  url.protocol = 'https:';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|ref|source)/i.test(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.toString().replace(/\/$/, '');
}

// Greedy about input, strict about what counts as a URL, so a bookmark export,
// a markdown list and a pasted chat log all work without being cleaned up first.
export function extractUrls(text) {
  const found = String(text || '').match(/https?:\/\/[^\s"'<>)\]}]+/g) || [];
  return found.map(url => url.replace(/[.,;:]+$/, ''));
}

// The working name a rendered world is filed under, derived rather than stored
// so the queue and the renders cannot drift apart.
//
// It keeps the whole host, including the TLD, and the path. Both were learned
// the same day: dropping the TLD collided stripe.com with stripe.dev, and
// dropping the path collided bennett-tea.com with bennett-tea.com/tea-store,
// which gave two queue rows one render between them and showed the wrong one
// under the second. Longer names are a small price for a slug that cannot lie
// about which page it came from.
export function siteSlug(url) {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, '').split('.');
  const trail = parsed.pathname.split('/').filter(Boolean).map(part => part.replace(/\.[a-z]+$/i, ''));
  return [...host, ...trail].join('-').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').toLowerCase();
}

export function addUrls(queue, rawUrls, { source = 'manual', note = '', today } = {}) {
  const stamp = today || new Date().toISOString().slice(0, 10);
  const seen = new Set(queue.sites.map(site => site.url));
  const added = [];
  let duplicate = 0;
  for (const candidate of rawUrls) {
    const url = normalizeUrl(candidate);
    if (!url) continue;
    if (seen.has(url)) { duplicate += 1; continue; }
    seen.add(url);
    const entry = { url, added: stamp, status: 'pending', source, ...(note ? { note } : {}) };
    queue.sites.push(entry);
    added.push(entry);
  }
  return { added, duplicate };
}

export function closeSite(queue, url, { status, conceptId, why, today } = {}) {
  if (!SITE_STATUSES.has(status) || status === 'pending') {
    throw new Error('status must be done or passed');
  }
  const normalized = normalizeUrl(url) || url;
  const entry = queue.sites.find(site => site.url === normalized);
  if (!entry) throw new Error(`no queued site for ${url}`);
  const stamp = today || new Date().toISOString().slice(0, 10);
  if (status === 'done') {
    if (!conceptId) throw new Error('done needs the concept it became');
    Object.assign(entry, { status, conceptId, closed: stamp });
    delete entry.note;
  } else {
    if (!why) throw new Error('passed needs a reason, so the page is not re-examined later');
    Object.assign(entry, { status, note: why, closed: stamp });
    delete entry.conceptId;
  }
  return entry;
}

export function reopenSite(queue, url) {
  const normalized = normalizeUrl(url) || url;
  const entry = queue.sites.find(site => site.url === normalized);
  if (!entry) throw new Error(`no queued site for ${url}`);
  Object.assign(entry, { status: 'pending' });
  delete entry.closed;
  delete entry.conceptId;
  return entry;
}

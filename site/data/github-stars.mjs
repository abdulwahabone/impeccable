// Build-time GitHub star count for the header pill. The literal used to be
// hardcoded and drifted (it read 48k, then 57k, while the repo moved on), so
// production builds ask the GitHub API once and fall back to the last verified
// milestone when the API is unreachable or rate-limited. The floor also keeps
// a stale response from moving the public count backward. Dev builds skip the
// network entirely; nobody wants an API call per hot reload.

export const STAR_COUNT_FLOOR = 64_000;
let cached;

export function formatStars(count) {
  if (count < 1000) return String(count);
  const thousands = count / 1000;
  const label = thousands < 10 ? thousands.toFixed(1).replace(/\.0$/, '') : String(Math.round(thousands));
  return `${label}k`;
}

export function starsLabelForCount(count) {
  const verifiedCount = typeof count === 'number' && Number.isFinite(count)
    ? Math.max(count, STAR_COUNT_FLOOR)
    : STAR_COUNT_FLOOR;
  return formatStars(verifiedCount);
}

const FALLBACK = starsLabelForCount();

export async function githubStarsLabel() {
  if (cached !== undefined) return cached;
  if (!import.meta.env.PROD) {
    cached = FALLBACK;
    return cached;
  }
  try {
    const response = await fetch('https://api.github.com/repos/pbakaus/impeccable', {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error(`github api ${response.status}`);
    const repo = await response.json();
    if (typeof repo.stargazers_count !== 'number') throw new Error('no stargazers_count');
    cached = starsLabelForCount(repo.stargazers_count);
  } catch {
    cached = FALLBACK;
  }
  return cached;
}

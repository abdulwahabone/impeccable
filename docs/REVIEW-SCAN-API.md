# The scan API, for the review frontend

Everything the `/review` experience needs from the backend, in the shapes it
actually returns. The server lives in the `pristine` repo
(`scripts/scan-server.ts`); this document is the contract between it and this
one, and it is written from a real response rather than from a design.

**Nothing here is aspirational.** Every field below was read off a live scan of
`api.chucknorris.io`, and the same document is committed at
`site/public/review-fixture/report.json` — build against that file, not against
this page. Where they disagree, the fixture is right and this page is stale;
say so rather than coding around it.

---

## Running it

```bash
cd ~/pristine
npm run scan:server        # http://127.0.0.1:8790
```

```
GET  /health                    → {ok, queue, chrome}
POST /api/scans                 → 202 {scanId, statusUrl}
GET  /api/scans/:id             → status + per-stage progress
GET  /api/scans/:id/report      → the report (below)
GET  /api/history?host=<host>   → {host, entries: TrendEntry[]}
GET  /artifacts/:scanId/*       → the PNGs
```

Base URL belongs in `PUBLIC_REVIEW_API`, defaulting to `http://localhost:8790`.
CORS is open to `localhost:4321` / `127.0.0.1:4321` (and 4322 for
`astro preview`) and to nothing else — an origin you add later needs adding
server-side too.

The server binds loopback only and holds a Gemini key. It is a dev dependency,
never something this site ships against in production.

---

## The flow

```
POST /api/scans {url}
        │
        ├─ 400  malformed body / no url / bad viewports
        ├─ 422  the SSRF guard refused it   ← render this properly, see below
        └─ 202  {scanId}
                │
                └─ poll GET /api/scans/:id every 1000ms
                        queued  → show queuePosition
                        running → advance the stage checklist
                        error   → show `error`
                        done    → GET /api/scans/:id/report
```

Poll on an interval, not with backoff: a scan is ~25 s for one page and the
stage list is the whole point of the waiting screen. There is no SSE and no
websocket; polling is the contract.

### Status response

```ts
interface ScanStatus {
  scanId: string;
  url: string;                       // normalized (bare host → https)
  status: 'queued' | 'running' | 'done' | 'error';
  queuePosition?: number;            // 1-based, present only while queued
  stages: StageState[];
  error?: string;                    // present only when status === 'error'
  reportUrl?: string;                // present only when status === 'done'
}

interface StageState {
  stage: 'visual-scan' | 'visual-critique' | 'box-crops' | 'synthesis' | 'plan';
  status: 'pending' | 'running' | 'done';
  ms?: number;                       // wall clock, filled in as each finishes
  skipped?: boolean;                 // see below
}
```

All five stages are present from the first poll, all `pending`. Copy for the
waiting screen:

| stage | what to show |
|---|---|
| `visual-scan` | Rendering desktop + mobile · 59 deterministic checks |
| `visual-critique` | Design critique — a vision model reads your page |
| `box-crops` | Clipping the evidence |
| `synthesis` | Auditing the findings for noise |
| `plan` | Building your report |

**`skipped: true` means the stage never ran** and the run finished anyway.
`box-crops` skips when the model drew no boxes; the two LLM stages skip on a
detector-only run. They arrive as `status: 'done', skipped: true, ms: 0`.
Render them greyed or with a dash, not as a completed step — claiming work
nobody did is the one thing this flag exists to prevent.

Between `POST` and the first `onStage`, Chrome has to launch: expect one or two
polls where `status` is `running` and every stage is still `pending`. Show the
run as started, not stalled.

### Errors worth designing for

`422` is the interesting one. It fires whenever the pipeline's SSRF guard
refuses a URL, which includes **every localhost and private-network address** —
that guard is the same one the production Worker uses and is deliberately not
relaxed for local development.

```json
{
  "error": "That URL cannot be scanned.",
  "reason": "link-local",
  "detail": "169.254.169.254",
  "hint": "Scans need a public http(s) URL. For a local app, expose it first (for example `cloudflared tunnel --url http://localhost:3000`) and scan the public hostname."
}
```

`reason` is one of `unparseable`, `scheme`, `credentials`, `loopback`,
`private`, `link-local`, `internal-name`, `unspecified`, `reserved`. Someone
pasting `http://localhost:3000` gets `internal-name` and is a developer testing
their own app — the `hint` is written for exactly that person, so render it.

`400` carries `{error}` only. `404` on a status route after a server restart
carries a `reportUrl` when the report is still on disk: job state is in memory,
reports and history are not.

---

## The report

One JSON document, ~37 KB. Top-level keys, in order:

```ts
interface Report {
  contract: 1;                    // bump = breaking change; refuse politely if unknown
  url: string;
  runId: string;                  // `scan-<uuid>`; appears inside every artifact key
  scannedAt: string;              // ISO
  routes: string[];               // pages actually rendered, in scan order
  unreachableRoutes: RouteUnreachable[];
  viewports: string[];            // what was asked for: ['desktop','mobile']
  stats: Stats;
  usage: { inputTokens: number; outputTokens: number };
  cost: CostBreakdown;
  timings: { stage: string; ms: number }[];
  totalMs: number;
  warnings: string[];             // partial-scan notes; render if non-empty
  findings: Finding[];
  assessment?: Assessment;        // absent if the vision pass returned nothing
  synthesis?: Synthesis;          // absent when there was too little to audit
  screenshots: Screenshot[];
  overlays: Overlay[];
  artifactsBase: string;
  reviewMarkdown: string;
  techAudit: TechAudit;
  commands: Record<string, CommandHint>;   // keyed by finding id
  trend: TrendEntry[];
}
```

`assessment` and `synthesis` are **optional**. A page with fewer than three
findings gets no synthesis; a degraded vision call gets no assessment. Every
section built on them needs an empty state, and "no critique" is not an error.

### Findings

```ts
interface Finding {
  id: string;              // stable within a run; the key for commands + overlays
  source: 'detector' | 'design-system' | 'llm';
  title: string;
  detail: string;          // markdown; the "why", and it may end with a
                           // "Where: `/` (desktop viewport)" line — see gotchas
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  advisory: boolean;       // true = counted, never blocking; collapse these
  dimension?: 'slop' | 'ux' | 'ui' | 'craft';
  ruleId?: string;         // detector findings only; absent on `llm`
  fix?: string;            // the imperative "what to change" half
  pageRegion?: string;     // "Facebook Messenger section, below the intro"
  route?: string;          // "/" — only worth showing when routes.length > 1
  cropUrl?: string;        // evidence crop, already absolute or site-relative
  file?: string; line?: number; endLine?: number;   // never set on a site scan
  preExisting?: boolean; waived?: {...};            // never set on a site scan
}
```

Sort for the issue rail: `advisory === false` first, then `P0 → P3`, then the
advisory group collapsed behind a disclosure. `detail` is markdown and `fix`
is plain-ish prose; render `fix` as its own line, not appended to `detail` —
they are read by different people at different moments.

### Screenshots and the overlay geometry

This is the part to get exactly right, because it is what makes the split pane
work.

```ts
interface Screenshot {
  viewport: 'desktop' | 'mobile' | 'tablet';
  route: string;
  key: string;             // "runs/scan-<uuid>/desktop.png"
  url: string;             // ALWAYS use this; never build it from key yourself
  annotated: boolean;      // false = the clean capture
  fold?: boolean;          // true = cropped to viewport height
  width: number;           // capture pixels
  height: number;
  annotations?: Annotation[];   // present on annotated captures only
}
```

Six captures on a two-viewport run: clean, annotated, and annotated-fold, per
viewport. **Render the clean ones** (`annotated === false`) and draw your own
boxes; the annotated PNGs are a baked scrim-and-badge treatment meant for a
GitHub comment, and they cannot give you hover states.

Two coordinate spaces, and they are different:

```ts
// 1. Detector / probe findings — from the ANNOTATED capture's annotations.
interface Annotation {
  number: number;          // the badge number in the baked PNG
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  ruleId?: string;
  rect: { x: number; y: number; width: number; height: number };  // CAPTURE PIXELS
  findingIds: string[];    // what this region stands for
}

// 2. Vision findings — from the top-level overlays[].
interface Overlay {
  findingId: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  captureKey: string;      // matches a Screenshot.key — always the CLEAN one
  box: { x: number; y: number; w: number; h: number };   // 0–1000 NORMALIZED
}
```

`rect` is already in the capture's own pixels. `box` is in 0–1000 units of the
capture it names — that is the space vision models are trained to point in, and
it survives whatever rescaling the provider applied to the image. Converting:

```ts
const scale = renderedWidth / screenshot.width;

// annotation rect → rendered px
const a = { x: rect.x * scale, y: rect.y * scale, w: rect.width * scale, h: rect.height * scale };

// overlay box → rendered px  (note: /1000 against the capture, THEN scale)
const o = {
  x: (box.x / 1000) * screenshot.width * scale,
  y: (box.y / 1000) * screenshot.height * scale,
  w: (box.w / 1000) * screenshot.width * scale,
  h: (box.h / 1000) * screenshot.height * scale,
};
```

An annotation's `rect` comes off the *annotated* capture but the annotated and
clean captures of one viewport are the same pixel size, so it lands correctly on
the clean one. An overlay's `captureKey` already points at a clean capture.

A finding can have geometry from neither source. Its card still has to work:
scroll the pane to the top of its route's capture and skip the highlight rather
than showing an empty box.

**A `captureKey` ending `mobile.png` is your cue to flip the pane** to the
mobile viewport when that card becomes active. That moment — a desktop reader
watching the pane snap to a 390px render to show a form breaking — is the best
thing this UI does.

### Assessment (the editorial layer)

```ts
interface Assessment {
  impression: string;              // 2–4 sentences; the quote in the report card
  healthScore?: HealthScoreRow[];  // the ten Nielsen heuristics
  specificityVerdict?: string;     // "Authored, decisively." + evidence + cracks
  whatsWorking: string[];          // ≤4
  personaNotes: string[];          // ≤3, "Jordan (confused first-timer): …"
  nextSteps: string[];             // ≤5, ordered; the fix-plan checklist
  minorObservations: string[];     // ≤6
  questionsToConsider: string[];   // ≤4
}

interface HealthScoreRow {
  heuristic: string;
  score: number | 'n/a';   // ← the STRING 'n/a', not null, not 0
  keyIssue: string;
}
```

**The `'n/a'` gotcha.** A heuristic that does not apply to the page (there is no
error state on a static docs page) scores the string `'n/a'`. It is a judgment,
not a zero, and it must leave the denominator. The headline percentage is
renormalized over the numeric rows only:

```ts
const numeric = healthScore.filter(r => typeof r.score === 'number') as {score:number}[];
const pct = numeric.length
  ? Math.round((numeric.reduce((s, r) => s + r.score, 0) / (numeric.length * 4)) * 100)
  : null;
```

In the committed fixture that is `24/32 → 75%`: 8 numeric rows out of 10.
Treating the two `'n/a'` rows as zeros gives `24/40 → 60%` and reports a decent
page as a bad one. Render n/a rows in the table with a dash and the reason from
`keyIssue`, and check your number against `trend[last].healthPct`, which the
server computed the same way.

Band words, off that percentage: `≥90 Excellent`, `≥70 Good`, `≥50 Acceptable`,
else `Poor`.

### Synthesis, stats, cost

```ts
interface Synthesis {
  deterministicScanNotes: string;  // the "signal vs noise" paragraph
  suspectFindingIds: string[];     // already demoted to advisory; do NOT re-demote
  systemicPatterns: string[];      // ≤3, "structural accessibility gaps: 2 findings"
}

interface Stats {
  detector: number; vision: number; total: number;
  crops: number; cropsRendered: number;
  tier: 'minimal' | 'standard' | 'full';       // a site scan is always 'full'
  conclusion: 'success' | 'neutral' | 'failure';
}
```

`conclusion === 'failure'` means at least one P1 — that is the "Would FAIL a P1
merge gate" chip in the verdict cell, and the hook into the Pristine pitch.
`cost.totalUsd` and `usage` are worth a quiet footnote line; do not make them a
feature.

`suspectFindingIds` has **already had its effect** — those findings arrive
`advisory: true`. Reading the list and demoting again applies the same judgment
twice.

### techAudit

```ts
interface TechAudit {
  accessibility: Pillar;
  performance: Pillar;
  responsive: Pillar;
  antiPatterns: Pillar;
  theming: Pillar | UnscoredPillar;
}
type Pillar = { score: number; findingIds: string[] };      // 0–4, quarter steps
type UnscoredPillar = { score: null; reason: 'no-design-md'; hint: string };
```

Five meters, `4` = clean. `findingIds` is what makes them interactive: clicking
a meter should filter the issue rail to those ids.

`theming.score === null` on every scan run without a DESIGN.md — which is every
scan the public site can do today. Render the `hint` as an invitation
("Scan again with a DESIGN.md to score theming against your own contract"), not
as a failure or a zero. It is the most honest upsell surface in the report.

**Pillars are lenses, not a partition.** A finding can appear in more than one
(a mobile contrast failure is both Accessibility and Responsive), and a finding
can appear in none — in the fixture, a P2 about footer type size lands in no
pillar at all, because it is a design-critique call rather than a probe result.
So `findingIds` neither sums to `findings.length` nor covers it, and the issue
rail must stay the complete list. The meters are a summary of the report, not
an index of it.

### commands and trend

```ts
type CommandHint = { command: string; invocation: string };  // "/impeccable polish"
interface TrendEntry {
  scannedAt: string;
  healthPct: number | null;
  active: { P1: number; P2: number; P3: number };
  runId: string;
}
```

`commands` is keyed by finding id and covers **every** finding. Pair
`invocation` with a copy button on the card and in the fix plan. The commands
are real entries in the impeccable skill (`skill/SKILL.src.md`): `harden`,
`typeset`, `colorize`, `adapt`, `clarify`, `polish`, `optimize`.

`trend` includes this run, oldest first, and a first scan therefore has exactly
one entry — render "re-scan after fixes to start your trend" rather than a
one-point sparkline. `/api/history?host=` returns the same entries without
running a scan, which is what lets `/review` show history before a new scan
finishes.

---

## Fixture / mock mode

`site/public/review-fixture/report.json` is a real report, byte-shaped
identically to a live one. Its only difference is `artifactsBase`:

| | live | fixture |
|---|---|---|
| `artifactsBase` | `http://127.0.0.1:8790/artifacts/<scanId>` | `/review-fixture/artifacts` |
| `screenshots[].url` | absolute | site-root-relative |
| `cropUrl`, markdown `<img src>` | absolute | site-root-relative |

Both are already correct in the document — **always use `url` and `cropUrl` as
given** and never build a path from `key` plus a base of your own. Both forms
load from a browser with no further work.

`/review?mock=1` must load the fixture and replay a plausible stage progression,
and it must keep working forever: it is the demo, the offline dev loop, and the
only way to work on this page without spending a cent per reload.

Exclude `site/public/review-fixture/` from the production build.

Regenerating it (after a pipeline change, or for a different site):

```bash
cd ~/pristine
npm run scan:server &
curl -s -X POST localhost:8790/api/scans -H 'content-type: application/json' \
  -d '{"url":"https://api.chucknorris.io/"}'
# wait for done, then:
bun scripts/scan/gen-fixture.ts scans/api/<scanId>
```

That writes `report.json` and the PNGs into this repo through the same
`buildReport()` that answers a live request, so the fixture cannot drift from
the API.

---

## A minimal client

```ts
const API = import.meta.env.PUBLIC_REVIEW_API ?? 'http://localhost:8790';

export async function startScan(url: string, init?: {routes?: string[]; viewports?: string[]}) {
  const res = await fetch(`${API}/api/scans`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, ...init }),
  });
  if (res.status === 422) throw new RefusedUrlError(await res.json());
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
  return res.json() as Promise<{ scanId: string; statusUrl: string; queuePosition?: number }>;
}

export async function pollUntilDone(scanId: string, onTick: (s: ScanStatus) => void) {
  for (;;) {
    const status: ScanStatus = await (await fetch(`${API}/api/scans/${scanId}`)).json();
    onTick(status);
    if (status.status === 'done') return fetchReport(scanId);
    if (status.status === 'error') throw new Error(status.error ?? 'scan failed');
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export const fetchReport = async (scanId: string): Promise<Report> =>
  (await fetch(`${API}/api/scans/${scanId}/report`)).json();
```

Guard the whole thing: if `GET /health` fails at page load, fall back to mock
mode with a visible note rather than leaving a spinner up. The API is a local
dev process and "it isn't running" is the most common failure by a wide margin.

---

## Gotchas, collected

1. **`healthScore.score` can be the string `'n/a'`.** Filter before averaging.
2. **Two coordinate spaces**: `annotations[].rect` is capture pixels,
   `overlays[].box` is 0–1000. Mixing them puts boxes in the wrong place at the
   wrong size, and it will look *almost* right.
3. **`finding.detail` may end with a `Where: …` line** the pipeline appended.
   Strip it before showing `detail` next to a location chip you are already
   rendering from `pageRegion`/`route`.
4. **`assessment` and `synthesis` are optional.** Empty states, not errors.
5. **`suspectFindingIds` has already been applied.** Do not demote twice.
6. **One scan at a time, server-wide.** A second POST queues; show
   `queuePosition` rather than a spinner that looks stuck.
7. **`route` is only worth rendering when `routes.length > 1`.** On a
   single-page scan every finding says `/` and it is pure noise.
8. **Never construct an artifact URL.** Use `url` and `cropUrl` as given; the
   base differs between live and fixture on purpose.
9. **Advisory findings are the bulk of a clean page's list.** 4 of 9 in the
   fixture. Collapse them or the rail reads as a disaster on a decent site.
10. **`localhost` URLs are refused with 422.** Not a bug, and not something to
    work around client-side — surface the `hint`.

# Plan: "Review my site" — results experience (frontend)

**Repo:** `~/impeccable-site` (this repo) · **Executor:** Codex · **Companion plan:**
`~/pristine/PLAN-SCAN-API.md` (the local API, built separately by another agent).

## What we are building

The homepage hero ("How impeccable is your site? — paste a URL, Review my site")
already exists. This plan builds everything after the button: a scanning screen,
a results report, a fix plan that teaches impeccable commands, and a Pristine
waitlist teaser. The data comes from a local scan API (port 8790) that wraps the
pristine review pipeline; **a complete, real fixture is already committed** at
`site/public/review-fixture/report.json` (with its screenshots and evidence
crops beside it), so every screen can be built and demoed before the API exists.

The audience is PMs, devs, and designers at once. The layout that balances them
(chosen after 3 explored variations): an **executive report-card band on top**
(the thing a PM screenshots into Slack), a **synced split pane** below it (the
thing a dev works through), then full-width depth sections. Details below.

## Phase 0 — visual direction (image gen, STOP for approval)

Before writing any code, generate high-fidelity mockup images from the ASCII
wireframes below, in this site's own design system (`DESIGN.md`: Neo kinpaku —
`lacquer-black` ground, `kinpaku-gold` primary accent, `verdigris-patina`
secondary, `champagne` headlines, monospace accents for labels like
`/INPUT.URL`). Match the existing homepage's voice exactly.

Produce 4 images and present them to the user for approval before Phase 1:
1. Results screen, desktop (the full report-card + split-pane layout)
2. Scanning/progress screen
3. Fix plan section + Pristine waitlist band
4. Results screen, mobile (single column: band → site window → issues)

Severity color language to establish in the mockups and reuse in code:
P1 = alarm red-orange, P2 = kinpaku gold, P3 = verdigris, advisory = muted grey.
Dark mode is primary; light mode must also work (site supports both).

### The layout being mocked (results screen)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ /IMPECCABLE · api.chucknorris.io                                     [Share ↗] [Re-scan] │
├───────────────────────────┬──────────────────────────────┬───────────────────────────────┤
│  DESIGN CRITIQUE          │  TECHNICAL AUDIT             │  VERDICT                      │
│    29 / 36                │   Accessibility ▓▓▓░ 3.0     │  ✖ Would FAIL a P1 gate       │
│    Good (81%)             │   Performance   ▓▓▓▓ 4.0     │                               │
│  "Retro developer portal  │   Responsive    ▓▓▓░ 3.5     │  SLOP ★★★ · Authored,         │
│   with real personality;  │   Anti-patterns ▓▓░░ 2.75    │  decisively                   │
│   finish details lag."    │   Theming       n/a          │  UX ★★☆  UI ★★☆  CRAFT ★★☆    │
│  trend: · → · → 81        │   └ add a DESIGN.md to score │  1 P1 · 2 P2 · 1 P3 · 4 adv   │
├───────────────────────────┴───────┬──────────────────────┴───────────────────────────────┤
│  ISSUES — scroll me               │  SITE WINDOW — follows          [🖥|📱]  route / ▾   │
│ ╔═══════════════════════════════╗ │ ┌──────────────────────────────────────────────────┐ │
│ ║ ① [P1] Messenger button       ║ │ │  clean full-page capture, scrolling inside a     │ │
│ ║   missing · copy points at    ║ │ │  fixed-height pane; HTML overlay boxes drawn     │ │
│ ║   nothing · /impeccable       ║ │ │  from rect data; active issue's box lit,         │ │
│ ║   clarify [copy]              ║ │ │  others dimmed; pane auto-scrolls to the         │ │
│ ╚═══════════════════════════════╝ │ │  active card's box                               │ │
│  ② [P2] Subscribe form unstyled   │ └──────────────────────────────────────────────────┘ │
│  ③ [P2] Form field no label       │                                                      │
│  ④ [P3] No <main> landmark        │   j/k step issues · click a box → list jumps         │
│  ▸ 4 advisory notes           [+] │                                                      │
├───────────────────────────────────┴──────────────────────────────────────────────────────┤
│  ✓ WHAT'S WORKING          👥 WHO THIS FAILS (personas)      ⚙ SCAN AUDIT (synthesis)    │
│  ▸ HEALTH SCORE — 10 Nielsen heuristics table [+]   ▸ minor observations / questions [+] │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  NEXT STEPS (checklist)              →   FIX PLAN (impeccable commands, copy buttons)    │
│  🤖 PRISTINE — this review on every PR, before it merges · [screenshot] · [waitlist]     │
│  <sub>Scanned https://… · 1 page · impeccable engine + LLM critique</sub>                │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Scanning screen: staged progress with real stage names (mapping in Phase 2),
live thumbnail fading in as soon as the capture URL is reachable. Fix plan and
waitlist: see Phase 4.

**STOP after Phase 0. Show the four images. Do not start Phase 1 without an
explicit go-ahead.**

## Phase 1 — scaffold and data layer

- New page `site/pages/review/index.astro`, reachable at `/review`. Accepts
  `?url=…&autostart=1`. Follow this repo's conventions: Astro + vanilla TS
  islands, no framework, tokens from `site/styles/kinpaku-tokens.css`, biome
  formatting.
- Data client `site/scripts/review-api.ts` (or the closest conventional
  location): `startScan(url)`, `pollScan(id)`, `fetchReport(id)`.
  - API base: `PUBLIC_REVIEW_API` env, default `http://localhost:8790`.
  - **Mock mode**: `?mock=1` (or the API being unreachable at start) loads
    `/review-fixture/report.json` and replays a fake stage progression for the
    scanning screen. Mock mode is how you develop and demo everything.
- Types for the report mirroring the **Data contract** section below. Write
  them once in one file; do not scatter shapes.

## Phase 2 — scanning screen

- POST the URL, then poll `GET /api/scans/:id` every 1s. Render `stages[]` as
  a checklist with elapsed times. Stage label map:
  `visual-scan` → "Rendering desktop + mobile · 59 deterministic checks",
  `visual-critique` → "Design critique — a vision model reads your page",
  `box-crops` → "Clipping evidence", `synthesis` → "Auditing the findings",
  `plan` → "Building your report".
- Queue state (`status: 'queued'`, `queuePosition`) renders as its own line.
- Errors (`status: 'error'`) render the API's message with a "try another URL"
  path; an SSRF-refused URL (422) gets copy explaining public URLs only, with
  a hint about `cloudflared tunnel` for local apps.
- On `done`, fetch the report and swap to results without a page load.

## Phase 3 — results screen (the core)

**Report-card band** — three cells:
- Design critique: health total (`assessment.healthScore` renormalized: sum of
  numeric scores / 4·count, as a % — the fixture's is 81%), band word
  (Excellent ≥90 / Good ≥70 / Acceptable ≥50 / Poor), the `assessment.impression`
  quote, and the trend sparkline from `trend[]` (one point on a first scan:
  render "re-scan after fixes to start your trend").
- Technical audit: five meters from `techAudit` (0–4, quarter steps).
  `theming.score === null` renders the `hint` as an upsell line, not an error.
- Verdict: `stats.conclusion` (`failure` → "Would FAIL a P1 merge gate" chip),
  specificity verdict first sentence ("Authored, decisively."), the four
  scorecard bands, and severity counts.

**Split pane** — the flagship interaction:
- Right pane (site window): fixed height (~80vh, sticky). Renders the **clean**
  capture for the active viewport (`screenshots[]` where `annotated: false`),
  scaled to pane width, scrolling vertically inside. Overlay boxes drawn as
  absolutely-positioned divs:
  - Detector/probe findings: from the **annotated** capture's
    `annotations[].rect` (capture-pixel space — scale by
    `renderedWidth / screenshot.width`). `annotations[].findingIds` links each
    rect to its finding(s).
  - Vision findings: from `overlays[]` — `box` is **0–1000 normalized** against
    the capture named by `captureKey`; pixel rect =
    `(box.x/1000)·width, (box.y/1000)·height, …`.
  - Viewport toggle 🖥/📱 swaps captures; a card whose only geometry lives on
    the mobile capture auto-flips the pane when activated.
- Left rail (issues): active findings first, P1→P3 (`advisory: false`), then a
  collapsed advisory group. Each card: severity chip, title, `detail`,
  `fix`, location (`pageRegion`/`route`), the crop image (`cropUrl`) when
  present, and the command chip from `commands[id]` with a copy button.
- Sync: the rail owns scrolling (scroll-spy sets the active card); the pane
  *animates* to the active finding's rect (never independently scrollable by
  the sync). Clicking an overlay box scrolls the rail to its card. `j`/`k`
  step. Findings with no geometry anywhere: card still works; pane scrolls to
  top; no dead ends.

**Depth sections** (below the pane, full width): what's working
(`assessment.whatsWorking`), personas (`assessment.personaNotes` as small
cards), scan audit (`synthesis.deterministicScanNotes` + `systemicPatterns`),
collapsed: health-score table (all 10 rows incl. n/a), minor observations,
questions to consider, unreachable routes if any. Footer: render the last
`<sub>` line of `reviewMarkdown` (or compose from `url` + `routes`).

## Phase 4 — fix plan and Pristine teaser

- **Fix plan**: ordered from `assessment.nextSteps`, each step paired with its
  finding's `commands[id].invocation` and a copy button; above them one block
  with `npx impeccable review` ("run the same engine locally"). CTA
  "Re-scan my site" restarts the flow with the same URL (that's what makes the
  trend line move — say so).
- **Pristine band**: headline "This review, on every pull request. Before it
  merges." A screenshot slot (`site/public/review-fixture/pristine-pr.png`
  placeholder — ask the user for a real Pristine PR screenshot before shipping,
  or compose one from the fixture's report styled as a GitHub comment). Bullets:
  blocks merges on P1s · inline comments on the diff · personas walk your
  preview. Waitlist form: reuse the existing waitlist machinery under `pro/`
  (D1 `waitlist` table + its Pages function) with `source: 'site-review'`; in
  local dev without the function, degrade to a mailto or disabled state — do
  not fake success.

## Phase 5 — integration and polish

- Wire the homepage hero form to `/review?url=…&autostart=1`.
- Exclude `site/public/review-fixture/` from production builds — this repo
  already has the pattern in `scripts/strip-local-world-cards.mjs`; extend it
  or add a sibling strip step to the `build` script.
- Responsive: below ~900px the split pane stacks (band → site window → issues);
  the window loses stickiness and the sync becomes tap-a-card → window scrolls.
- Both themes, keyboard nav, reduced-motion (no pane animation), alt text from
  the report's own strings.
- Dogfood: run `npx impeccable review` (or the local detector) against the new
  pages and fix what it flags. The review page failing its own review is not
  shippable.

## Data contract

**The full integration reference is [docs/REVIEW-SCAN-API.md](docs/REVIEW-SCAN-API.md)**
— every response shape as the server actually returns it, TypeScript types, a
minimal client, the two coordinate spaces, and ten collected gotchas. Read it
before writing the data layer. What follows is the summary.


API base `http://localhost:8790`. All responses JSON, CORS open to
`http://localhost:4321`.

- `POST /api/scans` body `{url: string, routes?: string[], viewports?: ('desktop'|'mobile'|'tablet')[]}`
  → `202 {scanId, statusUrl}` · `400` bad body · `422 {error, reason}` refused URL (SSRF guard).
- `GET /api/scans/:id` →
  `{scanId, url, status: 'queued'|'running'|'done'|'error', queuePosition?, stages: [{stage, status: 'pending'|'running'|'done', ms?}], error?, reportUrl?}`.
  Stage names: `visual-scan`, `visual-critique`, `box-crops`, `synthesis`, `plan`.
- `GET /api/scans/:id/report` → the report document. Exactly the shape of
  `site/public/review-fixture/report.json`:
  scan payload (`url, runId, scannedAt, routes, viewports, stats, usage, cost,
  timings, warnings, findings[], assessment, synthesis, screenshots[],
  overlays[], unreachableRoutes[]`) plus enrichments
  (`artifactsBase, reviewMarkdown, techAudit, commands, trend`).
  `screenshots[].url` is absolute (from the API: `http://localhost:8790/artifacts/…`;
  in the fixture: `/review-fixture/artifacts/…`) — always use it as given.
  `annotations[].rect` = capture pixels; `overlays[].box` = 0–1000 of the
  capture named by `captureKey`.
- `GET /api/history?host=<hostname>` → `{host, entries: trend[]}`.
- `GET /artifacts/*` → PNGs. `GET /health` → `{ok: true}`.

## Acceptance

1. `npm run dev`, open `/review?mock=1`: full flow (fake progress → results)
   renders from the fixture with zero network beyond the site itself.
2. With the API running (`cd ~/pristine && npm run scan:server`): paste a real
   URL on the homepage → scanning screen with live stages → results.
3. Scroll-sync works both directions; mobile-only issue flips the pane; j/k.
4. Production build contains no `review-fixture/` bytes.
5. Both themes, 375px–1440px, reduced-motion honored; biome + existing checks pass.

## Out of scope

Auth, persistence beyond the API's own history, deploying the API, multi-route
route picker UI (render what the report gives; the picker ships when the API
exposes crawl hints), real Pristine signup backend beyond the waitlist row.

# Prompt for Codex — "Review my site" frontend

Copy everything below the line into Codex, started in `~/impeccable-site`.

---

You are building the "Review my site" experience for impeccable.style, in this
repo (`~/impeccable-site`). Two documents to read fully before doing anything:

- `PLAN-REVIEW-FRONTEND.md` (repo root) — the plan; execute it phase by phase.
- `docs/REVIEW-SCAN-API.md` — the API this consumes, written from real
  responses: every shape, a minimal client, the two coordinate spaces the
  overlay depends on, and the gotchas that will otherwise cost you a day.

Summary of the mission:

Users paste a URL on the existing homepage hero and get an AI design review:
a scanning screen, a shareable report-card band, a synced split-pane (annotated
site window + issue list), a fix plan teaching `/impeccable` commands, and a
Pristine waitlist teaser. The review data comes from a local API on port 8790
(built separately); a complete REAL fixture from an actual scan of
api.chucknorris.io is already at `site/public/review-fixture/report.json` with
its screenshot PNGs beside it — build and demo everything against that fixture
first (`/review?mock=1`).

**Phase 0 comes before any code and ends with a hard stop:** generate 4
high-fidelity mockup images from the ASCII wireframes in the plan, in this
site's Neo kinpaku design system (read `DESIGN.md` and
`site/styles/kinpaku-tokens.css` first — dark lacquer ground, kinpaku gold,
verdigris, monospace `/LABEL` accents, matching the live homepage). Present
the images and WAIT for approval before Phase 1.

Hard rules:
- Follow this repo's conventions: Astro + vanilla TS islands (no React/Vue),
  design tokens only (no hardcoded colors), biome formatting, both themes.
- The data contract section of the plan is law. Do not invent fields; do not
  rename fields. If the fixture and the plan ever disagree, the fixture wins —
  it came from a real run.
- `annotations[].rect` is in capture pixels; `overlays[].box` is 0–1000
  normalized against the capture named by `captureKey`. Scale accordingly.
- The issues rail owns scrolling; the site window only ever animates. Sync must
  be bidirectional (scroll-spy → window; click box → rail). j/k steps issues.
  Findings without geometry must still render cleanly.
- Mock mode must keep working forever — it is the demo and the test bed.
- Exclude `site/public/review-fixture/` from the production build (the repo
  already strips local-only assets in `scripts/strip-local-world-cards.mjs`;
  follow that pattern).
- Do not touch unrelated pages, the detector, the skill build, or `pro/`
  beyond reusing the existing waitlist function with `source: 'site-review'`.
- Never fake a successful waitlist signup in dev; degrade honestly.
- Verify in the browser as you go (`npm run dev`, port 4321), both themes,
  375px and 1440px.

Definition of done: the five acceptance criteria at the bottom of
`PLAN-REVIEW-FRONTEND.md`, demonstrated — including `/review?mock=1` working
end to end with no API running, and a clean production build with no fixture
bytes in it.

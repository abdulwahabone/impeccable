# Next session brief: landing-page worlds section + research whitepaper

Two builds for impeccable.style, both in this repo. Read CLAUDE.md first; the site runs with `bun run dev` (astro daemon: restart via `bunx astro dev stop`, never Ctrl+C). Production is currently rolled back to v3 with auto-deploys paused; build locally, do not deploy.

## Task 1: "Worlds" featured section on the landing page

A highly expressive, animated section demonstrating the visual worlds impeccable can imagine. Build it with `/impeccable`-level craft; it advertises the craft itself.

**Concept: the section is a live roll.** On load it calls `GET https://impeccable.style/api/roll?scope=direction` (same-origin `/api/roll` in production; in dev, fetch the prod URL) and deals the visitor a hand of worlds as large cards: the world's desktop hero render plus its name. A re-roll affordance sweeps the hand away (pass `--reroll`-style param: `&reroll=1`, incrementing, same key) and deals fresh worlds. Motion is the mechanism: staggered dealt-cards entry, slight fan, exponential ease-out; author one coherent moment, not scattered effects.

- **Imagery:** hero renders are served per-world at `/worlds/cards/<concept-id>-hero.webp` (R2-backed, works in prod; in dev the local files exist under `site/public/worlds/cards/`). Boards exist at `<concept-id>.webp` if useful.
- **Curation:** only deal flagship-grade worlds. The roll API deals from the full approved pool; filter client-side is not possible (no ratings in the payload), so either (a) add an optional `rating=3` filter param to `functions/api/roll.js` (ratings live in `catalog/concept-reviews.json`, field `rating`, 3 = flagship, 75 exist), or (b) bake a static flagship id list at build time and request rolls until enough flagships appear. Option (a) is cleaner; keep the param additive and default-off.
- **Neo Mirai anchors the section** as the "played card": one visually distinguished card representing the world that was committed and fully built, linking to the existing `/neo-mirai` live demo. Narrative arc of the section: imagine (dealt cards) -> commit (played card) -> build (click through). Remove Neo Mirai from the feature grid where it currently sits; this section replaces that slot.
- Section copy stays short and ties to the hero's closing line ("ambitious visual worlds it could never reach alone"). No em dashes; prose validator applies.
- Exposure note: only ever render what a roll deals. Do not import catalog JSON into the page; the labs-leak lesson (see `site/pages/labs/*` dev gating) applies.

## Task 2: research whitepaper (dice-lessons in kinpaku black)

Restyle `~/code/impeccable-evals/dice-lessons.html` as a public page in this site's kinpaku theme, e.g. `/research` (pick the route; add redirects if needed). It is public marketing: no dev gating.

- Update the seven lessons with everything since: world/composition/dual strength taxonomy, mode-aligned stagings (persuade/operate/read/experience), six challengers + rating-weighted draws (3-star level with 2-star, 1-star at half, breadth:niche excluded), re-roll chains, the render gate (boards + hero-from-board reference generation), the proven-seams saturation finding (depth round 3/12 vs breadth strategy), and the roll API + anonymous choice telemetry. Source of truth: `docs/WORLD-CATALOG-AUTHORING.md` in this repo and `catalog/`.
- Link the hero's research sentence ("dice the model cannot roll itself" lineage) to this page once it exists.
- Do not reveal catalog entry content wholesale; cite examples the way the API exposes them (a handful of named worlds is fine, the full list is not).

## Context that saves you time

- The catalog lives at `catalog/` (four JSONs); labs at `/labs/*` are dev-gated. Review plugin: `scripts/worlds-review-vite-plugin.mjs`.
- The public repo (`~/code/impeccable`) is canonical for `skill/` and `cli/`; never edit those here.
- 337 worlds total, 169 approved, 75 rated three-star. All world imagery exists locally and in R2.
- Test gates for this repo: `bun run test` (7 suites), `bun run build` must stay green.

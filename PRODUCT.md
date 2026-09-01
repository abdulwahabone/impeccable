# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Designers, product managers, and engineers who use AI coding tools and want better design output from their AI. They typically arrive from GitHub, social media, or word of mouth already aware that AI-generated interfaces have quality problems. They are looking for a practical way to direct and improve the work, not introductory education about the problem.

## Product Purpose

Impeccable gives builders a shared design vocabulary with their AI through a plug-and-play skill that works across major AI coding harnesses. Success means users can steer output with design precision instead of vague prose, and the resulting interfaces hold up to professional design review instead of looking generically AI-generated.

## Positioning

Impeccable combines an opinionated design vocabulary, durable project context, deterministic anti-pattern detection, and live browser iteration in the coding workflow. It does not merely generate a one-off interface or score a screenshot; it gives the builder and agent a shared system for shaping, evaluating, refining, and maintaining frontend quality.

## Operating Context

Impeccable is installed into an AI coding harness and used from the project being designed. Builders establish durable product and design context, invoke focused commands during frontend work, run deterministic checks in the CLI or browser extension, and use Live Mode when visual iteration in the running product is useful. The website, documentation, tutorials, examples, and changelog support evaluation and continued use.

## Capabilities and Constraints

- One Impeccable skill exposes focused commands for shaping, building, evaluating, refining, fixing, and iterating on frontend interfaces.
- Provider transforms distribute the skill to supported coding harnesses while `skill/` remains the source of truth in this repository.
- The deterministic detector covers HTML, CSS, component-source formats, browser-computed output, and CI-oriented workflows without requiring an LLM or API key.
- Live Mode supports visual element selection, variant generation, tuning, and source write-back in supported web projects.
- New surfaces default to a comp-first workflow in this repository; the project setting lives in `.impeccable/config.json`.
- Tooling requires Node.js 22.12 or newer where the package manifest applies. Provider and framework capabilities vary, so unsupported behavior must not be implied.

## Brand Commitments

Impeccable is expert, decisive, and editorial. Its voice is authoritative, direct, specific, and rooted in craft: no hedging, vague “vibe” language, or unsupported hype.

The site and brand avoid generic AI-tool marketing, purple-to-blue gradients, neon accents, glassmorphism, glowing particles, SaaS landing-page clichés, interchangeable feature-card grids, educational framing for an already problem-aware audience, and decoration that has no function.

The name Impeccable, the Neo Kinpaku identity, the existing logo and material assets, and the project’s direct command vocabulary are durable brand assets. Visual implementation details remain governed by `DESIGN.md` and the source tokens rather than this product record.

## Evidence on Hand

- The homepage demonstrates the command vocabulary, supported harnesses, before/after comparisons, Live Mode, and product installation (`site/pages/index.astro`).
- The documentation and tutorials provide the command and workflow reference (`site/pages/docs/`, `site/pages/tutorials/`).
- The Neo Mirai case study provides an implemented before/after example (`site/pages/cases/neo-mirai.astro`).
- Detector fixtures and tests provide reproducible evidence for the deterministic rules (`tests/fixtures/`, `tests/detect-antipatterns-fixtures.test.mjs`).
- The changelog records shipped product behavior and historical claims (`site/pages/changelog.astro`).

Do not fabricate adoption metrics, customer names, testimonials, benchmarks, compatibility claims, or endorsements beyond evidence present in the repository.

## Product Principles

1. **Practice what you preach.** The product and site must meet the frontend standards Impeccable asks users to uphold.
2. **Show, do not tell.** Demonstrate design quality through working interfaces, examples, and deterministic evidence.
3. **Give precise direction.** Prefer named, actionable interventions over vague taste language or hedged advice.
4. **Stay inside the coding workflow.** Context, commands, detection, and iteration should reduce translation between design intent and implementation.
5. **Use purposeful restraint.** Features, language, and visual elements must earn their place.

## Accessibility & Inclusion

All pages target WCAG 2.1 AA. Verify color contrast with actual checks; keep every interactive element keyboard-accessible with a visible focus state; respect `prefers-reduced-motion`; prefer semantic HTML and use ARIA as a supplement; and keep copy readable at approximately an eighth-grade level except where precise design terminology is necessary.

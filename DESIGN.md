---
name: Impeccable
description: Paper and instruments. Neutral paper, ink type in one family, and kinpaku gold held to a mark, a line, or an indicator on a dark control. One light theme, no dark mode.

# Every value below mirrors site/styles/kinpaku-tokens.css, which stays the
# source of truth. Names here are the token names without the --ks- prefix.
# A handful of entries are literals the kit ships rather than tokens; each of
# those says so in its comment.
colors:
  # Brand anchors. Gold is the mark and the signal, never text.
  kinpaku-gold: "oklch(84% 0.19 80.46)"        # --ks-kinpaku: mark, indicators, gold fills on instruments
  kinpaku-vivid: "oklch(87% 0.20 85)"          # lit hover on a gold fill
  kinpaku-pale: "oklch(86% 0.07 84)"           # pale tint; rarely needed on paper
  kinpaku-rich: "oklch(77% 0.13 82)"           # hairline gold on paper, active rule
  kinpaku-deep: "oklch(61% 0.085 78)"          # gold border against paper
  on-gold: "oklch(14% 0.018 95)"               # foreground on a gold fill
  gold-line: "oklch(77% 0.13 82)"              # --ks-gold-line, the one-pixel gold rule (aliases kinpaku-rich)

  # Verdigris patina. State, links, selection. The color that carries text.
  patina: "oklch(70% 0.12 188)"                # indicator on instruments, focus ring
  patina-pale: "oklch(82% 0.07 188)"           # soft fill behind a selected row
  patina-deep: "oklch(46% 0.08 188)"           # text-safe patina on paper; --ks-accent-ink, --ks-state-ink, --ks-link-on-paper
  patina-ink: "oklch(38% 0.08 188)"            # hover on patina text; --ks-link-on-paper-hover
  link-line: "oklch(46% 0.08 188 / 0.4)"       # --ks-link-on-paper-line, underline under a link

  # Warning. Failures and warnings only.
  vermilion: "oklch(52% 0.16 35)"

  # Paper. A hair below white so a raised card can read as raised. Chroma 0.
  paper: "oklch(97.8% 0 0)"                    # page ground
  paper-raised: "oklch(99.5% 0 0)"             # cards, panels, inputs
  paper-deep: "oklch(95% 0 0)"                 # sunk wells, code blocks, footer
  gray: "oklch(92% 0 0)"                       # chips, inactive fills, inline code
  gray-2: "oklch(88% 0 0)"                     # one step down from gray
  paper-veil: "oklch(97.8% 0 0 / 0.92)"        # kit literal: the sticky header, paper at 92% over a 12px blur

  # Instrument. Dark control surfaces on the paper, like a device on a desk.
  instrument: "oklch(24% 0 0)"                 # face
  instrument-deep: "oklch(17% 0 0)"            # track, well, strip border
  instrument-raised: "oklch(31% 0 0)"          # key cap, thumb, active picker toggle
  instrument-text: "oklch(93% 0 0)"            # text on instruments
  instrument-muted: "oklch(68% 0 0)"           # muted text on instruments
  instrument-rule: "oklch(100% 0 0 / 0.12)"    # divider and inset highlight on an instrument
  instrument-edge: "oklch(100% 0 0 / 0.3)"     # inset edge on an active key

  # Ink. Neutral. Body copy is text; headlines and <strong> are ink.
  ink: "oklch(13% 0 0)"                        # headlines, <strong>, active nav, the primary button fill
  text: "oklch(22% 0 0)"                       # body; also the primary button's hover fill in the kit
  text-muted: "oklch(46% 0 0)"                 # captions, meta, eyebrows, nav at rest
  text-faint: "oklch(56% 0 0)"                 # subdued meta, segmented labels at rest
  text-mute-deep: "oklch(66% 0 0)"             # disabled only

  # Rules. A divider is faint; the boundary of a control is not.
  rule: "oklch(13% 0 0 / 0.08)"                # --ks-rule, divides content
  edge: "oklch(13% 0 0 / 0.45)"                # --ks-edge, bounds a control, clears 3:1 for WCAG 1.4.11

typography:
  # One family for everything that is read. Google Fonts loads Albert Sans at
  # 400, 500, 600, 700, Alumni Sans at 200 to 600 and JetBrains Mono at 400, 500 (site/layouts/Base.astro).
  # A weight not in that list is synthesized by the browser, so do not ask
  # for it.
  wordmark:
    # The logo lockup. The same face carries display and headline, so it is
    # the brand's display voice, not a logo-only face.
    fontFamily: "Alumni Sans, Albert Sans, Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    letterSpacing: "0.18em"
    lineHeight: 1
  display:
    # Page h1. --ks-type-display-*.
    fontFamily: "Alumni Sans, Albert Sans, Arial, sans-serif"
    fontSize: "clamp(3.2rem, 6.2vw, 5.6rem)"
    fontWeight: 200
    letterSpacing: "-0.025em"
    lineHeight: 1.08
  headline:
    # Section h2. --ks-type-headline-*. The kit styles any h2 inside
    # .ks-section-head to this role.
    fontFamily: "Alumni Sans, Albert Sans, Arial, sans-serif"
    fontSize: "clamp(2.4rem, 3.6vw, 3.4rem)"
    fontWeight: 300
    letterSpacing: "-0.02em"
    lineHeight: 1.15
  title:
    # Card and panel headings, h3. --ks-type-title-*.
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  control:
    # Button label. The .ks-button literal: --ks-type-ui-lead size at 500.
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    letterSpacing: "-0.005em"
    lineHeight: 1
  eyebrow:
    # Small mono labels above titles. --ks-type-eyebrow-*. Color is
    # text-muted, not gold and not patina.
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.14em"
  mono:
    # Code, terminal, audit lines. --ks-type-mono-*.
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.12em"
  # Dense UI ramp for application surfaces (labs, the review workbench).
  # Micro is the floor for anything functional; nothing readable goes below.
  micro:
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
  label:
    # Control text and caps section heads. Instrument keys and segmented
    # controls set this size in the mono family.
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
  ui:
    # List rows and any sentence someone reads to make a decision.
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
  ui-lead:
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400

  # Reading ramp between body and headline. Small is secondary body copy and
  # captions that are read rather than scanned; lead is the intro paragraph;
  # subhead is a card-level heading; title-lg is a bento tile or panel heading.
  small:
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  lead:
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
  subhead:
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
  title-lg:
    fontFamily: "Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500

# Exactly the three radii the tokens define. Nothing else is a radius; a
# control nested inside another subtracts 1px from its parent's value.
rounded:
  sm: "3px"
  md: "8px"
  pill: "999px"

# There is no spacing token in kinpaku-tokens.css. These are the rhythm
# values the kit ships, read from kinpaku-kit.css, so a new page lands on the
# same steps.
spacing:
  xs: "8px"      # form label to input, badge gap
  sm: "14px"     # section head grid gap, toast gap, input padding
  md: "22px"     # subsection label to content, form row gap, button padding
  lg: "48px"     # bento tile padding
  xl: "56px"     # section gutter, section head to content, subsection top
  "2xl": "110px" # section vertical padding inside .ks-section
  section: "clamp(72px, 8vw, 120px)" # --ks-section-pad, the vertical padding of every top-level page section

components:
  tag:
    backgroundColor: "{colors.kinpaku}"
    textColor: "{colors.on-gold}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.sm}"
    height: "22px"
    padding: "0 7px"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-raised}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 22px"
  button-primary-hover:
    backgroundColor: "{colors.text}"
    textColor: "{colors.paper-raised}"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    borderColor: "{colors.edge}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 22px"
  button-secondary-hover:
    borderColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "44px"
    padding: "0 12px"
  button-ghost-hover:
    textColor: "{colors.patina-deep}"
  button-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.text-mute-deep}"
    borderColor: "{colors.rule}"
  input-text:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.sm}"
    height: "46px"
    padding: "0 14px"
  input-text-focus:
    borderColor: "{colors.patina}"
  toggle-on:
    backgroundColor: "{colors.patina}"
    rounded: "{rounded.pill}"
    width: "44px"
    height: "24px"
  checkbox-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-raised}"
    rounded: "{rounded.sm}"
    size: "18px"
  segmented:
    backgroundColor: "{colors.paper-deep}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.sm}"
    height: "32px"
    padding: "3px"
  segmented-thumb:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "2px"                # parent radius minus 1px
  instrument-strip:
    backgroundColor: "{colors.instrument}"
    borderColor: "{colors.instrument-deep}"
    rounded: "{rounded.pill}"
    padding: "3px"
  instrument-key:
    backgroundColor: "transparent"
    textColor: "{colors.instrument-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "32px"
    padding: "0 14px 0 12px"
  instrument-key-active:
    backgroundColor: "{colors.instrument-raised}"
    textColor: "{colors.instrument-text}"
  instrument-strip-paper:
    # .ks-instrument-strip.is-paper: the page control. Recessed gray track
    # (--ks-track-recess), no border.
    backgroundColor: "{colors.gray}"
    rounded: "{rounded.pill}"
    padding: "3px"
  instrument-key-paper-active:
    # A raised paper cap (--ks-cap-lift) with a lit gold dot (--ks-led).
    # With instrument-strip.js the cap is one .ks-thumb that slides.
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
  switch:
    # .ks-switch: a 44x24 recessed track with an 18px paper knob that slides
    # 20px; the knob's 6px dot lights gold when on.
    backgroundColor: "{colors.gray-2}"
    rounded: "{rounded.pill}"
    width: "44px"
    height: "24px"
  tab-active:
    textColor: "{colors.patina-deep}"
    borderColor: "{colors.kinpaku-gold}"
  badge:
    textColor: "{colors.patina-deep}"
    rounded: "2px"
    height: "30px"
    padding: "0 14px"
  pill:
    # .ks-pill: the issue chip. Not the tag.
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 12px"
  bento-tile:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text}"
    rounded: "0"
    padding: "48px"
  modal:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    rounded: "2px"
    padding: "28px"
  tooltip:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.ink}"
    borderColor: "{colors.rule}"
    rounded: "2px"
    padding: "10px 12px"
  code-inline:
    backgroundColor: "{colors.gray}"
    textColor: "{colors.ink}"
    rounded: "3px"
    padding: "0.2em 0.45em"
  code-block:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.text}"
    borderColor: "{colors.rule}"
    rounded: "3px"
  header:
    backgroundColor: "{colors.paper-veil}"
    textColor: "{colors.text-muted}"
    borderColor: "{colors.rule}"
    padding: "18px 56px"
  nav-link:
    textColor: "{colors.text-muted}"
    typography: "{typography.body}"
  nav-link-hover:
    textColor: "{colors.ink}"
  github-pill:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 12px 0 10px"
  footer:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.text-muted}"
    borderColor: "{colors.rule}"
  live-picker-bar:
    backgroundColor: "{colors.instrument}"
    textColor: "{colors.instrument-text}"
    borderColor: "{colors.instrument-rule}"
    rounded: "{rounded.md}"
  live-picker-toggle-active:
    backgroundColor: "{colors.instrument-raised}"
    textColor: "{colors.kinpaku-gold}"
    rounded: "6px"                # kit literal, md minus 2px
  live-picker-go:
    backgroundColor: "{colors.kinpaku-gold}"
    textColor: "{colors.on-gold}"
    size: "36px"
  skip-link:
    backgroundColor: "{colors.patina}"
    textColor: "{colors.on-gold}"
    borderColor: "{colors.patina}"
    rounded: "4px"
---

# Design System: Impeccable

## Overview

**Creative North Star: "Paper and instruments"**

The site is a vessel for the design Impeccable produces. Every world card, case study, slop specimen and live demo on it arrives with its own loud visual system, so the chrome has one job: get out of the way. A gallery wall is white so the art can be loud. The page is neutral paper, the type is ink in one family, and the brand shows up as jewelry rather than upholstery: a gold mark in the header, a one-pixel gold rule, a gold dot on a dark control.

This replaces the dark Neo Kinpaku system. No lacquer ground, no gold-leaf texture, no kintsugi hero art, no theme toggle. The proof still has to work: comparisons, command demos, audit tables and docs modules carry the color now, and the chrome around them stays quiet so they can.

`site/styles/kinpaku-tokens.css` names three families of surface:

- **Paper**: the page and everything that sits flat on it.
- **Gray**: chips, inactive fills, sunk wells.
- **Instrument**: dark control surfaces. The only place the site goes dark, and the only place gold reads as a signal rather than a mark.

**Key characteristics:**

- One light theme. `:root` sets `color-scheme: light`; there is no `html.dark`, no `prefers-color-scheme` block, no toggle.
- Paper is neutral, chroma 0. Gold on cream is gold on gold.
- Gold never carries body text and never fills a surface on paper. The one gold fill is the tag: a 22px label with dark mono text, the detector's own flag, used for numerals and states.
- Patina carries links, state and selection wherever color has to be read as text.
- Albert Sans for everything that is read, at 400 to 600. Alumni Sans, the wordmark's face, carries the hero at 200 and section headings at 300; nothing below a section heading uses it.
- Three radii, three control heights, two lifts. The paper hardware (caps, tracks, the lit dot) has its own five shadow tokens; nothing else casts a shadow.
- Grain is a material, not an overlay: the paper ground and the moulded control surfaces carry it, and everything that sits on them is clean.

## Layout

The kit lives at `site/styles/kinpaku-kit.css` and is imported from `Base.astro` together with the tokens, so every page has both. `/design-system` renders every primitive with no page overrides and reads token values live from the stylesheet; if it looks wrong there, it looks wrong everywhere.

### The Kit Consumption Rule

Reach for a kit primitive before inventing a class. Specifically:

- **Buttons**: `.ks-button` plus a variant (`.ks-button-primary`, `-secondary`, `-ghost`, `-disabled`). Both classes are required; the chained selector is what beats page-level anchor resets. Do not write another `.hero-cta` or `.footer-cta`.
- **Grouping content**: `.ks-bento` with `.ks-bento-tile` (`--span-4` / `--span-6` / `--span-8` on a 12-column grid). This is the answer to "how do I group 2 to 6 items without nesting cards".
- **Section scaffolding**: `.ks-section` as the container, `.ks-section-head` for the header with an `<h2>` inside it (the kit styles it to the headline role), `.ks-section-sub` for the subhead. `.ks-section-eyebrow` above the h2 is optional; skip it on editorial pages where an eyebrow on every section reads as scaffolding.
- **Anything the reader operates**: `.ks-instrument-strip.is-paper` for a page control (a tab row, a view switch, a command switcher), the dark `.ks-instrument-strip` for product chrome (the live picker, lab toolbars, terminals), `.ks-switch` for one on/off state, `.ks-segmented` for a dense single-select. Do not build a fifth segmented control or a fourth dark surface; the kit's exist because bespoke ones did.
- **Status, tags, toasts, modals, tooltips, empty states, pagination, skeletons, changelog rows**: the kit primitive, listed below.

Invent only when the kit truly does not cover the shape, and flag it when you do. A pattern that solves a recurring need belongs in the kit, not in page CSS. Page CSS is for page-specific scenery.

### What's In The Kit (cheatsheet)

**Brand lockup**

- `.ks-brand`: wrapper for mark plus wordmark, 4px gap.
- `.ks-mark`: the carved tile split by the slash, 38px box with a 32px glyph, filled `--ks-kinpaku`. This is the one place gold fills a shape on paper.
- `.ks-wordmark`: IMPECCABLE in `--ks-font-wordmark`, `--ks-ink`, weight 400, 0.15em tracking, uppercase.

**Section scaffolding**

- `.ks-section`: 1320px max width, 110px vertical and 56px horizontal padding. Consecutive sections get a 1px `--ks-rule` between them.
- `.ks-section-head`: 720px max width, 14px grid gap, 56px below.
- `.ks-section-head h2`: the headline role.
- `.ks-section-eyebrow`: mono caps above the h2, `--ks-text-muted`.
- `.ks-section-sub`: the subhead, `--ks-text-muted`, 60ch.
- `.ks-subsection` and `.ks-subsection-label`: 56px above a nested group, mono label 22px above its content.

**Buttons**

- `.ks-button.ks-button-primary`: ink fill, paper text, gold arrow.
- `.ks-button.ks-button-secondary`: paper-raised fill, `--ks-edge` border, ink text.
- `.ks-button.ks-button-ghost`: no fill, ink text, patina on hover.
- `.ks-button[disabled]` or `.ks-button.ks-button-disabled`.
- `.ks-button-arrow`: the 16x8 arrow SVG wrapper.
- `.ks-button-row`: flex row, 18px gap.

**Form controls**

- `.ks-form-sample`: vertical form layout, 22px row gap, 360px max.
- `.ks-toggle`: 44x24 pill switch, patina when on.
- `.ks-checkbox`: 18px square, ink when on.
- `.ks-select`: paper-raised with an ink chevron.

**Tabs and switches**

- `.ks-tabs`, `.ks-tab-list`, `.ks-tab-panel`: underline tabs. Selected tab is patina text on a 2px gold underline.
- `.ks-segmented` (with `--lg`, `--dense`, `--wrap`): paper track, raised thumb.
- `.ks-instrument-strip` with `.ks-instrument-key` (`.is-active` or `aria-selected`): the dark strip for product chrome. `.ks-instrument-strip.is-paper` is the page control: a recessed gray track, raised paper caps with a white top edge and a hard shadow under them, a lit gold dot. A single key on a track is a switch.
- `.ks-thumb`: the one sliding cap inside a strip, created and positioned by `site/scripts/instrument-strip.js` (add `data-ks-thumb` or let the script find the strip). Keys become equal columns and the cap slides between them on a glass-smooth curve; the keys themselves stop painting a cap.
- `.ks-switch` with `.ks-switch-track`, `.ks-switch-knob`, `.ks-switch-label`: a physical slide switch for one on/off state, driven by `aria-pressed`. The detector toggle on the slop previews.
- `.ks-tag` (and `.ks-tag.is-quiet`): the brand's label. Section numerals, a card's state, a release's status, the annotation tags on the hero card.

**Status, pills, and feedback**

- `.ks-badge` + `.is-detected` / `.is-improved` / `.is-ready`: 30px chip with a 6px dot.
- `.ks-pill` + `.is-detected` / `.is-improved` / `.is-neutral` / `.is-ready`: 26px pill, no dot. The issue chip; not the tag.
- `.ks-badge-row`, `.ks-pill-row`: flex row helpers.
- `.ks-toast` + `.is-success` / `.is-warning`, with `.ks-toast-icon` and `.ks-toast-close`.
- `.ks-modal` with `.ks-modal-actions` and `.ks-modal-close`.
- `.ks-empty` with `.ks-empty-icon`: dashed `--ks-rule` border.
- `.ks-skeleton`: gray shimmer bars.
- `.ks-pagination`: 36px square buttons, gold border on the current page.
- `.ks-icon-button` + `.ks-tooltip`: round icon button, tooltip on `--ks-paper-deep`.

**Containers**

- `.ks-bento`: 12-column grid. Tiles are separated by a 1px `--ks-rule` grid (gap 1px over a rule-colored background) with a rule above and below.
- `.ks-bento-tile`, `.ks-bento-tile--span-4` / `--span-6` / `--span-8`: paper tiles, 48px padding, square corners. Collapse to full width under 980px.
- `.ks-bento-num`: tiny mono caps marker, patina.

**Changelog**

- `.ks-changelog`, `.ks-changelog-entry`, `.ks-changelog-date`, `.ks-changelog-body`. An `<em>` inside the `<strong>` renders as a small caps badge with a gold border and patina text.

**Site chrome**

- `body.kinpaku-chrome`: opts a page into the shared header and footer treatment. Header is `--ks-paper` at 92% over a 12px blur with a rule below; nav links are `--ks-text-muted`, ink on hover and on `aria-current`; the GitHub pill is a paper-raised pill with an `--ks-edge` border and a gold star. Under 760px the right cluster becomes a drawer behind `.site-header-menu`.
- `body.kinpaku-surface`: remaps the legacy `--color-*` tokens onto the paper system for pages whose content still reads them.
- `.kinpaku-chrome .site-footer`: `--ks-paper-deep` with a rule above. Links `--ks-text-muted`, ink on hover.
- `.kinpaku-chrome .skip-link`: patina pill with `--ks-on-gold` text.

**Live picker mock**

- `.live-demo-gbar` and `.live-demo-ctx` under `body.home-kinpaku` or `body.live-mode-kinpaku`: the picker chrome the homepage and `/live-mode` show. Structure comes from `site/styles/live-mode.css`; the kit paints it on `--ks-instrument`.

### Signature moments

Four page-level pieces are built from the kit and its tokens rather than added to it. They are the site's expressive budget, and each is one instrument doing one job:

- **The hero spread** (`site/styles/home-sections.css`, `home-demos.css`): the annotated before / after card sits left of a centre spine and the headline right of it, both hugging the spine, the whole spread shifted left of the geometric centre by up to 90px so its visual mass sits in the middle. The card's top meets the headline's cap line. The seam between the states is a 2px `--ks-kinpaku` rail with a paper fader cap (`--ks-cap-lift`, three grip ridges, a 2px gold ring) that presses while dragging; its range is bounded to the card's edges.
- **The patch cable** (`site/scripts/hero-cable.js`): an easter egg. While the pointer rests on the headline, the v of "vocabulary" continues as a cable that swoops into the command switcher, laid in over 1.5s and pulled back when the pointer leaves, so the hero at rest stays quiet. Stroke matched to the glyph's stem, ink at the letter fading to `--ks-gray-2`. Hidden below 980px. A tidier route from the y's foot exists behind `?cable=y`.
- **The arrow points where it goes**: the primary button's gold arrow curves to point downward on hover when the button's target is further down the page (`href^="#"`, or `.is-down` on the arrow), and straightens on leave.
- **The console** (`site/components/CommandConsole.astro`, `console.css`): the Language section is one instrument panel of faders and keys acting on one subject in a display window, one channel per command. Two-row deck between 981 and 1300px, stacked below.
- **The command rail** (`site/components/DocsSidebar.astro`, `docs-kinpaku.css`): on the docs pages the commands sit in the sidebar as the agent's own palette, a dark panel on the instrument tokens with a filter line at its head, group captions inside, and the current page's command lit with the gold dot. The tutorials and reference links above it stay on paper, so the commands read as the product. Descended from `docs/concepts/docs-slash-menu.html`.
- **Words that perform** (`site/scripts/word-performances.js`): 23 self-demonstrating text effects, one per command, on the docs' command titles and the console's fader labels. Every after-state must pass the detector's own catalog.

### Tokens vs Classes

Outside a kit primitive, read the token, never the value:

- Surfaces: `var(--ks-paper)`, `var(--ks-paper-raised)`, `var(--ks-paper-deep)`, `var(--ks-gray)`, `var(--ks-gray-2)`, and `var(--ks-instrument*)` for a control.
- Text: `var(--ks-ink)`, `var(--ks-text)`, `var(--ks-text-muted)`, `var(--ks-text-faint)`. Colored text is `var(--ks-accent-ink)`, `var(--ks-state-ink)` or `var(--ks-link-on-paper)`; all three resolve to patina-deep.
- Rules: `var(--ks-rule)` to divide, `var(--ks-edge)` to bound a control, `var(--ks-gold-line)` for the one gold hairline.
- Type: `var(--ks-type-display-*)`, `var(--ks-type-headline-*)`, `var(--ks-type-title-*)`, the dense ramp `--ks-type-micro-size` through `--ks-type-ui-lead`.
- Shape and depth: `var(--ks-radius-sm|md|pill)`, `var(--ks-control-sm|md|lg)`, `var(--ks-lift-1|2)`; for paper hardware `var(--ks-cap-lift)`, `var(--ks-cap-press)`, `var(--ks-track-recess)`, `var(--ks-led)`; on a dark strip `var(--ks-key-lift)`, `var(--ks-indicator-glow)`.
- Rhythm: `var(--ks-section-pad)` for the vertical padding of every top-level section.
- Motion: `var(--ks-quick)`, `var(--ks-settle)`, `var(--ks-ease)`.

A hand-typed `oklch()` in page CSS is acceptable in two cases: a one-off alpha of an existing token color, or a demo of someone else's design. Everything else is either a token that needs adding or a sign the moment is bespoke enough to live page-locally, and either way the decision has to be deliberate.

## Colors

### Paper

- **Paper** (`oklch(97.8% 0 0)`): the page ground. A hair below white so a raised card can read as raised.
- **Paper Raised** (`oklch(99.5% 0 0)`): cards, panels, inputs, the secondary button, the segmented thumb.
- **Paper Deep** (`oklch(95% 0 0)`): sunk wells, code blocks, the segmented track, the footer, tooltips.
- **Gray** (`oklch(92% 0 0)`): chips, inactive fills, inline code, the toggle at rest.
- **Gray 2** (`oklch(88% 0 0)`): one step down from gray.

All five are chroma 0. The old paper had a warm cast at hue 95; gold on that read as gold on gold.

### Ink

- **Ink** (`oklch(13% 0 0)`): headlines, `<strong>`, active nav, and the fill of the primary button.
- **Text** (`oklch(22% 0 0)`): body copy.
- **Muted** (`oklch(46% 0 0)`): captions, meta, eyebrows, section subheads, nav links at rest.
- **Faint** (`oklch(56% 0 0)`): subdued meta, segmented labels at rest, counts.
- **Mute Deep** (`oklch(66% 0 0)`): disabled only. It measures under 4.5:1 on paper by design; a live figure using it is a bug.

### Instrument

- **Instrument** (`oklch(24% 0 0)`): the face of a strip, a terminal, a picker bar.
- **Instrument Deep** (`oklch(17% 0 0)`): a track, a well, the strip's border.
- **Instrument Raised** (`oklch(31% 0 0)`): a key cap, a thumb, the active picker toggle.
- **Instrument Text** (`oklch(93% 0 0)`) and **Instrument Muted** (`oklch(68% 0 0)`): the two foregrounds on an instrument.
- **Instrument Rule** (`oklch(100% 0 0 / 0.12)`) and **Instrument Edge** (`oklch(100% 0 0 / 0.3)`): dividers and the inset highlight that gives a key its top edge.

### Gold

- **Kinpaku** (`oklch(84% 0.19 80.46)`): the mark, the arrow in the primary button, the dot on an active instrument key, the gold underline on a selected tab, the Go and Accept fills in the picker. At 84% lightness it lands under 2:1 against paper, which is why it never carries text there.
- **Kinpaku Vivid** (`oklch(87% 0.20 85)`): lit hover on a gold fill.
- **Kinpaku Rich** (`oklch(77% 0.13 82)`): the one-pixel gold rule (`--ks-gold-line` aliases it).
- **Kinpaku Deep** (`oklch(61% 0.085 78)`): a gold border against paper.
- **On Gold** (`oklch(14% 0.018 95)`): the foreground on a gold fill.

### Patina

- **Patina** (`oklch(70% 0.12 188)`): indicator on instruments, the focus ring, the toggle when on.
- **Patina Pale** (`oklch(82% 0.07 188)`): a soft fill behind a selected row.
- **Patina Deep** (`oklch(46% 0.08 188)`): patina as text. Links, the selected tab, `.is-improved` and `.is-ready` badges, the ghost button on hover. Clears 4.5:1 on paper.
- **Patina Ink** (`oklch(38% 0.08 188)`): hover on patina text.
- **Vermilion** (`oklch(52% 0.16 35)`): `.is-detected`, the warning toast, the picker's exit and discard hovers. Failures and warnings only.

### Rules

- **Rule** (`oklch(13% 0 0 / 0.08)`): divides content.
- **Edge** (`oklch(13% 0 0 / 0.45)`): bounds something you can operate. WCAG 1.4.11 asks 3:1 of anything that tells you where a control is, and `--ks-rule` does not clear it.
- **Gold Line** (`oklch(77% 0.13 82)`): the one gold hairline. Use one, not a set.

### Color Rules

**The Gold Is Jewelry Rule.** Gold is a mark, a line, an indicator on an instrument (the lit dot on a key, the switch's knob, the ring on the hero's fader cap), or the tag. It never carries body text and never fills a surface on paper; the tag is a 22px label and stays one. The primary button is ink with a gold arrow; a gold button is the hotel-lobby read. The one exception is a demo that deliberately shows someone else's design.

**The Patina Carries Text Rule.** When color has to be read as text, it is `--ks-patina-deep`, reached through `--ks-accent-ink`, `--ks-state-ink` or `--ks-link-on-paper`. Active nav is ink, not patina, and eyebrows are muted ink.

**The Instruments Only Rule.** A dark surface is a control the reader operates: a tab strip, a segmented picker, a slider, a terminal, the live picker bar. No dark section backgrounds, no dark cards, no dark footer.

**The Neutral Paper Rule.** Every paper and ink token is chroma 0. Do not reintroduce a warm cast.

**The Tokens Over Literals Rule.** New colors are `--ks-*` tokens in OKLCH. A literal is a one-off alpha of a token or a specimen of someone else's design.

## Typography

**Family:** Albert Sans, Avenir Next, Helvetica Neue, Arial, system-ui, sans-serif
**Wordmark:** Alumni Sans, Albert Sans, Arial, sans-serif
**Mono:** SFMono-Regular, Roboto Mono, JetBrains Mono, Consolas, monospace

Albert Sans for everything that is read, at normal weights. Alumni Sans, the condensed face of the wordmark, is the display voice: `--ks-font-display` points at it and the display token carries it at 200 (the hairline of the first site, one step heavier so it holds on paper) and the headline token at 300. Google Fonts loads Albert Sans at 400 to 700, Alumni Sans at 200 to 600, and JetBrains Mono at 400 and 500 for labels, keys and code.

### Hierarchy

- **Wordmark** (Alumni Sans, 500, `1.25rem`, 0.18em tracking, uppercase): the header lockup and the footer logo.
- **Display, h1** (Alumni Sans, 200, `clamp(3.2rem, 6.2vw, 5.6rem)`, line 1.0).
- **Headline, h2** (Alumni Sans, 300, `clamp(2.4rem, 3.6vw, 3.4rem)`, line 1.04).
- **Title, h3** (Albert Sans, 600, `1.0625rem`, line 1.35).
- **Body** (Albert Sans, 400, `1rem`, line 1.65). Long copy holds a 65ch measure.
- **Control** (Albert Sans, 500, `0.9375rem`, line 1): button labels.
- **Eyebrow** (mono, `0.6875rem`, 0.14em, uppercase, muted ink).
- **Mono** (mono, `0.6875rem`, 0.12em): code, terminal, audit lines.
- **Dense ramp**: micro `0.6875rem` (11px), label `0.75rem` (12px), ui `0.8125rem` (13px), ui-lead `0.9375rem` (15px). Instrument keys and segmented labels set the label size in the mono family.
- **Reading ramp**: small `0.875rem` (14px), lead `1.125rem` (18px), subhead `1.25rem` (20px), title-lg `1.5rem` (24px).

### Typography Rules

**The Two Voices Rule.** Alumni Sans speaks in headings and the wordmark; Albert Sans speaks everywhere text is read. Never a third face, never Alumni below a section heading, never weight 100: the hairline went gray on paper.

**The Weights Rule.** Alumni Sans is 200 on the display and 300 on the headline, and those are the only two weights it takes; 100 went gray on paper. Albert Sans runs 400 to 600: body at 400, control text and subheads at 500, titles at 600. Albert Sans at 300 is not loaded, so do not ask for it.

**The Micro Floor Rule.** Nothing functional goes below 11px. Being on the ramp does not exempt a value; 10px fails on high-DPI and on small viewports whatever the token is called.

**The Tracked Labels Are Short Rule.** Tracked mono caps are for eyebrows, section labels and tile numbers. Never a sentence.

## Elevation and Depth

The system is flat. Depth comes from the surface ladder, hairlines, and two shadows.

### Shadow Vocabulary

- **Lift 1** (`0 1px 1px oklch(13% 0 0 / 0.05), 0 2px 3px oklch(13% 0 0 / 0.04), 0 6px 12px oklch(13% 0 0 / 0.05)`): a raised card, the segmented thumb, the dark strip on the paper. Three layers standing in for a contact edge, a short throw and a long one.
- **Lift 2** (`0 1px 1px oklch(13% 0 0 / 0.04), 0 3px 5px oklch(13% 0 0 / 0.05), 0 12px 20px oklch(13% 0 0 / 0.06), 0 32px 48px oklch(13% 0 0 / 0.07)`): a popover, a modal, a picker bar.
- **No default card shadow.** Cards and tiles rest on `--ks-rule` and a surface step.

### Hardware Depth

The paper controls are moulded, not drawn. Five tokens carry the whole language, and a control uses them rather than composing its own shadow:

- **Cap lift** (`--ks-cap-lift`): a raised paper key. A white highlight along its top edge, a hard 1px shadow under it, a soft one behind. The active key on a paper strip, the switch's knob, the hero's fader cap.
- **Cap press** (`--ks-cap-press`): the same cap pushed in, an inset shadow, on `:active`.
- **Track recess** (`--ks-track-recess`): the channel a cap sits in. The paper strip's track, the switch's track.
- **LED** (`--ks-led`): the lit gold dot on a paper cap, a 1px ink ring and a 4px gold glow.
- **Key lift** (`--ks-key-lift`) and **indicator glow** (`--ks-indicator-glow`): the same two moves on a dark strip.

### Grain

One 160px tile of monochrome noise from an SVG filter (`--ks-grain`). The page ground carries it at 5.5% multiplied (`body::before`, fixed), and so do the moulded surfaces: a dark strip at 16% screened, a paper strip at 5%, anything with `.ks-grain`. Everything that sits on those (a card, a demo, an image, type) is clean. Grain is what makes a strip read as a part instead of a black rectangle; it is never an overlay on content.

### Instrument Depth

An instrument gets its form from three ink-free moves: a 1px `--ks-instrument-deep` border, an inset `--ks-instrument-rule` highlight along the top of the face, and an active key on `--ks-instrument-raised` with an inset `--ks-instrument-edge` top edge. The key lifts off the face; it does not tint.

### Control Scales

Application surfaces (the labs, the review workbench) need scales the marketing pages never asked for, because a page with four elements can improvise each one and a page with four hundred cannot. These are the values; anything off them is a mistake, not a smaller size.

**Radius: three values.** `--ks-radius-sm` 3px for buttons, inputs, chips and the segmented track. `--ks-radius-md` 8px for cards, the picker bar and its palette. `--ks-radius-pill` for the instrument strip and its keys, toggles, tags. A control nested inside another subtracts 1px rather than picking a fourth value.

**Control height: three rungs.** `--ks-control-sm` 26px for dense chrome in a rail, `--ks-control-md` 32px for the default (instrument keys, the segmented control), `--ks-control-lg` 44px for a button. A segmented track lands on a rung by construction: 3px inset plus a 24px segment plus 3px plus two borders is `--ks-control-md`.

**Motion: one duration pair, one curve.** `--ks-quick` 120ms for a state change, `--ks-settle` 200ms for something arriving, `--ks-ease` (`cubic-bezier(0.2, 0.8, 0.2, 1)`) for both. Declare the transition once per surface.

**Surfaces: a ladder that can be seen.** Paper steps 97.8, 99.5, 95, 92, 88. Instruments step 17, 24, 31. Below about 1.02 in luminance a surface change is invisible and the page reads as one plane.

### Material Rules

**The Hairline First Rule.** A 1px `--ks-rule` before any shadow. `--ks-edge` when the line bounds something operable.

**The One Veil Rule.** The sticky header is paper at 92% over a 12px blur. That is the only translucency on the site; there are no glass panels.

**The Grain Is Material Rule.** No leaf, dust, seam or oxidation images anywhere in the chrome; the retired textures do not come back. The one texture is the grain, and it belongs to a material: the paper ground and the moulded control surfaces. It never sits over content, and it never carries meaning.

## Shapes

Three radii and nothing else. Small (3px) for buttons, inputs, chips and the segmented track; medium (8px) for cards, the picker bar and its command palette; pill for the instrument strip and its keys, the toggle, tags, the GitHub pill. A control nested inside another subtracts 1px from its parent (the segmented thumb is 2px inside a 3px track; the `--lg` variant is 6px inside 8px). Bento tiles and the structural slabs stay square because their edges are the layout.

**The Three-Radius Rule.** Use `--ks-radius-sm`, `--ks-radius-md` or `--ks-radius-pill`. Treat a nested-control subtraction as derived geometry, not a fourth radius. Every kit primitive reads the token; a literal radius in page CSS is a finding, not a style.

## Components

### Buttons

- **Primary** (`.ks-button.ks-button-primary`): `--ks-ink` fill and border, `--ks-paper-raised` text, the arrow in `--ks-kinpaku`. Hover darkens to `oklch(22% 0 0)`, press to `oklch(8% 0 0)`. The brand is the arrow, not the fill.
- **Secondary** (`.ks-button.ks-button-secondary`): `--ks-paper-raised` fill, `--ks-edge` border, ink text. Border goes to ink on hover, fill to `--ks-gray` on press.
- **Ghost** (`.ks-button.ks-button-ghost`): no fill or border, 12px padding, ink text that turns `--ks-accent-ink` on hover.
- **Disabled**: `--ks-text-mute-deep` text on a `--ks-rule` border, no fill.
- All variants: 44px min height (`--ks-control-lg`), `--ks-radius-sm`, 22px horizontal padding, control type at 500, transitions on `--ks-quick`.
- **Focus**: a 2px `--ks-patina` outline offset 3px. The same ring, offset 2px, sits on every instrument key.

### Form controls

- **Text input**: 46px, `--ks-paper-raised` on a `--ks-rule` border, ink text. Focus swaps the border to `--ks-patina`.
- **Toggle** (`.ks-toggle`): 44x24 pill, `--ks-gray` track with a `--ks-text-muted` knob; on, the border and knob go patina and the track takes a 20% patina wash.
- **Checkbox** (`.ks-checkbox`): 18px, ink fill with a paper check when on.
- **Select** (`.ks-select`): matches the input, with an ink chevron.

### Tabs and switches

- **Tabs** (`.ks-tabs`): flat buttons on a `--ks-rule` baseline, `--ks-text-muted` at rest, ink on hover. The selected tab is `--ks-accent-ink` text over a 2px `--ks-kinpaku` underline: patina carries the text, gold carries the line.
- **Segmented** (`.ks-segmented`): a paper instrument. `--ks-paper-deep` track inset 3px inside an `--ks-edge` border at `--ks-radius-sm`; mono label type in `--ks-text-faint`; the thumb is `--ks-paper-raised` with an inset `--ks-rule` and `--ks-lift-1`, ink text. Hover lifts to paper-raised, press drops to `--ks-gray`. `--lg` moves to the reading face at ui size on an 8px radius, `--dense` lands the whole control on `--ks-control-sm`, `--wrap` lets a long group wrap.
- **Paper strip** (`.ks-instrument-strip.is-paper`): the page control. A recessed `--ks-gray` track (`--ks-track-recess`, no border, 5% grain), keys in `--ks-text-muted` with a sunk gray dot, and the active key a raised `--ks-paper-raised` cap (`--ks-cap-lift`) in ink with a lit gold dot (`--ks-led`). With `instrument-strip.js` the cap is one `.ks-thumb` that slides between equal-width keys; drag it or click a key. The hero's command switcher, the Palette / Periodic toggle, the era switch on /slop, the phase strip on /designing. Anything tab-shaped.
- **Switch** (`.ks-switch`): one on/off state. A 44x24 `--ks-gray-2` track with the recess, an 18px paper knob on the cap lift that slides 20px, a 6px dot on the knob that goes gold with the LED glow when on. Label in ui size, muted at rest and ink when on. Focus rings the track in gold.
- **Tag** (`.ks-tag`): the brand's label and the one gold fill on paper. 22px, `--ks-on-gold` mono caps at 600 on `--ks-kinpaku`, `--ks-radius-sm`. `.is-quiet` is the same tag in muted ink on `--ks-gray` for a secondary label beside a gold one. It never grows past a label.
- **Instrument strip** (`.ks-instrument-strip`): the site's one dark control. Pill track on `--ks-instrument` with a `--ks-instrument-deep` border, inset top highlight and `--ks-lift-1`; keys are 32px pills in mono label type, `--ks-instrument-muted` at rest with a 6px `--ks-instrument-raised` dot. The active key is `--ks-instrument-raised` with `--ks-instrument-text` and a `--ks-kinpaku` dot. Patina takes the dot when the state is selection rather than position. For tab strips, view switches and command pickers; never for decoration and never for a link list.

### Status and feedback

- **Badge** (`.ks-badge`): 30px, 1px border in `currentColor`, 6px dot. Detected is vermilion, improved is `--ks-state-ink`, ready is `--ks-accent-ink`.
- **Pill** (`.ks-pill`): 26px pill, same colors plus `.is-neutral` in muted ink. The issue chip.
- **Toast** (`.ks-toast`): bordered in `currentColor`, ink title, muted body, 420px max. `.is-success` is patina, `.is-warning` vermilion.
- **Modal** (`.ks-modal`): `--ks-paper-raised` on a `--ks-rule` border, 28px padding, 440px max, actions right-aligned.
- **Tooltip** (`.ks-tooltip`): 200px on `--ks-paper-deep`, shown on `:focus-visible` of the `.ks-icon-button` beside it.
- **Empty state** (`.ks-empty`): dashed `--ks-rule` border, centered, patina icon.
- **Pagination** (`.ks-pagination`): 36px squares on `--ks-rule`; hover and the current page take a gold border with patina text.
- **Skeleton** (`.ks-skeleton`): 8px pills shimmering between `--ks-gray` and `--ks-paper-raised`.

### Bento

`.ks-bento` is the canonical alternative to a card in a card: paper tiles on a 12-column grid, 48px padding, square corners, separated by a 1px `--ks-rule` grid with a rule above and below the whole block. Tiles collapse to full width under 980px. `.ks-bento-num` is a mono caps marker in patina.

### Site chrome

- **Header**: `--ks-paper` at 92% over a 12px blur, a `--ks-rule` below, 18px vertical padding with fluid gutters. The lockup is `.ks-mark` in gold beside the wordmark in ink. Nav links are `--ks-text-muted`, ink on hover and on `aria-current="page"`. The GitHub pill is `--ks-paper-raised` with an `--ks-edge` border and a `--ks-kinpaku` star. Under 760px the nav becomes a drawer with hairline-separated rows.
- **Footer**: `--ks-paper-deep` with a `--ks-rule` above. Links and credit in `--ks-text-muted`, ink on hover. No texture, no dark band.
- **Code**: inline code is an ink-on-`--ks-gray` chip at 3px. Blocks and CLI commands are `--ks-paper-deep` wells with a `--ks-rule` hairline. A command that is itself a link reads as a link.

### Live picker

The real picker injects into user dev servers from `skill/scripts/live-browser.js`; the site's mock (`.live-demo-gbar`, `.live-demo-ctx`) mirrors it from the kit. It is an instrument: `--ks-instrument` face, `--ks-instrument-rule` border, 8px radius, `--ks-instrument-text`. The brand mark is `--ks-kinpaku` on transparent; controls are `--ks-instrument-muted`; the active toggle is an `--ks-instrument-raised` chip with gold text and icon; Go and Accept are `--ks-kinpaku` fills with `--ks-on-gold`; exit and discard hover to vermilion. The selection outline on the page is a 1.5px `--ks-patina-deep` line with no glow. Picker chrome does not adapt to the host page.

## Do's and Don'ts

### Do

- Do keep the chrome quiet so the demos can be loud.
- Do put gold on the mark, a one-pixel rule, or an indicator on an instrument.
- Do use `--ks-accent-ink`, `--ks-state-ink` or `--ks-link-on-paper` whenever color has to be read as text.
- Do reserve `--ks-instrument*` for something the reader operates.
- Do set the display and headline in Alumni Sans at 200 and 300 through the type tokens, and everything read in Albert Sans.
- Do land every radius, control height and shadow on the ladder.
- Do reach for the kit primitive first, and flag it when a new pattern earns a place in the kit.
- Do keep the proof readable: comparisons, sliders, audit tables, command examples and docs are the product.

### Don't

- Do not add a dark mode, a theme toggle, an `html.dark` selector or a `prefers-color-scheme` block.
- Do not set gold as a text color, at any size, on paper.
- Do not fill a button, chip, slab or panel with gold on paper.
- Do not give a decorative section, card or footer a dark background.
- Do not tint paper or ink; every surface and text token is chroma 0.
- Do not use Alumni Sans below a section heading, or at weight 100 anywhere.
- Do not put grain over content, and do not add any other texture.
- Do not compose a shadow for a control; use the hardware tokens.
- Do not add a fourth radius, a fourth control height or a third shadow.
- Do not hand-type an `oklch()` value in page CSS except as a one-off alpha of a token or inside a specimen of someone else's design.
- Do not use pure black or pure white.
- Do not theme-adapt the live picker to a host page.

### What was retired

Gone with the Neo Kinpaku system, and not to come back:

- The dark lacquer ground and its ladder (`--ks-lacquer`, `--ks-lacquer-deep`, `--ks-lacquer-raised`, `--ks-graphite`, `--ks-graphite-2`). The names now resolve nowhere; paper and instrument tokens replaced them.
- The light theme as an override (`html.light`), the dark default, and the theme toggle. One theme, unconditional.
- Warm-cast paper and ink (`oklch(... 0.012 95)` and friends). Paper is neutral.
- Gold as text: `--ks-champagne`, `--ks-kinpaku-ink` as a gold value, gold display accent words on paper, gold eyebrows and tile numbers. `--ks-kinpaku-ink` survives only as an alias of patina-deep.
- Gold fills on paper: gold CTAs, gold chips, gold category cells in the periodic table, the gold-bordered picker bar with its halo.
- Textures and art: gold-leaf overlays (`kinpaku-gold-leaf.png`), kintsugi hero art (`m-01-v2-01*`), `gold-dust-rule.png`, `hero-seam-field*.png`, lacquer grain, verdigris patina textures, the textured footer divider.
- The hairline heading (h1 at 100) and the weight inversion rule. Alumni Sans itself came back as the display face, one step heavier.
- The enumerated 8px to 88px type ramp. The tokens define the roles and the dense ramp; nothing else.
- The four-shadow vocabulary (panel setback, CTA lift, control lifts, patina glow). Two lifts remain, plus the hardware tokens for controls.
- Calibration marks, circuit geometry and gold seams as structure.
- The 2px and `none` entries in the radius scale. Three radii remain.

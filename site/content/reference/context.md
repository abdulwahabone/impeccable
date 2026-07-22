---
title: Design Context
tagline: "Give Impeccable enough project memory to make specific design decisions."
description: "Understand why Impeccable needs design context, what to put in PRODUCT.md and DESIGN.md, and how to keep that context current."
section: concepts
order: 1
---

Impeccable works best when it can read the same product and design decisions you would give a human designer. Without that context, it has to infer audience, tone, palette, type, and component rules from code alone. That usually produces safer, more generic answers.

<p class="docs-context-note">If Impeccable gives you generic advice, the design context is usually missing, too vague, or stale.</p>

## The fast path

Run the setup once from your project root:

```text
/impeccable init
```

That creates `PRODUCT.md`, the strategy file. At the end, say yes when Impeccable offers to run:

```text
/impeccable document
```

That creates `DESIGN.md`, the visual-system file, plus a generated helper at `.impeccable/design.json`. Review the two markdown files. Edit anything that does not match the real product.

<div class="docs-context-flow" aria-label="How Impeccable uses design context">
  <div class="docs-context-flow-source">
    <span class="docs-context-flow-label">Strategy</span>
    <strong>PRODUCT.md</strong>
    <span>Platform, users, purpose, positioning, evidence, brand commitments.</span>
  </div>
  <div class="docs-context-flow-source">
    <span class="docs-context-flow-label">Visual system</span>
    <strong>DESIGN.md</strong>
    <span>Colors, type, components, radii, design rules.</span>
  </div>
  <div class="docs-context-flow-source">
    <span class="docs-context-flow-label">Per surface</span>
    <strong>.impeccable/surfaces/</strong>
    <span>One page's mode, job, proof sequence, and chosen direction.</span>
  </div>
  <div class="docs-context-flow-source docs-context-flow-source--generated">
    <span class="docs-context-flow-label">Generated</span>
    <strong>.impeccable/design.json</strong>
    <span>Structured metadata for automation. Do not hand-edit.</span>
  </div>
  <div class="docs-context-flow-output">
    <span class="docs-context-flow-label">Used by</span>
    <strong>Commands, hooks, detector, Live Mode</strong>
    <span>More specific edits, better audits, fewer false assumptions.</span>
  </div>
</div>

## What goes where

| File | What it should answer | Update it when |
|---|---|---|
| `PRODUCT.md` | What platform is this? Who is it for? What does the product do, and what claim could a neighbor not copy? What real evidence and brand commitments exist? | Platform, audience, positioning, purpose, constraints, evidence, or brand commitments change. |
| `DESIGN.md` | What colors, type stacks, component treatments, radii, elevation, and visual rules are allowed? | Palette, typography, components, tokens, spacing/radius scales, or design rules change. |
| `.impeccable/surfaces/*.md` | For one page or route: what mode is it, what job does it do, what proof does it show, and which direction was chosen? | Written by the work itself. Edit it when a page's strategy changes. |
| `.impeccable/design.json` | What structured design data should automation use? | Do not edit it directly. Refresh it by running `/impeccable document`. |

The markdown files are the files you own. The generated JSON helps the detector, hooks, and Live Mode read the design system precisely.

## Scope your request to one surface

The judgment that changes Impeccable's output most is what the visitor came to the page to **do**. It reads that from the surface you named, so the useful habit is naming one:

```text
/impeccable polish the marketing homepage
/impeccable audit the billing settings
```

Those get different treatment because they are different jobs, not because you configured anything. A marketing page has to earn attention; a settings screen has to disappear. One project usually holds several kinds, which is why this is decided per surface rather than set once for the whole repo.

<details class="docs-context-details">
  <summary>The four modes, and what each one changes</summary>
  <div>
    <p>Impeccable names four, and picks from the surface in front of it:</p>
    <ul>
      <li><strong>Persuade.</strong> The visitor decides and acts: landing pages, marketing, campaigns, pricing. Design is the product, so it has to earn attention. Distinctive type, committed palette, image-led openings.</li>
      <li><strong>Operate.</strong> The visitor completes a task: app UI, dashboards, editors, admin, tools. Density, predictable controls, readable states, stable navigation, quieter motion. Brand lives in precise details.</li>
      <li><strong>Read.</strong> The visitor understands something: docs, guides, help, changelogs. Comprehension first, then a reading experience worth staying in.</li>
      <li><strong>Experience.</strong> The visitor is inside the work: portfolios, galleries, showcases. The artifact leads and the interface recedes.</li>
    </ul>
    <p>The mode comes from the surface, <strong>not from what the company sells</strong>. A developer tool's landing page is still Persuade. A fashion house's documentation is still Read. A docs index is Read, not Persuade.</p>
    <p>Name it explicitly only when a page is genuinely ambiguous. Once resolved, it is recorded in that surface's brief under <code>.impeccable/surfaces/</code>.</p>
    <p><strong>Upgrading from v3?</strong> Modes replace the old brand/product <strong>register</strong>. Brand maps to Persuade, product maps to Operate, and Read and Experience are the two cases the old split had nowhere to put.</p>
    <p>A leftover <code>## Register</code> heading in <code>PRODUCT.md</code> is no longer read, and <a href="/docs/doctor">doctor</a> will find it and offer to delete it. Worth accepting: a retired axis left in the file is the kind of thing that reads as still meaningful to the next person.</p>
  </div>
</details>

<details class="docs-context-details">
  <summary>Native apps: iOS, Android, and adaptive (alpha)</summary>
  <div>
    <p>If you build for the web, skip this. `PRODUCT.md` carries a <code>## Platform</code> line, and <code>/impeccable init</code> works the value out while it scans your project, asking only when the evidence is ambiguous. A missing field means <code>web</code>.</p>
    <table>
      <thead><tr><th>Value</th><th>Means</th></tr></thead>
      <tbody>
        <tr><td><code>web</code></td><td>A website or web app, including responsive mobile web. The default.</td></tr>
        <tr><td><code>ios</code></td><td>A native iOS or iPadOS app. Loads the Apple HIG guidance.</td></tr>
        <tr><td><code>android</code></td><td>A native Android app. Loads Material Design 3 guidance.</td></tr>
        <tr><td><code>adaptive</code></td><td>One Flutter, React Native, or KMP codebase that genuinely adapts per OS. Loads both.</td></tr>
      </tbody>
    </table>
    <p>On a native platform, <code>audit</code> and <code>adapt</code> run native passes covering VoiceOver, TalkBack, touch targets, and platform conformance instead of CSS.</p>
    <p><strong>Native support is alpha.</strong> Live Mode, the detector, and the design hook all read a browser or parse HTML, so they sit out on a native project. Mobile web stays <code>web</code>, and a native wrapper around a website does not make its design language native.</p>
  </div>
</details>

## How context changes the output

With context loaded, Impeccable can:

- preserve the right identity instead of "improving" it into something generic;
- pick the right standard for the surface, whether that is a Persuade page that has to land or an Operate screen that has to disappear;
- replace hardcoded visual choices with documented tokens and components;
- flag drift, such as fonts, colors, or border radii outside `DESIGN.md`;
- keep Live Mode variants aligned with the system instead of inventing new palettes.

The context does not replace judgment. Existing code still matters, and an intentional exception can be documented with a detector ignore. See [Config and ignores](/docs/config).

## Keeping context fresh

Use this rule:

| Change in the project | Run |
|---|---|
| New audience, positioning, product purpose, platform, evidence, or brand commitments | `/impeccable init` |
| New palette, type stack, component primitives, radius scale, or design rules | `/impeccable document` |
| A hook says `DESIGN.md` is newer than `.impeccable/design.json` | `/impeccable document` |
| One-off intentional detector finding | Add a narrow ignore with `/impeccable hooks ignore-value` or `npx impeccable ignores`. |
| You are not sure what has fallen behind | `/impeccable doctor` ([Doctor](/docs/doctor)) |

Impeccable also checks these files at the start of a session and mentions what looks stale, at most once a week per project. [Doctor](/docs/doctor) is the same report on demand, with the expensive checks added.

Treat context files like any other design artifact: review them in code review when they change, and update them when the product changes.

## Details when the default path is not enough

<details class="docs-context-details">
  <summary>Where Impeccable looks for context files</summary>
  <div>
    <p>For normal projects, put <code>PRODUCT.md</code> and <code>DESIGN.md</code> in the project root.</p>
    <p>Skill commands look in the root first. If root context is missing, they also check <code>.agents/context/</code> and <code>docs/</code>.</p>
    <p>In a monorepo, each workspace child resolves its own <code>PRODUCT.md</code> and <code>DESIGN.md</code> first, then falls back to the repo root per file. Project boundaries come from package-manager workspace declarations, or from <code>projectRoots</code> globs in <code>.impeccable/config.json</code> when no package manager declares them. See <a href="/docs/config">Config and ignores</a>.</p>
    <p>The detector's design-system rules use the same root-first behavior for <code>DESIGN.md</code>. For generated design metadata, the primary path is <code>.impeccable/design.json</code>. Legacy <code>DESIGN.json</code> files are still accepted as fallbacks, but new projects should use <code>.impeccable/design.json</code>.</p>
  </div>
</details>

<details class="docs-context-details">
  <summary>What happens when docs and code disagree</summary>
  <div>
    <p><code>PRODUCT.md</code> wins on durable product and voice decisions: platform, audience, positioning, constraints, evidence, and brand commitments.</p>
    <p><code>DESIGN.md</code> wins on visual decisions: color, typography, radius, elevation, component behavior, and system-specific do/don't rules.</p>
    <p>A surface brief in <code>.impeccable/surfaces/</code> wins on that one page's strategy: its mode, its job, the proof sequence, and the direction that was chosen for it.</p>
    <p>Existing code still matters. Commands read project files before editing and preserve real conventions when they are stronger or newer than the docs. A stale <code>DESIGN.md</code> is a signal to refresh the docs, not permission to ignore the implementation.</p>
  </div>
</details>

<details class="docs-context-details">
  <summary>Which detector rules unlock when DESIGN.md exists</summary>
  <div>
    <p>When <code>DESIGN.md</code> exists, <code>npx impeccable detect</code> and the design hook unlock design-system checks:</p>
    <ul>
      <li><code>design-system-font</code> flags primary fonts not declared in <code>DESIGN.md</code> typography.</li>
      <li><code>design-system-color</code> flags literal colors outside the documented palette or sidecar ramps.</li>
      <li><code>design-system-radius</code> flags border-radius values outside the documented rounded scale.</li>
    </ul>
    <p>These rules do not run when <code>DESIGN.md</code> is absent, when config disables design-system checks, or when you pass <code>--no-design-system</code> to the detector. See <a href="/docs/detector">Detector CLI</a>.</p>
  </div>
</details>

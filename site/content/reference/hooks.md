---
title: Design hooks
tagline: "Automatic detector feedback inside Claude Code, GitHub Copilot, Codex, and Cursor."
description: "Install, enable, disable, debug, and tune Impeccable's provider-native design hook for automatic detector feedback on UI file edits."
section: automation
order: 2
---

The design hook runs Impeccable's detector automatically when an AI coding tool edits UI files. It catches regressions while the agent still has the edit in context.

## Fast path

Check hook state inside your AI tool:

```text
/impeccable hooks status
```

Turn the hook on or off for this project:

```text
/impeccable hooks on
/impeccable hooks off
```

Installer and updater commands can skip hook setup for one run:

```bash
npx impeccable install --no-hooks
npx impeccable update --no-hooks
```

## What it does

The hook scans direct edits to UI code and styles. When it finds a new issue, it sends the agent a short reminder with the finding and a fix direction.

Claude Code, GitHub Copilot, and Codex run after the edit. Cursor checks proposed writes before they land and blocks only when the detector finds an issue in the proposed UI code.

Plain `.ts` and `.js` files are scanned, but the hook stays quiet unless it finds something design-relevant.

### Two speeds

The hook does not report everything on every edit. You get two passes instead:

- **Per edit:** only what is objectively broken or compounds if ignored. Broken images, overflowing and clipped text, contrast failures, tiny text, gradient text, glow, and drift from your own `DESIGN.md`.
- **At the end of the session:** the full rule set across every UI file you touched, minus anything already reported.

<details class="docs-prose-details">
  <summary>Why it is split, and how to turn the split off</summary>
  <div>
    <p>Reporting every rule on every edit made models measurably more conservative rather than more careful. One copy-level rule alone fired about ninety-seven times in a single session, and the findings that get fixed well (contrast, padding, glow) are the ones judged against a finished page, not a half-written one.</p>
    <p>The deep pass fires once per session; a second stop is silent, because its findings are remembered.</p>
    <p>Set <code>hook: { "perEditRules": "all" }</code> in <code>.impeccable/config.json</code> to get every rule on every edit again. Cursor and GitHub Copilot are exempt from the split, since they have no end-of-session pass wired and nothing should be deferred into a pass that never runs.</p>
  </div>
</details>

<p class="docs-context-note"><strong>Web only.</strong> The hook parses HTML and CSS, so it does not run on a project whose <code>PRODUCT.md</code> declares <code>ios</code>, <code>android</code>, or <code>adaptive</code>. See <a href="/docs/context">Design Context</a>.</p>

### Checking it is really running

A hook can look installed and scan nothing: if its script path stops resolving, after a move or a reinstall, the manifest still registers and no findings ever arrive. Silence reads as a clean codebase.

[`/impeccable doctor`](/docs/doctor) checks for exactly that, along with a manifest that says enabled while config says otherwise. Worth running once after you move a project.

## Handling intentional findings

Persist an exception only after you confirm the finding is intentional. Prefer the narrowest exception:

```text
/impeccable hooks ignore-value overused-font Inter --shared --reason "Brand font"
/impeccable hooks ignore-file "src/legacy/Card.tsx"
/impeccable hooks ignore-rule side-tab
```

For value-specific rules such as `overused-font`, use `ignore-value` for a specific font. Use `ignore-rule overused-font --all-values` only when you want to suppress the entire rule.

The terminal equivalent is `npx impeccable ignores ...`, which writes the same detector config. See [Config and ignores](/docs/config).

## Details when the default path is not enough

<details class="docs-prose-details">
  <summary>Supported harnesses and approval steps</summary>
  <div>
    <p><code>npx impeccable install</code> and <code>npx impeccable update</code> install provider-native hook manifests for Claude Code, GitHub Copilot, Codex, and Cursor.</p>
    <ul>
      <li>Claude Code: <code>.claude/settings.local.json</code> by default.</li>
      <li>GitHub Copilot: <code>.github/hooks/impeccable.json</code>, a committed file shared by the Copilot CLI and the cloud agent.</li>
      <li>Codex: <code>.codex/hooks.json</code>.</li>
      <li>Cursor: <code>.cursor/hooks.json</code>.</li>
    </ul>
    <p>GitHub Copilot reads the committed <code>.github/hooks/impeccable.json</code>. In the Copilot CLI the hook activates once that file is on the repository's default branch and you trust the folder; the cloud agent reads it straight from the repo.</p>
    <p>Codex requires one extra approval step. After install or update, open <code>/hooks</code> in Codex and approve the project hook. Codex tracks trust by hook definition, so updates can require approval again.</p>
    <p>Cursor users should also confirm hooks are enabled in Cursor Settings -> Hooks.</p>
  </div>
</details>

<details class="docs-prose-details">
  <summary>Scanned file types</summary>
  <div>
    <p>The hook scans common UI and style files:</p>
    <p><code>.tsx</code>, <code>.jsx</code>, <code>.html</code>, <code>.vue</code>, <code>.svelte</code>, <code>.astro</code>, <code>.css</code>, <code>.scss</code>, <code>.sass</code>, <code>.less</code>, <code>.ts</code>, and <code>.js</code>.</p>
  </div>
</details>

<details class="docs-prose-details">
  <summary>Config and environment overrides</summary>
  <div>
    <p>Hook lifecycle settings live under <code>hook</code> in <code>.impeccable/config.json</code>:</p>
    <pre><code>{
  "hook": {
    "enabled": true,
    "quiet": false,
    "auditLog": ".impeccable/hook.ndjson"
  }
}</code></pre>
    <p>Per-developer choices, including install consent, live in <code>.impeccable/config.local.json</code>.</p>
    <p>Detector filters live under <code>detector</code>, not <code>hook</code>, because they are shared by the hook and the CLI detector.</p>
    <p>Environment variables still override config for one shell: <code>IMPECCABLE_HOOK_DISABLED</code>, <code>IMPECCABLE_HOOK_QUIET</code>, and <code>IMPECCABLE_HOOK_LOG</code>.</p>
  </div>
</details>

<details class="docs-prose-details">
  <summary>Debugging hook behavior</summary>
  <div>
    <p>Start with status:</p>
    <pre><code>/impeccable hooks status</code></pre>
    <p>It shows the shared and local config paths, current ignores, hook state, and relevant environment overrides.</p>
    <p>For invocation logs, set <code>hook.auditLog</code> or use <code>IMPECCABLE_HOOK_LOG</code>. The hook writes one NDJSON line per invocation. Leave audit logging off for normal work.</p>
    <p>If a manifest is malformed, install/update aborts by default. Re-run with <code>--force</code> only when you want Impeccable to back up the malformed file as <code>.bak</code> and replace it.</p>
  </div>
</details>

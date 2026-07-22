---
title: Doctor
tagline: "Find and repair drift between your project's Impeccable files and the version you have installed."
description: "How /impeccable doctor reports schema drift in PRODUCT.md, DESIGN.md, config, surface briefs, and the design hook, and what it repairs on its own."
section: automation
order: 3
---

v4 changed what `PRODUCT.md` holds and retired the brand-or-product register field, so a project set up under v3 can be carrying answers the current version no longer reads. Nothing used to measure that. Now two things do.

## You get told at the start of a session

Impeccable checks its own files when a session begins and mentions what it finds, once:

- a product record written before v4,
- a design sidecar older than the `DESIGN.md` it extends,
- a config key that is a near-miss of a real one and has therefore never applied to anything,
- an app that ships to iOS or Android while inheriting a record that says web.

That last one is the most valuable catch, because it costs you quality quietly rather than failing loudly.

None of it blocks the work you asked for. A given finding is raised **at most once a week per project**, so something you decided to live with does not come back tomorrow.

## Ask for the full picture

```text
/impeccable doctor
```

The boot check is deliberately cheap: it looks only at files a session already reads. `doctor` runs the deep pass and adds the checks that cost real work, like how much interface code has shipped since `DESIGN.md` was last touched, whether the detector rules you ignored still exist, and whether your design hook's script path still resolves.

Ask it in plain language too. "What's out of date here?" gets you the same report.

### It fixes what it can and hands over the rest

Findings come in three kinds, and the kind tells you what happens rather than how bad it is:

| Kind | What Impeccable does |
|---|---|
| Mechanical | Repairs it, then tells you in one line. No decision to make. |
| Worth knowing | States it once, with the fix on offer. |
| Needs a command | Names `init` or `document` and the specific gap it would close. |

That last split is the point. A file whose *schema* is old is a migration. A file that no longer *describes your code* is a conversation, so doctor hands it to the command that owns it with the gap named, instead of quietly rewriting your product record.

An empty report is the good outcome, and it says so in one line.

## Deeper

<details class="docs-prose-details">
  <summary>Three kinds of "out of date", and which one this owns</summary>
  <div>
    <p>They get conflated constantly, and only one of them is this command's job:</p>
    <ul>
      <li><strong>Tool version.</strong> Your installed skill is older than the published one. Reported separately at boot; <code>npx impeccable update</code> fixes it.</li>
      <li><strong>Schema drift.</strong> An artifact was written by an older Impeccable: fields nothing reads, fields now expected, files in retired locations. Mechanical, and doctor repairs most of it. <strong>This is what doctor owns.</strong></li>
      <li><strong>Truth drift.</strong> Your code moved on and the document no longer describes it. No file comparison settles this, which is why it gets routed to <a href="/docs/init">init</a> or <a href="/docs/document">document</a> rather than repaired.</li>
    </ul>
  </div>
</details>

<details class="docs-prose-details">
  <summary>What it actually checks</summary>
  <div>
    <p><strong>PRODUCT.md</strong> carries a schema stamp, so the checks read a file's vintage rather than guessing it from which sections it happens to have. It is a schema version, not a release version: a record written by 4.0.0 is not stale under 4.0.1. <code>DESIGN.md</code> gets no stamp, because it follows the external design.md spec rather than Impeccable's own.</p>
    <p><strong>The design sidecar</strong> (<code>.impeccable/design.json</code>) is checked for being older than the <code>DESIGN.md</code> it extends, for an outdated schema, and for sitting at a legacy path.</p>
    <p><strong>Config</strong> is checked for unknown keys, unknown detector keys, ignored rule ids that no longer exist in the rule registry, ignored file paths that are gone, and <code>projectRoots</code> globs that match no directory.</p>
    <p><strong>The design hook</strong> is checked for a script path that stopped resolving and for an enabled/disabled conflict. A hook whose path broke looks installed while scanning nothing, which is exactly the failure you would never notice.</p>
    <p><strong>Surface briefs</strong> are checked for records orphaned from the file or route they describe.</p>
    <p>If the rule registry cannot be reached, doctor says the ignored-rule list could not be validated rather than implying it is clean.</p>
  </div>
</details>

<details class="docs-prose-details">
  <summary>Why a big number is not a verdict</summary>
  <div>
    <p>One check counts commits to your visual source directories since <code>DESIGN.md</code> was last edited. A commit count is not a contradiction, and doctor will not tell you your design system is stale because the number looks large. It reports the number and says what it measures. If you want to know whether the document is actually wrong, ask, and it reads <code>DESIGN.md</code> against your current tokens and components.</p>
    <p>The same restraint applies to a workspace inheriting the root's context. Inheritance is designed behavior, not a defect. Whether one product record truthfully describes several apps is your call.</p>
  </div>
</details>

<details class="docs-prose-details">
  <summary>Monorepos</summary>
  <div>
    <p>Pass the app you mean. Without it the report describes the repo root, which in a monorepo is usually the wrong project.</p>
    <p>You also get a table of which apps carry their own <code>PRODUCT.md</code> and <code>DESIGN.md</code> and which inherit the root's, before anything is proposed.</p>
    <p>The finding that matters most here is a workspace carrying native build files while inheriting a root record that resolves to web: that app gets web guidance for its entire life and never loads the iOS or Android rulebook. The repair is a child <code>PRODUCT.md</code> in that workspace, because one inherited record cannot hold two platforms.</p>
  </div>
</details>

<details class="docs-prose-details">
  <summary>Turning the boot check off</summary>
  <div>
    <p>Set <code>"stalenessCheck": false</code> in <code>.impeccable/config.json</code> to silence the session-start notice for the project, or <code>IMPECCABLE_NO_STALENESS_CHECK=1</code> for a single session.</p>
    <p><code>/impeccable doctor</code> still works with the check disabled. That combination is the one to use if you want the report only when you ask for it.</p>
  </div>
</details>

## Related

- [Design Context](/docs/context) for what belongs in each file doctor checks.
- [Config and ignores](/docs/config) for the keys and ignore lists it validates.
- [Design hooks](/docs/hooks) for the hook it verifies is really running.

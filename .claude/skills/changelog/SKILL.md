---
name: changelog
description: Use when writing or editing an entry in site/pages/changelog.astro, or when cutting a release for the skill, CLI, or extension. Covers what an entry has to say to be worth reading, and the markup the release script parses.
user-invocable: true
argument-hint: "[skill|cli|extension] [version]"
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

# Changelog entries

The page is `site/pages/changelog.astro`. Entries are hand-written HTML, newest first within each component.

Two things go wrong here, and only one of them is about length.

## 1. Say what it means, not what changed

A changelog written from commits lists mechanisms. A reader cannot tell from a mechanism whether their week got better.

> **The hand shows its judgment.** Challengers carry a verdict: the ones that win keep full cards, and the ones that lose demote to a quiet row naming what the built direction took from them.

Every word is true and the reader still has to do the work. What actually happened in that release is that **choosing a direction stopped being a menu and became a design review**: the roll argues with itself, and the direction you are handed has already absorbed what the losing worlds did better. That is the sentence a user cares about, and it was nowhere on the page.

So, for each item:

- **Lead with the change in the reader's experience.** The mechanism earns its place by explaining the claim, not by being the claim.
- **Cover the second half of the item and read only the bold claim.** If it says what is different for the reader, it works. If it names a component, a field, or a file and stops, rewrite it.
- **When three items are three parts of one improvement, they are one item.** Name the improvement; let the parts be its supporting clause. A release where five bullets each describe one gear of the same machine will read as five small things instead of one big one.
- **A fix is also an experience.** Not "authorize CORS by session token", but "live mode reaches the dev hosts it used to refuse", with the mechanism after.

The lead paragraph carries the release's through-line: the one sentence you would say out loud if someone asked what this release is. Write it after the items, once you can see what they add up to.

## 2. Keep it skimmable

An entry drifts one bullet at a time: a claim earns a second sentence, then a third. The v4.0.x entries reached 76 words per item, and nobody could skim a release.

- One item is a **bold claim that stands alone plus at most one sentence**. Target 35 words, hard stop around 45.
- Split run-ons. A bullet joining several changes with semicolons is several bullets, or one bullet naming what they add up to.
- Over about **eight items, group them** into three to five themes with `<p class="cf-group">Label</p>` before each `<ul>`. Themes are the reader's map.
- **User-facing only.** No refactors, dependency bumps, internal tooling, or generated-output syncs.
- `docs/STYLE.md` applies: no em dashes, no banned words, no AI cadence.

Check yourself:

```bash
node scripts/changelog-stats.mjs           # words per item for every entry
node scripts/changelog-stats.mjs --check   # structural breaks only, use in CI
node scripts/changelog-stats.mjs --strict  # also fails on verbosity
```

A new entry should pass `--strict`. Historical entries do not, which is why `--check` is the gate.

## 3. The markup the release script parses

`scripts/release.mjs` in the `impeccable` repo reads this file to build GitHub release notes. Three rules are not stylistic:

- **Bullets live in `<ul class="cf-items">`.** Nothing else. `cf-entry-list` has no CSS anywhere in this repo, so those entries rendered unstyled for four releases, and the extractor skipped past them and published the *following* entry's notes. Four GitHub releases shipped v4.0.0's text before anyone noticed.
- **The version label is matched literally.** Skill entries read `v4.1.0`, CLI entries `CLI v3.6.0`, extension entries `Extension v1.3.2`. The component is derived from the `id` prefix: `cli-*`, `ext-*`, otherwise skill.
- **`cf-entry--current` and the Current badge move** onto the new newest skill entry, and off the previous one. Exactly one entry carries it.

Entry skeleton:

```html
<article id="v4.2.0" class="cf-entry cf-entry--current">
  <header class="cf-entry-head"><span class="cf-version">v4.2.0</span><span class="cf-date">September 2, 2026</span><span class="cf-current-badge">Current</span></header>
  <p class="cf-entry-lead">The one sentence you would say out loud about this release.</p>
  <p class="cf-group">A theme</p>
  <ul class="cf-items">
    <li><strong>What is different for you.</strong> The mechanism, in one sentence, because it explains the claim.</li>
  </ul>
</article>
```

## Working order

1. **Collect the PRs, not the merges.** Most land squashed, so `git log --merges` undercounts badly: v4.1.0 was first written from 24 merges when 43 PRs had shipped, and whole themes were missing from the page. Pull the numbers out of the subjects and read their titles:

   ```bash
   git log --format=%s --no-merges <tag>..HEAD | grep -oE '#[0-9]+' | sort -u
   gh pr view <n> --json title --jq .title
   ```

   Then sanity-check against the biggest diffs, `git diff --stat <tag>..HEAD -- skill/ | sort -t'|' -k2 -rn | head`, because a large change with a dull commit subject is exactly the one that goes unwritten.
2. Sort them into themes. Ask what each theme changes for a user, and write that sentence first.
3. Draft items under the themes, then write the lead from what they add up to.
4. Run `node scripts/changelog-stats.mjs --strict` and `bun run build:site`.
5. Move the Current badge.

If a release genuinely has one story, one theme and four items beats four themes and twelve.

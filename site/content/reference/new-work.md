---
title: New work
tagline: "Ask for a new page, a redesign, or an addition. Here is what happens and how you steer it."
description: "How to get a new surface built with Impeccable: describe it, pick a direction, and let it render the result before it writes code."
section: concepts
order: 3
---

There is no command for building something new. Describe it and Impeccable takes it from there:

```text
/impeccable a pricing page for enterprise customers
/impeccable redesign the marketing site
/impeccable add a comparison table to the pricing page
```

It works out which of those you meant, and how much is allowed to change. A redesign replaces the look. An addition inherits the page it joins. You do not have to say which.

<p class="docs-context-note">Coming from v3? This is what <code>/impeccable craft</code> used to be. The alias still works and adds nothing.</p>

## The one decision that is yours

Partway in, Impeccable stops and asks you to pick a **direction**: a visual world plus a concrete plan for the first screen. In an attended session it opens a page in your browser with the direction it landed on, alternates beside it, and two controls.

- **Deal again.** Not right? Re-roll, as often as you like. Every direction already shown is off the table, so nothing comes back reworded.
- **Steer.** One line about what is missing ("too corporate", "needs to feel like print") and the next round honors it.

Rejecting everything is a valid answer. Nothing gets built until you pick.

If your harness cannot open a browser, the same choice arrives as a normal question prompt.

### Your brief always wins

If you name an era, a material, a typeface, or a palette, that beats whatever Impeccable would have chosen:

```text
/impeccable a landing page for our vinyl shop, 1970s hi-fi catalog look, Futura
```

It will not talk you out of that. The direction machinery exists for when you have not said, not to override you when you have.

## It shows you the design before it builds it

Once you pick, Impeccable renders the direction as a system board (palette, type, components) and a mock of the first screen, then builds toward that image instead of a paragraph of adjectives. Seeing it first measurably improves the result.

This works out of the box on harnesses with a built-in image tool, like Codex or Gemini CLI. Without one, set an OpenAI key and you get the same thing:

```bash
export OPENAI_API_KEY=sk-...
```

It renders through gpt-image-2 and tells you it is spending your credit before the first image, roughly 5 to 25 cents each. The mock is a reference, not a spec: real copy, responsiveness, and accessibility stay implementation decisions, and no image is left behind in your repo.

## What it writes down

- **`DESIGN.md`** gets the visual system when the work established a new one, refreshed after the build so it holds the values the code actually uses.
- **`.impeccable/surfaces/<page>.md`** gets that page's strategy: who it is for, what it must prove, and the direction that won. A later session picks up the argument instead of inventing a new one.

An addition to an existing page changes neither without asking.

## Why any of this exists

Ask a coding model for something creative and it builds its favorite idea, every run. Sixteen different "be creative" framings returned the identical concept in thirty of thirty-five runs. It is not a shortage of creativity, it is a shortage of variance: one model has one taste function, so its top-ranked idea always wins.

So the ranking gets broken from outside. A roll decides which of the model's own ideas has to be taken seriously, and deals challengers from a reviewed catalog of 188 visual worlds to compete against them. [The research](/research) has the full account.

Challengers are not templates and never get applied as one. Each has to survive translation into your product first, and most lose to a strong idea derived from the product itself. That is the intended outcome.

## Deeper

<details class="docs-context-details">
  <summary>How it decides what kind of job this is</summary>
  <div>
    <p>The classification comes first, because it sets how much freedom the work has:</p>
    <ul>
      <li><strong>Greenfield.</strong> No coherent visual implementation exists. A world gets established.</li>
      <li><strong>Local extension.</strong> A section or component inside a page that already works. Only the new part gets decided; the page's world is inherited.</li>
      <li><strong>New surface.</strong> A whole page or flow inside an established world. Composition is open, the world is not.</li>
      <li><strong>Expression expansion.</strong> An established brand entering a surface family it never resolved. You approve a range, which is merged into <code>DESIGN.md</code>.</li>
      <li><strong>Redesign or rebrand.</strong> The look is replaced. Product facts, content, function, and constraints are not.</li>
      <li><strong>Refinement.</strong> Better, not different. Leaves this flow for a scoped command like <a href="/docs/polish">polish</a>.</li>
    </ul>
    <p>Two of these get confused constantly. "Redesign this page" authorizes replacement: the old look becomes evidence and anti-reference. "Redesign this within our current system" is an extension. Impeccable asks once when the wording is genuinely ambiguous, and never splits the difference into polishing a look you asked to be rid of.</p>
  </div>
</details>

<details class="docs-context-details">
  <summary>What counts as your existing design system</summary>
  <div>
    <p>Before proposing anything, Impeccable reads <code>DESIGN.md</code>, your tokens, your components, and real assets.</p>
    <p><strong>A missing <code>DESIGN.md</code> does not make a project greenfield.</strong> Coherent code, type choices, and component behavior are authority whether or not anyone wrote them down. Scaffolds, framework defaults, and stray utility classes are not.</p>
    <p>If your implementation is coherent but undocumented, Impeccable extracts the invariants, confirms them with you, and writes <code>DESIGN.md</code> before going further. It will not offer you replacement worlds unless you asked for a redesign.</p>
  </div>
</details>

<details class="docs-context-details">
  <summary>How a direction has to earn its place</summary>
  <div>
    <p>Every candidate, whether the model derived it or the roll dealt it, faces five tests. Failing one is fatal no matter how well it does on the others.</p>
    <ul>
      <li><strong>Truth.</strong> Every relationship it visualizes exists in your product. Resemblance is not evidence.</li>
      <li><strong>Translation.</strong> Strip the source's names and materials and a product-native relationship remains. Otherwise it is a costume.</li>
      <li><strong>Consequence.</strong> Removing its best move materially weakens the page. Otherwise it is ordinary craft with a story attached.</li>
      <li><strong>Survival.</strong> The signature still works on the primary device, within a real asset and time budget.</li>
      <li><strong>Fit.</strong> Its risk is an honest tradeoff, not a probable violation of your brief.</li>
    </ul>
    <p>A candidate still explained by its source object has not been translated, and it loses.</p>
  </div>
</details>

<details class="docs-context-details">
  <summary>The direction contract, and reproducing a roll</summary>
  <div>
    <p>Before writing code, the agent states the direction as a comment at the top of the artifact: at most 150 words across five blocks.</p>
    <ul>
      <li><code>THESIS</code>: the one idea this page owns, and the category default it refuses.</li>
      <li><code>OWN-WORLD</code>: the palette and component language, specific enough to recognize with all content removed.</li>
      <li><code>STORY</code>: what the visitor understands, believes, and does.</li>
      <li><code>FIRST VIEWPORT</code>: the exact composition and where the primary action sits.</li>
      <li><code>FORM</code>: the chosen form and the seed key.</li>
    </ul>
    <p>It is there so intent is inspectable and so the finishing review can audit the built page against it promise by promise, in a separate agent where your harness allows one. A page that promised a radical composition and shipped the usual template does not pass quietly.</p>
    <p>Keep the seed key if you want to reproduce a roll later. It replays the whole thing, including every re-roll round.</p>
  </div>
</details>

<details class="docs-context-details">
  <summary>Who may re-roll, and on what grounds</summary>
  <div>
    <p>You re-roll freely and for any reason, including taste. After two in a row, Impeccable asks what quality is missing rather than guessing at a third.</p>
    <p>The agent may only re-roll on named factual grounds: the assigned direction cannot carry the product's truth or the task. Its own taste is never grounds, which is the whole point of rolling from outside its ranking.</p>
    <p>In an unattended run there is nobody to ask, so the assigned direction proceeds and the assumptions get stated explicitly.</p>
  </div>
</details>

## Related

- [Design Context](/docs/context) for the files this reads and writes.
- [`/impeccable shape`](/docs/shape) to stop at the brief, with no code.
- [The research](/research) for the measurements behind the roll.

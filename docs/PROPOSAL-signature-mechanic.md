# Proposal: give every world one named mechanic, and make it falsifiable

Status: proposal, nothing implemented.

## The problem it solves

Four worlds were rejected this week with one reason: they worked and they were
boring. The wave that produced them cleared every gate we have. The transfer
contract stopped them being page designs, the body-face rule kept them readable,
dedup found nothing near them, and they still had nothing anyone wanted.

Zero flagships in that round, the first time other than the failed familiarity
round. So the gates are catching the wrong thing: everything we check is a
prohibition, and prohibitions produce competence. Nothing in the system asks a
world to own anything.

## What a comparable catalog does

An external catalog of 248 design languages was inventoried for territory we
lack. The territory was the smaller finding. The larger one:

- **228 of 248 name exactly one load-bearing device** and require it to be
  visible across three fixed embodiments, a landing page, a dashboard, and a
  component sheet. The device is the entry's identity, and whether it showed up
  is a question with an answer.
- **220 of 248 carry per-entry anti-patterns**, the specific slop that language
  is at risk of, sitting beside its rules rather than in a global detector.

Our `system` array describes a world across five dimensions and never singles
out a signature or asks it to recur. A world can satisfy all five rules and
still be nothing in particular, which is exactly what happened.

## The change

**One new field, `mechanic`.** A single sentence naming the one device this
world owns, stated so a reader can check whether it appeared. Not a mood, not a
palette, not a list. The result-code gutter read down one column. The revision
bleed on rows that changed. Untethered means unavailable. The cavity dug into
the field, held open while in use, closed by the material falling back in.

**One requirement in every mode bar.** The mechanic must be visible on all three
rendered surfaces, and it must survive the world's own prohibitions in every
material the palette rule allows. One world in a judged transfer made rank the
size of a cleared cavity, and the cavity was invisible in two of its three
materials. That world became a page design, and a stated mechanic plus this
check would have caught it at authoring time rather than after a render.

**One new field, `avoid`.** Two or three negations specific to this world: the
slop it is personally at risk of. A world built from posters is at risk of
shouting; a world built from instruments is at risk of dead greys. The global
detector cannot know which, and the author does.

## What it costs

- A schema addition in `concept-catalog.mjs`, and therefore a validator change
  in the public repo.
- A line in each of the four mode bars.
- Backfill for 541 existing entries, which is the real cost. Most of them
  arguably have a mechanic already, unstated, recoverable from `form` plus
  `system[3]`. That is a batch job, not hand work, but it is not free and it
  should be checked rather than trusted.

## Why it is worth it

It is the first gate that would target distinction rather than competence, and
it is checkable in a render, which is the only gate that has proved reliable
today. Every other check we added this week is a prohibition; this is the first
positive requirement since the generativity bar, and the generativity bar is the
one that has held up best.

## What to be careful about

The same catalog shows the cost of the idea it does best. Their lineage is a
typed graph with parent pointers, which lets a world be revised in place rather
than only added to, and it has produced **22 unresolved name collisions**,
including one name used four times. If we take the mechanic idea we should not
also take typed descent without deciding how identity is kept unique.

And a mechanic must not become a fifth prohibition wearing a positive name. The
test is whether a reviewer can look at a render and say yes or no. If the answer
needs an argument, it is not a mechanic.

## Open question for the reviewer

Does a mechanic belong to the world, or to the world plus the mode? A revision
bleed is a mechanic for operate and probably meaningless on a landing page. If
mechanics turn out to be mode-specific, the field wants to be a small map rather
than a sentence, and that is a bigger change than this proposal describes.

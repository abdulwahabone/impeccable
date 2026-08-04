# Proposal: make a world's device findable in its render, and let it say what it risks

Status: proposal, nothing implemented. Revised 2026-08-04 after a reviewer
challenge dropped the field this document originally proposed; the section
below keeps the challenge and what survived it, because the reasoning is the
useful part.

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

**Reviewer challenge, tested 2026-08-04: how is this different from `form`?**
It largely is not, and the catalog data agrees. The validator already demands
that `form` name "a form and inherited structure after a comma", and the worlds
rejected as boring all did: waxed galleys overlapping while the reverse of the
sheet ghosts through, any line printed latent in the matte, a redrawn figure
cropped hard by the trim. Those are devices. They did not discriminate, because
the approved worlds in the same wave have them too.

So the field is dropped. Two things survive, and only one of them is new.

**Singularity is dropped too, and it was the more dangerous half.** Second
reviewer challenge, same day: asking for one device selects for the failure we
reject most often. The review record is explicit about it, on a world rejected
from an earlier wave: "almost like a feature, I would say, not a world, and it
is very gimmicky." A feature is exactly one device. The knitting world went the
same way, "too gimmicky, too extreme, I cannot imagine many sites wanting a
knitted skeuomorphic look entirely."

The comparison catalog can ask for one device because it sits on top of a full
declared token system and the device is the signature over that system. Asking
our authors for one device invites them to design the device instead of the
world, which is the gimmick failure with a rule behind it. A world is the five
rules cohering; its recognisable consequence should fall out of that, not stand
in for it.

**Falsifiability, which is the real idea and is a review check, not a schema
change.** The question is not "does this world name a device" but "can you point
at the device in this render". A sentence can promise something that never
survives to the image, and that is exactly what happened: the feelie handbook's
latent ink is a genuine mechanism on paper and invisible in a rendered docs page.
Every other gate we own reads the text. This one reads the artifact, which is
the only evidence that has been reliable.

And the question must be asked about the world rather than about a device, for
the reason above. Not "point at the one thing", which rewards a schtick, but:

  Shown this render with the label removed, could you tell which world it is?

That tests the system for recognisability without asking any single element to
carry it. It catches the anonymous end of the band, the four worlds that worked
and were boring. The gimmick end is already covered and needs nothing new:
`breadth: niche` removes a world that can only ever dress one kind of site, and
it exists precisely so a reviewer does not have to express "too narrow" as a low
rating.

**`avoid` stands, unchanged.** Two or three negations specific to this world,
the slop it is personally at risk of. A world built from posters risks shouting;
a world built from instruments risks dead greys. The global detector cannot know
which, and the author does. This one is a genuine schema addition and the
cheapest part of the proposal.

## What it costs

Much less than the first draft, now that the field is gone.

- `avoid` is a schema addition in `concept-catalog.mjs`, and therefore a
  validator change in the public repo. Optional rather than required, so no
  backfill: 541 entries without it stay valid.
- The point-at-the-device question is a line in the review UI and a line in each
  mode bar. No schema, no backfill.
- Nothing is asked of `form`. The first draft wanted one device per form line
  and the second reviewer challenge killed it.

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

And the target is a band, not a maximum. A world has to be recognisable at a
glance and still wearable on an arbitrary build. Push only on recognisability
and you get a schtick; push only on wearability and you get the four boring
worlds. Both ends already have a name in the review: anonymous is what the
recognition question catches, and `breadth: niche` is the other.

## Open question for the reviewer

Whether the point-at-the-device question is asked per mode. A revision bleed
reads on an operating surface and probably means nothing on a landing page, so a
world may own a device that is only findable in one of its three renders. If so
the question is asked against the render for the mode being judged, not against
all three, and a world that shows its device in one render out of three is
telling you which modes it belongs to.

# Proposal: rebuild the world assignment grid

Status: proposal, not implemented. Nothing here has been applied to
`catalog/aesthetic-axes.json`.

## Why

The grid exists so a wave of new worlds can be *assigned* an aesthetic
combination before anything is designed, because a generator left to choose its
own aesthetic picks the safe one every time. Its second job is to say where the
catalog is empty, so a wave has a target.

Three independent reviews, briefed separately as a brand systems designer, an
interface craft designer, and an art director, reached the same verdict without
seeing each other's work:

> not one is a rule about variance
>
> can be fully satisfied by a still image with no user present
>
> describes a single still frame's surface: 281 entries in fancy dress

Measured against the catalog, they are right. The corpus barely describes what
they say is missing:

| does a world state this? | share of 281 |
| --- | --- |
| variance, what changes between instances | 0 to 1% |
| a signature device, what carries recognition | 6% |
| density | 16% |
| a grid or placement law | 35% |

Every current axis is a property a still frame possesses. So 281 worlds can be
pairwise distinct in material and still resolve to the same page: centred hero,
three cards, generous whitespace, one static composition. The catalog challenges
the model's rendering defaults and concedes its architecture, which is the half
it was already going to get wrong.

## What the current six actually measure

| axis | places | verdict |
| --- | --- | --- |
| chroma, by counting named colours | 93% | the only one that works |
| surface material | about 70% | sound, rated strongest by all three reviews |
| ground | ambiguous | broken probe and largely redundant |
| motion law | 28% | dimension is unauthored, not mis-probed |
| depth model | about 5% after honest narrowing | derived from material |
| colour strategy | 7% | dimension is unauthored |

Two findings behind that table are worth keeping in view.

**Ground does not separate its own values.** 109 of 281 worlds match both `dark`
and `light`, because palette rules routinely name both ("black ink on cream
paper"). It is not measuring the ground, it is measuring which colours get
mentioned. A further 41 match neither.

**Ground is also predicted by material.** `printed ink` implies `light` 74% of
the time and `emissive` implies `dark` 70%. Two axes that predict each other are
one axis with extra steps, and worse, their product misreports the space: an
empty cell in a correlated pair is often empty because the combination is
incoherent, not because it is unexplored. Weighting the draw toward it sends a
wave after nonsense. **Axes must be checked for independence before their product
is treated as a space.** The current inverse weighting does not do this and
should not be trusted across correlated pairs until it does.

## Proposed grid

### Keep

**Colour, as two axes.** All three reviews wanted chroma folded into colour
strategy. They did not know that chroma places 93% of the corpus and strategy
places 7%, so folding that direction discards the only working measurement. Their
real objection was proportional, that a six-axis grid spent a third of itself on
hue, and growing the grid answers that without losing anything: two of nine is a
reasonable share. Chroma is renamed **palette breadth** and keeps counting.
Colour strategy stays, recorded going forward rather than probed.

**Surface material.** Unchanged, other than reframing noted below.

### Retire as peer axes

**Ground.** Demote to a modifier of colour. It is near-binary, unmeasurable by
its own probe, and predicted by material.

**Depth model.** Replace with **spatial metaphor**, which covers the same
intuition with far more range and connects to the `Topology/navigation` rule the
schema already has: `sheet` · `stack of cards` · `room` · `map` · `machine` ·
`infinite plane`.

### Add

Ranked by expected range.

**1. Density.** Proposed independently by all three reviews with near-identical
values. `ceremonial` (one object per screen) · `calm` · `working` (dense but
chunked) · `packed` (tabular, no idle space) · `saturated` (every pixel a datum).
Strongest single predictor of not reading as generated, and it kills the poster
reflex on contact.

**2. Prohibition.** The one genuinely new mechanism, and the reason it matters is
structural rather than aesthetic: every current axis *grants* a property, so an
agent can satisfy all of them by adding one more nice thing. A refusal cannot be
satisfied that way. Drawn as one refusal per world: `no photography` · `no more
than one type size` · `no radii or curves` · `no rules, dividers or boxes` · `no
full-width anything` · `no ink on the ground plane`. Grounded in Irma Boom's
Chanel N°5 book, printed entirely blind-embossed with no ink, and Barnbrook's
*Blackstar*, black on black.

**3. Compositional law.** `rational modular grid` · `axial symmetry` ·
`asymmetric tension` · `diagonal or rotated field` · `anti-grid collage overlap`.
`Type/composition` currently bundles placement into one prose sentence, so the
generator resolves it as centred hero every time. Enumerating it removes the
default. Müller-Brockmann against Ed Fella.

**4. Variance law.** `immutable` · `parametric` · `container` · `generative` ·
`curated chaos`. What is allowed to change between two applications of this
identity, and what drives the change. Grounded in Neue's Visit Nordkyn, whose
mark is driven by live wind and temperature, and Experimental Jetset's Whitney
responsive W, against Unimark's NYC Subway manual at the immutable end. Chosen
over input primacy and temporality because it is the only candidate every
register can answer: see the decisions section.

**5. Scale dynamic range.** `1:2` · `1:4` · `1:10` · `1:25 or more`. A number, so
it is mechanically obeyable and instantly legible, and models converge on roughly
1:3 because it is always defensible. Cheapest lever with the largest delta.

### The rule that keeps it honest

At least half the grid must not be verifiable from a screenshot alone. The
absolute form of this ("no axis may be") is too strong, since ground and material
genuinely matter and are screenshot-verifiable.

## Where enumeration fails, stated plainly

Two dimensions came up that should **not** become axes, because forcing them into
values produces the worst possible artifact, a system with a whimsy setting.

**Wit does not enumerate.** What does enumerate is the *site of the anomaly*:
exactly one element disobeys the system, and it is the pagination, the error
state, a single glyph, or the scroll indicator. That is a location, not a joke.

**"What the design argues for" does not enumerate.** Every attempt collapses into
adjectives a model will nod at and ignore. Its only enforceable shadow is
Prohibition, which is why that is the axis and Thesis is not.

## Migration

Nothing here requires backfilling 281 worlds. The concept `axes` field records a
value when a wave assigns one, and occupancy already prefers a recorded value
over an inferred one, so an axis becomes exact as waves fill it rather than
needing a cleverer probe. Legacy worlds keep being inferred where a probe works
and stay unplaced where it does not, which is the truthful state.

Order of work:

1. Independence check across all proposed pairs, so the draw is not weighted
   toward incoherent cells.
2. Colour merge, ground demoted, depth replaced by spatial metaphor.
3. Density and compositional law, both inferable from existing prose well enough
   to seed.
4. Prohibition and one behavioural axis, recorded only, since neither can be
   inferred from the current corpus at all.

## Decisions taken

**Behavioural axis: variance law.** It is the only one of the three candidates
every register can answer. A landing page has no meaningful input primacy and a
docs page is always `snapshot`, so on a corpus of 281 persuade-eligible worlds
against 72 operate, most draws on those axes would come back inert. Every world
has a contract about what changes between instances. It also targets the largest
measured hole, and plausibly explains the others: nothing has motion, depth or
procedural surfaces because those are consequences of a variance law nobody
named. Input primacy and temporality are worth adding once operate and read are
thick enough to differentiate.

**Prohibition applies to every world**, not a share of them. A world with no
refusal has no edges, and since the refusal is drawn from a deck the constraint
varies even though its presence does not.

**Colour stays two axes rather than merging.** The reviews objected that a
six-axis grid spent a third of itself on hue. Growing the grid fixes that ratio
without discarding the only working measurement: two of nine is a reasonable
share. Palette breadth keeps counting, which works today, and colour strategy is
recorded going forward.

**The grid lives in the data.** `catalog/aesthetic-axes.json` is the single
source, and `docs/WORLD-CATALOG-AUTHORING.md` links to it rather than restating
it, so authoring and measurement cannot drift apart.

## Still open

- Whether the anomaly site is its own axis or a property of prohibition.
- The screenshot rule is aspirational at this size. Of the nine proposed axes
  only variance, motion and prohibition are genuinely not verifiable from a
  still, which is a third rather than half. A second behavioural axis moves it.

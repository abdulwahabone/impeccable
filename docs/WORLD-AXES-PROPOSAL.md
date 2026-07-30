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

**Colour.** Merge chroma and colour strategy into one axis, against all three
reviews, which wanted them merged the other way round. They did not know that
chroma places 93% and strategy places 7%. Merging into strategy alone discards
the only working measurement. So: one axis, strategy-shaped values, *recorded*
on new worlds via the concept `axes` field, and inferred from the colour count
for the legacy 281.

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

**4. One behavioural axis.** The interface review's case is that the catalog
structurally cannot hold a world whose identity lives in behaviour, and those are
the interfaces professionals recognise instantly. Bloomberg is not memorable
because it is amber on black. Candidates, in order of preference:

- **Input primacy**: `pointer` · `keyboard` · `command` · `direct manipulation` ·
  `conversational`. Changes which components exist, not how they are painted.
- **Temporality**: `snapshot` · `historical` · `live` · `scrubbable` ·
  `predictive`. Unlocks playhead, transport, timeline, projection, none of which
  is reachable from any current combination.
- **Variance law**: `immutable` · `parametric` · `container` · `generative` ·
  `curated chaos`. The brand review's top pick, grounded in Nordkyn's
  weather-driven mark and the Whitney's responsive W.

Adding all three at once would triple the draw space on a corpus that cannot
measure any of them yet, so pick one to start.

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

## Open questions

- Which behavioural axis first: input primacy, temporality, or variance law.
- Whether prohibition is drawn for every world or only for a share of them. Every
  world refusing something may be too uniform a constraint to stay interesting.
- Whether the anomaly site is a seventh axis or a property of prohibition.
- Whether `docs/WORLD-CATALOG-AUTHORING.md` should carry the grid, so authoring
  and measurement cannot drift apart.

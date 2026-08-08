# World catalog authoring guide

How new concept-world rounds are authored, gated, and reviewed. Distilled from the full human sweep of 2026-07-20/21 (325 entries reviewed, 169 approved, all approved entries star-rated). The machine-readable core lives in `catalog/concept-ingredients.json` under `qualityBar` (`rejectIf`, `authoringStrategy`); this guide carries the reasoning and the territory map.

## The pipeline

One command runs a whole round. Use it rather than driving the steps by hand:
the brief is where every round's findings accumulate, and a hand-written brief
starts from zero every time. That is the actual mechanism behind rounds that
lead nowhere.

```bash
bun run wave --mode read --count 10        # or persuade, operate, experience
bun run wave --mode operate --count 6 --dry     # draw and print briefs only
bun run wave --mode persuade --count 10 --no-render
```

It draws the briefs, authors against them concurrently through the API, screens
with both transfer probes, checks the batch against the catalog and against
itself, merges the survivors as pending, and renders board, hero and docs. It
approves nothing. A round ends at the review queue because the judgement is the
part a human owns.

What each step guarantees:

1. **Draw before design.** `wave-assign` fixes the company and the aesthetic, and
   the mode deck fixes the tradition, before anything is designed. A generator
   left to choose picks the safe answer every time. Both draws are deterministic
   from `--key`, so a round is reproducible and a prompt change can be measured
   against a fixed set of assignments.
2. **Merge as pending, additively.** Serialization is `JSON.stringify(catalog,
   indent 1)` plus a trailing newline, which round-trips byte-identical, so an
   authoring diff contains only the round. A concept is pending precisely when no
   review names it, so nothing is written to `concept-reviews.json`. `wave-merge`
   imports `validateConceptEntry` rather than reimplementing its bounds: a gate
   that disagrees with the validator is worse than no gate, since it fails later
   and differently.
3. **Render before review.** Specimen board first, then the hero and the docs
   page, both generated with the board attached as binding reference so all three
   read as one system. The manifest is content-hash keyed, so a bare run renders
   exactly the new or edited entries.
4. **The reviewer decides in `/labs/worlds`**: approve or reject, star ratings on
   approvals (3 exceptional, 2 solid, 1 marginal), `breadth` for niche worlds,
   allowed modes, and notes on anything instructive. Ratings feed challenger
   draws in `roll-selection.mjs`: a 3-star draws level with a 2-star, a 1-star at
   half, and a world marked niche leaves the pool entirely however good it is.
   After review, `bun run world-cards:publish` pushes approved cards to R2.

**Write rejection notes.** They are the only calibration the next round gets, and
a round without them teaches nothing. "Worked but boring" and "too gimmicky"
each changed the brief; a bare rejection would not have.

**Authoring by hand** is still supported and is the right call when you want to
supervise a single entry: `node scripts/catalog-authoring-context.mjs` emits the
shelf map plus the full `qualityBar` verbatim. Never hand-build a corpus excerpt.
The 2026-07-21 digital round proved the failure mode: a hand-built export dropped
`provenSeams` and 8 of 15 entries landed in declared-saturated seams.

## Modes, and why each has its own deck

A world is dealt to one of four modes, and the modes want measurably different
things. A mode is a file: `catalog/<mode>-territories.json` carries its own
traditions and its own bar, and `wave-brief` loads it by name. Adding a mode
means adding a file. An unknown mode refuses rather than falling back.

| mode | stocked with | the bar's hard requirement |
|---|---|---|
| read | traditions of typeset running text | must contain a body face, not only a display voice |
| persuade | beloved things with a time of day and a subculture | must be able to make one thing dominate |
| operate | instruments someone worked at under consequence | a state vocabulary that reads without colour |
| experience | sequences with a threshold and a reward | must name an order, not an atmosphere |

Every requirement is a measured failure. All six worlds in one wave could not
build emphasis, which is why persuade demands it. The read pool was built from
traditions of display, so body copy inherited poster lettering. Atmosphere
converts at 12% against interaction's 37%, which is what experience's order
requirement guards against.

**One clause applies to every mode: commit the palette.** A world whose render
could be mistaken for a default template has failed even when every rule is
sound, and the way that happens is one hue on a near-neutral ground. This is the
same finding as "low-contrast, desaturated or single-hue palettes fail at the
render gate" below, moved forward into the brief where it can prevent the spend.

**Where a wave buys the most.** Interaction converts at 37% from 43 entries,
the best rate and the smallest pool; `signals-instruments` converts at 39% from
18. Atmosphere converts at 12% from 121. Aim waves accordingly.

## The assignment grid

The axes live in [`catalog/aesthetic-axes.json`](../catalog/aesthetic-axes.json),
not here, so authoring and measurement cannot drift apart. Read them with
`node scripts/world-coverage.mjs`, or in the coverage view of the worlds lab,
where they are also editable.

Assign a combination **before** designing anything. A generator left to choose
its own aesthetic picks the safe one every time, which is the same reason the
concept seeder assigns a candidate index rather than letting the model rank its
own shortlist. Weight the draw toward values the catalog does not already
occupy: it is an exclusion map, not a template.

Three things to know before briefing a wave from it:

- **An axis marked recorded cannot be probed.** Prohibition is an absence and
  variance needs two instances to see, so neither can be read from one world's
  prose. Assign them, then record them on the concept's `axes` field, or the
  assignment is lost the moment the world lands.
- **An axis reporting UNRELIABLE is not reporting an opening.** A value nobody
  matches looks exactly like a value nobody has used. Fix the values first.
- **Correlated axes misreport the space.** An empty cell in a correlated pair is
  often empty because the combination is incoherent rather than unexplored. Check
  independence before treating a product of axes as a space to fill.

The reasoning behind the current grid, including what three independent design
reviews found missing, is in
[docs/WORLD-AXES-PROPOSAL.md](WORLD-AXES-PROPOSAL.md).

## What a world is, and how three of nine failed to be one

A world is a durable visual identity. A page design is one surface wearing a
system's clothes. The distinction sounds academic until it is measured, and it
has been: nine identities were handed to a model that built two unrelated
surfaces under each, at three viewport widths, and reported what actually broke.

The contract was written after the first three, of which two were page designs.
The six authored under it returned **one page design and five worlds**, and every
author's report names a rule the contract caught mid-draft. Small samples on both
sides, and the baseline is not perfectly matched, but the mechanism is visible in
the reports rather than inferred from the ratio.

The contract in `wave-brief.mjs` encodes what that measurement found, and every
prohibition cites the rule that earned it so a later reader can overturn one on
evidence rather than taste. Four ways a rule fails to travel, the first three
from the opening round:

- **It presumes a data model.** "The current revision is the top sheet and each
  prior revision is an offset sheet behind it" presumes revisions exist. "Layer
  0 through layer 5" presumes six layers of something.
- **It dictates the shape of the content.** "Axial symmetry absolute with tables
  mirrored" demands content arrive in matched pairs. Note that "no two entries
  share a left edge" contains no product vocabulary at all and still locks the
  identity to one content shape, which is why a keyword scan cannot be the whole
  screen.
- **It states a quantity a hosted surface cannot satisfy.** "The ground carries
  45 percent of the surface as the one committed colour" cannot hold on a page
  that is mostly photographs the identity did not choose.

A fourth prohibition came out of the second round, and it is the hardest to see
because documentation is the surface being designed for: **no rule may depend on
the reading conditions of a documentation page.** A documentation reader is
already persuaded, reads one column at one width, tolerates scrubbing, meets few
controls, and stops at a footer nobody looks at. Four transfers broke on rules
that were safe only under those conditions, most vividly a rule driving the
ground to its highest step at the end of a surface: harmless where the end is a
footer, and on a landing page it dissolved the buy button.

The positive bar is generativity. The identities that passed threw off features
nobody asked for: signup became a ledger entry, a transcript inked green as the
playhead struck it, an empty search became a bare rail with the floor showing. A
style is applied; a world generates.

**Two defects are absences, so no prohibition can catch them.** Both were
invisible until the prohibitions stopped the louder failures from happening
first, and both are now required clauses in the brief:

- **An emphasis mechanism.** All six identities in the second round failed to
  make one thing outrank its neighbours. Documentation hierarchy is sequence and
  heading; persuasion needs dominance, and the drawn prohibitions routinely
  remove the usual tools by forbidding colour-as-state, capping type sizes, or
  banning scale. This is the corpus's most systematic gap, and it matters because
  persuade is one of the four modes the catalog serves.
- **A legibility contract for body prose over the identity's own ground.**
  Measured failures: body copy at 77% ink coverage, a control label at 1.13:1
  against its own state colour, two adjacent products at 1.31:1. Persuasion is
  prose, and a drenched ground carries none of it unless a rule says how.

**Read the five rules as a set, too.** Three transfers broke on rules that
contradict each other rather than on any single rule: an emphasis remedy made
inert by a one-colour palette rule, a responsive clause promising a cure its own
crop-not-scale mandate forbids, a topology rule banning off-screen arrival while
mandating a clear margin, which leaves nowhere legal for navigation.

Where the failures cluster is itself a finding. Controls/state was named the
strongest rule in four of the nine transfers, because printed marks and
binary-state mechanisms are indifferent to content. That is the plurality and not
a law: the rest named Topology or Palette/material. What repeatedly made
Palette/material the winner is worth copying, since it was the same clause every
time, an explicit statement about media the identity did not choose. Failures
cluster in Type/composition and Topology/navigation, so those two slots deserve
the hardest version of the tests.

**One caution about the screen.** `world-transfer-check.mjs` runs two probes and
neither is sufficient. On the three judged worlds the vocabulary probe was right
once and wrong once, the structural probe caught exactly the case the vocabulary
probe missed, and only running both would have flagged both failures. A clean
screen is a reason to proceed, never a verdict.

## The first test: distance from the model's defaults

A challenger exists to counteract a model's habitual page skeleton. Its value is therefore its **distance from what the model would produce unprompted**, and that is the gate every candidate passes or fails before any other question is asked.

Ask it directly: given a bare brief and no challenger, would the model arrive here on its own? If yes, the entry is worth less than nothing. It consumes a challenger slot while confirming the default it was meant to displace.

The 2026-07-27 round is the evidence. Half of it was drawn from contemporary web design on the theory that web-rooted worlds translate more readily to web builds. They translate perfectly and they change nothing: documentation surfaces, pricing pages, status pages, form validation, empty states and changelog streams scored 3 of 25, with reviewer notes reading "llms are already very good at this", "the models would get there on their own", "pretty common thing for an llm to do". The round scored 7 of 50 with no flagships, the worst of four.

This does not bar contemporary web sources. It bars **generic** ones. A specific auteur studio's site, a subcultural web idiom, an award-tier build with a real signature are all far from the default. "A pricing page" is the default. The distinction is between a named, dated, identifiable practice and a component pattern every framework ships with.

Usable challenger yield by round, against what each round optimized for: 25 chasing remote territory, 15 chasing restraint, 12 chasing signature, 7 chasing familiarity. The decline tracks one variable, and it is this one.

## What wins

Once a candidate is far enough from the defaults to be worth a slot, the winner-property test applies. Every candidate must be:

- **Born-designed**: the source is a produced 2D or display artifact with an existing graphic system, not a material, mood, or place. Even atmosphere-tier winners are secretly graphic (wax-print cloth, brick-build instructions, raku surface).
- **Dense**: the tradition immediately yields palette, materials, a type voice, several component roles, and a signature state change.
- **Era-and-school specific**: "1950s Blue Note session sleeve", never "record covers".
- **New territory**: the peak artifact of a culture the catalog has not touched. Proven seams saturate fast: the 2026-07-21 depth round scored 3/12 with 0 flagships because second-tier artifacts from mined veins read as near-duplicates ("too similar to others we already have"). Breadth-first beats depth-first.
- **System-distinct**: check the candidate against approved entries at the system level (palette plus type voice), not just by name. A different artifact with the same green-phosphor system is a duplicate.
- **Signature-bearing**: the entry names one structural property you could identify at a glance, such as torn poster strata, ordered dithering, three off-register inks on gray board, or relief calaveras over two-column verse. Every rejection in the 2026-07-24/25 rounds that read "too simple", "too basic", "not very unique" or "not super powerful" was an entry describable only by what it lacked: "modular grid", "generous empty space", "restrained palette", "measured classicism". Restraint is not a signature.
- **A reproduced graphic surface**, not a singular object. A signature only pays off when the artifact is printed, published, or displayed in multiples. The 2026-07-26 round proved this by spreading into physical-craft families: scrimshaw incising, brocade reverses, kandi cuffs, pilgrim badges, fore-edge painting, enamel plaques, a painted shutter, a van mural and a tour shirt all carry unmistakable signatures and every one was rejected, while printed and on-screen graphics in the same round converted around 60%. A one-off object yields a look; a reproduced surface yields a system.
- **Broad enough to challenge an arbitrary build.** This is a separate axis from quality and it is the one that silently caps a round's value: see the breadth gate below.

Flagship share by tier after the full sweep: graphic 52%, interaction 55%, atmosphere 29%. Interaction display languages stay overweighted; atmosphere qualifies only through the intrinsic-pattern rule in `rejectIf`.

**Saturation is not the axis.** Density of color reads like the winning property and is not. The socialist kiosk print flagship measures a chroma spread of 11 (three permitted inks on gray board) and the torn-billboard décollage flagship measures 16. What flagships share is legible structure, which shows up as contrast rather than chroma: winners run 51 to 101 greyscale standard deviation, while entries rejected as boring ran 29 to 44. A world may be built from texture, shape, or composition alone. It may never be built from an absence.

## What loses

- Translation failures: the dominant rejection ("doesn't translate to interface"). Material worlds without an intrinsic 2D pattern system never recover, and re-authoring them fails again (rework hit rate ~33%, and only for taste fixes, never translation fixes). The 2026-07-25 rework batch scored 2 of 16, and both survivors were entries whose original rejection named the imagery ("the two images went into very different directions", "ended up looking quite boring") rather than the world. Rework repairs a bad render. It does not rescue a world the reviewer found weak, and adding a signature after the fact does not change that verdict.
- **Composition strength, which cannot be approved at all.** `worlds-review-vite-plugin.mjs` refuses to approve a world-catalog entry whose `strength` is `composition`, because stagings belong in the composition catalog. In the 2026-07-24 round every one of the 10 entries left at composition strength was rejected, while all 6 the reviewer manually promoted to `dual` were approved. Author world-catalog entries as `world` or `dual` only. An idea that genuinely is a staging goes to the composition catalog instead.
- **Low-contrast, desaturated or single-hue palettes.** These fail at the render gate no matter how sound the world is, and the failure is authored in rather than introduced by the renderer. "One dusty tint, no true black and no true white" came back "way too desaturated"; "a lit studio void in white" came back "strange that it is only one color in different shades"; a pastel field with generous empty space came back "quite boring".
- **Military and political subject matter.** A standing reviewer constraint: entries reading as military hardware or state politics are rejected on subject, independent of system quality.
- **Ideas the image model cannot draw.** Some concepts are sound and unrenderable, and the render gate is where that surfaces. A liquid-metal interface of merging pools drew "a super interesting idea, but the model is not able to visualize it well enough". Renderability is an authoring constraint, not a rendering problem.
- Too narrow (single prop, single color), too abstract, operations archetypes, generic categories.
- Render traps: brass or metal interface chrome reads cheap (skeuomorphism itself is fine; execution is the issue), non-Latin copy drift on non-Western worlds (interface copy stays English), AI-cliche motifs (Matrix glyph rain, recording dots), dated game chrome (game-born worlds are welcome at contemporary award standard), em dashes in rendered copy.

## Cultural extraction, which the care rule does not cover

The care rule below tests **sacred versus commercial**. It was built to keep religious material out, and it does not answer a separate question: whether it is right to dress an unrelated product in the visual identity of a people who have already had things taken from them. A commercial lineage does not settle that. Adire has one. Kuba cloth was traded for centuries. Neither fact changes what the catalog does with them, which is generate an uncredited imitation for someone else's commercial purpose.

**The rule: skip a tradition when a living community holds it as identity and that community has a history of dispossession.** Historical commercial ephemera of dominant cultures is unrestricted. Majority-culture craft and print traditions are unrestricted. The line is not Western versus non-Western: Japanese woodblock publishing, Korean court screens, Ottoman guild marbling, Polish papercuts and Soviet-era Palekh are all majority-culture commercial traditions and stay in. The standing request for more non-Western systems is unchanged, and a rule that made the corpus more Eurocentric would be its own failure.

A candidate that takes a **transferable structural principle** rather than a surface is a genuinely weaker case for exclusion, and the distinction is worth understanding even though it did not save any entry in the 2026-07-27 audit: qalamkari's marks that stay invisible until the boil, Kuba's deliberately broken repeat, Scherenschnitte's rule that every element must bridge or fall. The idea travels; the community's look is not worn. Do not attempt to keep a surface-level entry by stripping its lineage field. That is laundering, and the lineage line is the only credit the tradition receives anywhere in the system.

**What the audit found (2026-07-27).** Across 531 world concepts and 317 stagings, 14 entries referenced a community on the review list and 8 were live in challenger draws. Two were pre-existing flagship-tier entries, not recent additions. All 8 were retired by rejection with a recorded reason rather than deletion, so the catalog keeps the record of why. The corpus had already partly self-corrected: 6 of the 14 were rejected during ordinary review, and they were precisely the surface-as-costume cases. Retiring all 8 left every challenger tier well above its floor.

## Cultural care

Skip living sacred, ceremonial, or community-owned traditions without an established commercial graphic lineage; skip highly religious material outright. Traditions enter cleanly when they already have a commercial or civic design history the way adinkra printing, thangka-informed diagram craft, hanafuda (a published card game), or azulejo (civic architecture) do. When in doubt, leave it out.

## Territory found by inventorying another catalog (2026-08-04)

An external catalog of 248 design languages was read in full and checked entry
by entry against all 541 of ours. Most apparent gaps were not: sashiko charts,
redaction dossiers, radar PPI, wheatpaste, risograph and five ceramic entries
are all already held at system level, and on ceramics we are ahead with seven
worlds. Twelve territories were genuinely absent and are now in the mode decks.

Two things about the result are worth keeping:

- **Nine of the twelve serve operate**, which is independent agreement with the
  conversion rates: interaction is the smallest pool and the best converting.
  Two methods pointing at one territory is the strongest signal available.
- **Every space world we hold is fictional.** HAL, Nostromo, LCARS, MAGI, Silent
  Running, and no real flight operations at all, despite DSKY verb-noun capsules
  and cuff checklists being a complete interface grammar. A family can look mined
  and hold a hole that size.

Their taxonomy beats ours in two ways worth taking seriously, written up in
[docs/PROPOSAL-signature-mechanic.md](PROPOSAL-signature-mechanic.md): every
entry names one load-bearing device and asserts it must recur, and every entry
carries its own anti-patterns rather than delegating to a global detector. They
are weaker where we are strong, with no mode or register taxonomy at all, and
their typed-descent graph has produced 22 unresolved name collisions.

## Territory map (unmined as of 2026-07-21)

One candidate per territory, always the territory's canonical peak:

- **Print and publishing**: Penguin/Pelican Marber grid, ligne claire comics, fotonovela, children's book schools (Scarry, Golden Books), Victorian trade cards, stamp design, marbled endpapers.
- **Technical and scientific illustration**: Haeckel plates, patent drawings, anatomical atlases, exploded-view manuals, Sanborn insurance maps, airline safety cards.
- **Fashion as artifact** (not draping): tartan clan registries, kimono/obi pattern grammar, sewing-pattern envelopes with tissue markings, Take Ivy catalog photography, sneaker-box and colorway-naming culture, techwear spec labels.
- **Games and decks**: tarot (commercial deck lineage), hanafuda, mahjong tiles, Tamiya model-kit box art with sprue diagrams, Game & Watch LCD language, casino chip and felt graphics.
- **Global commercial traditions**: Portuguese azulejo, heraldry, sonidero/cumbia posters, Jamaican soundsystem graphics, Tropicália, Ethiopian commercial iconography, Mayan codex facsimile publishing.
- **Fine-art movements with systems**: Vorticism, Precisionism, Le Corbusier polychromy, Barragan color walls.

Mark territories off as rounds mine them; a mined territory moves to the saturation gate.

## The breadth gate, and why approval count lies

A one-star approval is not a weak world. It records "unexceptional", and it used to leave the challenger pool entirely. It no longer does: rating and breadth were doing the same job badly, so `breadth: niche` now removes a world from the pool however good it is, which is the honest way to say "too narrow to challenge an arbitrary build", while a one-star draws at half weight. Reviewer notes on the narrow ones say so plainly ("looks cool, but is extremely niche", "delightfully weird"), and those are the entries that want `breadth`, not a low rating.

The consequence is that **approval count overstates a round**. Measure usable challenger yield, meaning two-star and three-star approvals only:

| round | approved | one-star, gated out | usable |
|---|---|---|---|
| 2026-07-24 | 26/50 | 1 | 25 |
| 2026-07-25 | 18/50 | 3 | 15 |
| 2026-07-26 | 22/50 | 10 | 12 |

The third round looked like a recovery on approval count and was the worst round by the number that matters. Its authoring brief chased a distinct signature, which selects for the vivid and specific, which is what reads as too niche. Author for breadth first and signature second.

Two structural gaps remain open here. Rating conflates quality with breadth, so the corpus cannot express "excellent and narrow" except by rating it marginal, which corrupts calibration for whoever reads the ratings next. And stagings have no gate at all: `selectApprovedStagings` filters on approval and surface only, with no rating weighting and no rating control in the review UI, so a narrow staging cannot be held back from challenger draws.

## Round mechanics

- Rounds stay small (~12) and are treated as experiments; expected hit rate is 25-40% now that the initial canonical harvest is done. Read the verdicts before the next round; every rejection note is calibration.
- Standing reviewer requests: more non-Western systems, more cassette/VHS-era systems.
- Retired families never receive new entries: machines-contraptions, food-potioncraft, memory-ruins, festivals-public-life.
- Sample deliberately below the bar. The 2026-07-24 round ran 16 of its 50 entries from a tier the sourcing agent wanted to filter out. They converted at 25%, but half the approvals were flagships, so the tier that converts rarely converts well. Keep a slice of it in every round rather than pre-filtering it away.

## Sourcing from an external taxonomy

A public aesthetics taxonomy is a legitimate source of territory and a poor source of candidates. Pulling the 1,078-entry aesthetics wiki on 2026-07-24 found roughly 50 already covered at system level and about 1,020 absent, but the absent ones are overwhelmingly fashion subcultures, mood-driven internet aesthetics, and music-scene labels, which `rejectIf` kills on style-as-label and on mood-without-pattern. Screening the full list against the winner-property test yielded 62 real candidates, a 6% conversion. Use such a list to find territories the catalog has never touched, then author the territory's canonical peak; never convert its entries one for one.

## The site queue

`catalog/site-queue.json` holds real pages worth deriving a world from, and
`scripts/site-queue.mjs` is the only thing that should write it. It is in
`catalog/` rather than `.waves/` for one reason: `.waves/` is gitignored, so the
first version of this queue was invisible to every session after the one that
built it, which is the opposite of what a queue is for.

```bash
pbpaste | node scripts/site-queue.mjs add        # anything containing URLs
node scripts/site-queue.mjs list                 # pending, numbered
node scripts/site-queue.mjs keep 3                 # worth an entry; id comes later
node scripts/site-queue.mjs pass 4 --why "flat template under the animation"
node scripts/site-queue.mjs done 3 --concept <id>  # once the entry exists
```

`add` extracts every http(s) URL from whatever it is given and throws the rest
away, so a bookmark export, a markdown list or a chat log all work. It
normalizes before comparing, so trailing slashes, `www`, and tracking
parameters do not smuggle in duplicates. Adding is meant to cost nothing:
a bad candidate costs one look, a lost one never comes back.

**Award-winning sites go offline, so queue the entry page.** Agency work is taken
down when the client moves on, campaign sites are switched off after the
campaign, and studios close. Paste an `awwwards.com/sites/<slug>` URL and
`site-to-world-image.mjs` reads the entry as the artifact rather than following
it to a dead host: the submission shot plus the designer's own gallery captures,
usually 3200px, showing sections a scroll capture never reaches. Nothing is
kept; the captures land in gitignored scratch and are used the way a designer
uses a reference. The prompt is told the captures may sit on a backdrop or in a
device mockup, and to read only the interface.

**What the camera catches instead of the design.** Four of the fifteen worlds in
the 2026-08-07 batch were unusable, and all four failed the same way: the
screenshot caught a consent banner, a geo-gate, a promo modal or an ENTER
splash, so the model was handed a picture of a cookie bar and faithfully
rebuilt a cookie bar. `site-to-world-image.mjs` now clears overlays by vendor
name and by behaviour (pinned, large, gate-sounding text) and enters a splash
gate. Two properties of that are deliberate: banners are **removed rather than
accepted**, because clicking Accept transmits a consent decision that is not
ours to give, and the splash matcher requires an exact word so "Enter your
email" cannot trigger it. A page that renders nothing above the fold is still
worth a second look with `--scrolls 4`.

**Deriving the kept rows is one command.** `derive-kept.mjs` is the whole
second half of the pipeline and the thing to reach for whenever the reviewer
asks for the queue to be processed:

```bash
node scripts/derive-kept.mjs            # dry run
node scripts/derive-kept.mjs --write
node scripts/derive-kept.mjs --write --only melinegobet-fr
```

Per kept row it observes motion, derives the entry, merges as pending, and
closes the row with the id. A row closes only after its merge succeeds, so any
failure leaves it kept and the pass is safe to re-run.

**Motion is the rule that gets invented, so it is the one that gets measured.**
`observe-motion.mjs` returns evidence rather than an impression, in three forms:
computed styles, where durations and easing curves are facts; a scroll strip;
and hover pairs. It also measures the *effect* rather than the cause, by
sampling transforms, scrolling, and sampling again, because a page can declare
one CSS transition and animate a hundred elements from script. gusta.studio does
exactly that, and library sniffing does not save you since bundlers rename
globals.

Three sources, in order of what is available:

| Source | What it gives |
|---|---|
| A live page | Declared durations and curves, a scroll strip, hover pairs, and a count of what moved |
| An awwwards entry | Frames sampled from the designer's own video, which is the only motion record a dead site will ever have, and often better since they chose what to record |
| Neither | `reachable:false`, and the entry is told to leave the rule thin. An honest gap beats a plausible fabrication. |

**The rule describes the new world, not the source.** The measurements give the
register: tempo, easing, restraint, how much moves at once. The generated image
gives the subjects, and it contains elements the source never had. Schweppes has
no bubble field, no harvest band and no carrot bunch; the world derived from it
has all three, and its rule parallaxes them at 0.6x and 1.2x and sways the bunch
2 degrees over 5 seconds while nothing is being scrolled, at the source's
measured speed. A rule that would fit any page has failed.

**To work the queue by hand**: `list`, then for each candidate go and *use* the page
before deciding anything. A screenshot is silent about motion, and motion is
usually the reason the page is on the list. Then
`site-to-world-image.mjs --url ... --name ...` for the image,
`image-to-world.mjs --name ... --id ... --notes "<what you saw move>"` for the
entry, `wave-merge.mjs` to land it, then `done` to record the id.

**The states are pending, then keep or passed, then done.** `keep` exists
because judging a render and writing its entry are separate jobs done at
different times: a reviewer looking at a picture cannot supply a concept id,
because the concept does not exist until the entry is written, so asking for one
at that moment asks for the answer to the next step. Keeping is one click and
the id is filled in later by whoever derives the entry. Nothing is deleted on
close: `done` records which world the page became and `pass` records why it did
not, so neither gets re-litigated in three months.

## Render-gate traps

The gate produces silent failures that look like successes, and every one of these shipped at least once before being caught:

- **A hero must render after its own board.** The hero takes the board off disk as binding style reference. Queue board and hero as independent jobs and a worker will start the hero first, which skips the reference on a new concept and, on a reworked one, generates the hero from the previous version's board. Roughly two thirds of the 2026-07-24/25 heroes rendered before their boards before this was fixed.
- **A moderated request returns a blank frame, not an error.** The image endpoint can answer with a valid, correctly sized, entirely black image. Exception-based checks read that as success and the manifest stamps it generated. Politically or militarily framed prompts trigger it, and it usually clears on retry.
- **A stale card is not a missing card.** Checking that an image file exists says nothing about whether it matches the concept. A reworked entry keeps its old files, so the round reports ready while the reviewer judges the previous version. Compare manifest hashes.
- **Reviewing rewrites the catalog.** The review plugin writes the ingredient catalogs, which serialize at indent 1, while review files serialize at indent 2. Writing both at one indent reformats the whole catalog on the first review and buries the round's additive diff.
- **Prompt wording drives exposure globally.** A single lighting instruction whose only worked example was a dark page pushed 28 of 50 heroes dark regardless of their declared palette. When a shared prompt gives one worked example, it becomes the default.

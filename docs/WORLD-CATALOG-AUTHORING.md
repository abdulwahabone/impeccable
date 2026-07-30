# World catalog authoring guide

How new concept-world rounds are authored, gated, and reviewed. Distilled from the full human sweep of 2026-07-20/21 (325 entries reviewed, 169 approved, all approved entries star-rated). The machine-readable core lives in `catalog/concept-ingredients.json` under `qualityBar` (`rejectIf`, `authoringStrategy`); this guide carries the reasoning and the territory map.

## The pipeline

1. An authoring agent receives the generated authoring context, and never a hand-built excerpt: `node scripts/catalog-authoring-context.mjs` emits the shelf map (entries grouped by family, so redundancy is visible at a glance) plus the full `qualityBar` verbatim. The 2026-07-21 digital round proved the failure mode: a hand-built corpus export dropped `provenSeams` and 8 of 15 entries landed in declared-saturated seams. Dedup happens at shelf level; candidates name their seam, and "nearest existing entry" framing is banned because it selects for near-neighbors. Three-star approvals are positive exemplars; rejection and rating notes are negative space.
2. New entries merge as `pending`. Nothing ships without human review. Serialization is `JSON.stringify(catalog, indent 1)` plus a trailing newline, which round-trips byte-identical, so an authoring diff is purely additive. Write `webLeverage` as a buildable commitment, not decoration: the skill now instructs builds to implement the named technique rather than a static imitation of it.
3. The render gate runs before review: specimen board first, then the desktop hero generated with the board attached as binding reference (`scripts/generate-world-cards.mjs`; the images/edits path keeps both images one system). The card manifest is content-hash keyed, so a bare run renders exactly the new or edited entries and nothing else.
4. **One command closes an authoring round**: `bun run catalog:round` validates the catalog, renders every stale or missing card, and prints the round status table (`catalog:status` runs the table alone). A round is review-ready when the table reports the render gate complete.
5. The reviewer decides in `/labs/worlds`: approve or reject, star ratings on approvals (3 exceptional, 2 solid, 1 marginal), notes on anything instructive. Ratings feed challenger draws in `concept-seed.mjs` (3-star doubles odds, 1-star sits out). After review, `bun run world-cards:publish` pushes approved cards to R2.

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

A one-star approval is not a weak world. It is a world too narrow to serve as a challenger for an arbitrary build, and `concept-seed.mjs` already acts on that: `ticketsFor` gives a one-star entry no tickets, so it keeps its approval for direct briefs and leaves the challenger pool entirely. Reviewer notes on those entries say so plainly ("looks cool, but is extremely niche", "delightfully weird").

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

## Render-gate traps

The gate produces silent failures that look like successes, and every one of these shipped at least once before being caught:

- **A hero must render after its own board.** The hero takes the board off disk as binding style reference. Queue board and hero as independent jobs and a worker will start the hero first, which skips the reference on a new concept and, on a reworked one, generates the hero from the previous version's board. Roughly two thirds of the 2026-07-24/25 heroes rendered before their boards before this was fixed.
- **A moderated request returns a blank frame, not an error.** The image endpoint can answer with a valid, correctly sized, entirely black image. Exception-based checks read that as success and the manifest stamps it generated. Politically or militarily framed prompts trigger it, and it usually clears on retry.
- **A stale card is not a missing card.** Checking that an image file exists says nothing about whether it matches the concept. A reworked entry keeps its old files, so the round reports ready while the reviewer judges the previous version. Compare manifest hashes.
- **Reviewing rewrites the catalog.** The review plugin writes the ingredient catalogs, which serialize at indent 1, while review files serialize at indent 2. Writing both at one indent reformats the whole catalog on the first review and buries the round's additive diff.
- **Prompt wording drives exposure globally.** A single lighting instruction whose only worked example was a dark page pushed 28 of 50 heroes dark regardless of their declared palette. When a shared prompt gives one worked example, it becomes the default.

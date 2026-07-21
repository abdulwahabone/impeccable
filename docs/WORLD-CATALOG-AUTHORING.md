# World catalog authoring guide

How new concept-world rounds are authored, gated, and reviewed. Distilled from the full human sweep of 2026-07-20/21 (325 entries reviewed, 169 approved, all approved entries star-rated). The machine-readable core lives in `catalog/concept-ingredients.json` under `qualityBar` (`rejectIf`, `authoringStrategy`); this guide carries the reasoning and the territory map.

## The pipeline

1. An authoring agent reads `qualityBar` (including `authoringStrategy`) and the review file. Three-star approvals are positive exemplars; rejection and rating notes are negative space.
2. New entries merge as `pending`. Nothing ships without human review. Serialization is `JSON.stringify(catalog, indent 1)` plus a trailing newline, which round-trips byte-identical, so an authoring diff is purely additive. Write `webLeverage` as a buildable commitment, not decoration: the skill now instructs builds to implement the named technique rather than a static imitation of it.
3. The render gate runs before review: specimen board first, then the desktop hero generated with the board attached as binding reference (`scripts/generate-world-cards.mjs`; the images/edits path keeps both images one system). The card manifest is content-hash keyed, so a bare run renders exactly the new or edited entries and nothing else.
4. **One command closes an authoring round**: `bun run catalog:round` validates the catalog, renders every stale or missing card, and prints the round status table (`catalog:status` runs the table alone). A round is review-ready when the table reports the render gate complete.
5. The reviewer decides in `/labs/worlds`: approve or reject, star ratings on approvals (3 exceptional, 2 solid, 1 marginal), notes on anything instructive. Ratings feed challenger draws in `concept-seed.mjs` (3-star doubles odds, 1-star sits out). After review, `bun run world-cards:publish` pushes approved cards to R2.

## What wins

The winner-property test. Every candidate must be:

- **Born-designed**: the source is a produced 2D or display artifact with an existing graphic system, not a material, mood, or place. Even atmosphere-tier winners are secretly graphic (wax-print cloth, brick-build instructions, raku surface).
- **Dense**: the tradition immediately yields palette, materials, a type voice, several component roles, and a signature state change.
- **Era-and-school specific**: "1950s Blue Note session sleeve", never "record covers".
- **New territory**: the peak artifact of a culture the catalog has not touched. Proven seams saturate fast: the 2026-07-21 depth round scored 3/12 with 0 flagships because second-tier artifacts from mined veins read as near-duplicates ("too similar to others we already have"). Breadth-first beats depth-first.
- **System-distinct**: check the candidate against approved entries at the system level (palette plus type voice), not just by name. A different artifact with the same green-phosphor system is a duplicate.

Flagship share by tier after the full sweep: graphic 52%, interaction 55%, atmosphere 29%. Interaction display languages stay overweighted; atmosphere qualifies only through the intrinsic-pattern rule in `rejectIf`.

## What loses

- Translation failures: the dominant rejection ("doesn't translate to interface"). Material worlds without an intrinsic 2D pattern system never recover, and re-authoring them fails again (rework hit rate ~33%, and only for taste fixes, never translation fixes).
- Too narrow (single prop, single color), too abstract, operations archetypes, generic categories.
- Render traps: brass or metal interface chrome reads cheap (skeuomorphism itself is fine; execution is the issue), non-Latin copy drift on non-Western worlds (interface copy stays English), AI-cliche motifs (Matrix glyph rain, recording dots), dated game chrome (game-born worlds are welcome at contemporary award standard), em dashes in rendered copy.

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

## Round mechanics

- Rounds stay small (~12) and are treated as experiments; expected hit rate is 25-40% now that the initial canonical harvest is done. Read the verdicts before the next round; every rejection note is calibration.
- Standing reviewer requests: more non-Western systems, more cassette/VHS-era systems.
- Retired families never receive new entries: machines-contraptions, food-potioncraft, memory-ruins, festivals-public-life.

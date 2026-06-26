# Upgrading `/impeccable init`

## New questions that add additional context to `PRODUCT.md`

### PRODUCT.md — planned additions

| What | Where | Why | Mandatory | Brand example | Product example |
|------|-------|-----|-----------|---------------|-----------------|
| Who uses it vs who it's for (user ≠ buyer) | `## Users` | On many projects the person using the product isn't the one who chooses it. Naming both decides whose words and worries the copy answers, so a brand site wins over the buyer instead of talking only to the end user. | false | Uses it: kids · For: parents (safety, price, trust) | Uses it: support agents · For: the ops lead who buys the seats |
| Primary / secondary audience + who to deprioritize | `## Users` | Forces a ranking so the design serves one audience first instead of blanding out to please everyone. Sets density, tone, and what gets cut in `craft`, `critique`, and `onboard`. | true | Primary: parents · Secondary: teachers · Not for: kids browsing alone | Primary: daily ops managers · Secondary: execs skimming · Not for: one-time auditors |
| Positioning / onlyness | `## Positioning` (new) or under `## Product Purpose` | Anti-references say what to avoid; this says what to *be*. The one strategic claim every screen reinforces, so output reads as this brand, not generic category design. Feeds `clarify`, `bolder`, and `critique`. | true | The studio for brands that outgrew their template site — not "we make beautiful websites." | Team health at a glance, no spreadsheet export — not another lookalike BI dashboard. |
| Belief ladder: what the visitor must believe, in order, before the primary CTA | `## Proof & conversion` (new) | Turns a page into doubts answered in sequence, not a stack of pretty sections. Tells `craft` / `shape` what proof to show and where, and `harden` which objections to defuse. | false | 1) This agency is for brands our size → 2) Work is mature not template → 3) Case studies prove it → book a call | 1) This tool fits my stack → 2) I trust the data → 3) I can finish the task today → create report |
| Proof on hand: testimonials, case studies, press quotes, client/partner logos | `## Proof & conversion` (new) | Inventory of what actually exists to back the belief ladder, so `craft` / `shape` design real proof blocks instead of lorem placeholders, and `critique` can flag claims with no evidence. Text sits inline; media is referenced by path or link (supplied files staged under `.impeccable/assets/proof/`). | false | Testimonial — "…" — Jane Doe, VP Ops, Acme · Case study → `…/acme-case.pdf` · Client logos: Acme, Globex | Testimonial — "cut onboarding 40%" — ops lead · Press — TechCrunch → `https://…` · Logos: Acme, Initech |
| Primary and secondary CTA | `## Product Purpose` | Names the one action everything points to, plus the fallback. Sets button hierarchy and nav so the design isn't inferring the goal from features. | true | Primary: book discovery call · Secondary: download capability deck | Primary: connect data source · Secondary: invite teammate |
| The one line a visitor remembers after 10 seconds | `## Product Purpose` | The distilled expression of the positioning — the hero/H1 north star, and a pass/fail test in `critique` ("does the top of the page actually say this?"). | false | "Design partner for brands ready to look as mature as their revenue." | "Team health in one screen, no spreadsheet export." |
| Strategic tensions to hold ("X, but not Y") | `## Design Principles` or `## Brand Personality` | Stops the obvious move from overshooting (bold → loud, simple → bland). Gives every command, and `live` variants, a guardrail for taste calls. | false | Confident not loud · Editorial not template · Proof-led not claim-led | Dense not cluttered · Familiar not generic · Fast not flashy |

## Document seed `DESIGN.md`

### Blank repo

Currently it starts with:

> Before interviewing: "There's no existing visual system to scan. I'll ask five quick questions to seed a starter DESIGN.md. You can re-run `/impeccable document` once there's code, to capture the real tokens and components. OK?"

I would like to change it so first we can ask the user to add assets they already have.

#### Questions in chat

1. **Assets upload**
   - Logos
   - Reference/product images
   - Moodboards

   This will give us additional context which is very useful.

2. **Three named references** — brands, products, printed objects. Not adjectives.

3. **One anti-reference** — what it should NOT feel like. Also named.

Next we detect if the user's harness has image gen and if they allow us to generate a few images for visual cues for brand color palette selection. If they allow and they don't have image gen capability, we can ask them to put the Flux API in the env.

#### Questions in local browser

Then the local browser will start.

**Vertical slide view:**

1. First slide will be about amount of color, full palette, drenched, etc.
2. We will show visual cues in an interactive way. Once the user selects a visual cue.
3. We will lay out the color palette in a way that is similar to the Google Stitch DESIGN.md tokens, because that's how we have done so far and it has worked.
4. Font slide — we will show a few font pairs, and will ask the user to select which one suits them best.
5. Type slide — pick one.
6. Motion energy — pick one.
7. Border radii — pick one.
8. Elevation depth — pick one.
9. Iconography — pick one of the free open source packs. They will see a list of icons from each pack with links that open in a new tab where they can search other icons to check if the icons they want exist.

Each of these slides will be modular and the output from each slide will account for a separate section in the DESIGN.md.

### Existing repo

If a repo is existing and a user refreshes the DESIGN.md, the agent will look into the DESIGN.md and see which sections are missing and then ask those questions and run the slides in the local browser for the questions that are missing.

## Aesthetics during the questionnaire

Low priority, but would be a wow moment.

Imagine that the init starts with a welcome message and Impeccable orb. The Impeccable orb will be an animated GIF with alpha transparency. I have tested it and it works well so far.

This orb will show progress. For example, in the beginning we could have an orb which is barely glowing, and later on we have a glowing orb; at the very end we can have a supernova kind of orb. Each of these GIF assets will be on the Impeccable website that the chat will pull and render along the way.

Feel free to suggest better language.

When user runs `/impeccable init`:

```
┌──────────────────────────────────────────────────────────────────┐
│  /impeccable init                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ·   ·                                                           │
│ ·  ○  ·                                                          │
│  ·   ·                                                           │
│                                                                  │
│  This is your design context. It helps you craft tailored UI.    │
│  The more the context knows, the better your UI will be.         │
│                                                                  │
│  Proceed with the first question…                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Out of scope

Feel free to suggest moving these in:

- I think we should ask the user if they have any existing `DESIGN.md` or existing Figma — we should ask the user to paste it. For Figma we need the user to follow a few steps to export the variables JSON.

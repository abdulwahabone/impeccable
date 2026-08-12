# PRODUCT.md interview — all questions

Reference for `/impeccable init` Step 3. Source of truth: `skill/reference/init.md`.

Init writes **strategic** context only. Colors, fonts, spacing, and components belong in `DESIGN.md`, not here.

---

## How the interview works

- Agent **scans the repo first** (Step 2), then asks only what it cannot infer.
- **2–3 questions per round**, then wait for answers.
- **Round 1:** register, users, purpose, desired outcome, proof & conversion (belief ladder).
- **Round 2:** personality, references, anti-references, accessibility.
- User must **confirm** answers before `PRODUCT.md` is written. No silent invention from a one-line prompt.
- Questions may be **skipped** when README, routes, or existing docs already answer them.

---

## Conditional questions (before Round 1)

These are not always asked. They depend on what already exists in the repo.

### Which file to refresh?

**When:** Both `PRODUCT.md` and `DESIGN.md` already exist.

**Example question:**
> Both PRODUCT.md and DESIGN.md exist. Which should I refresh — PRODUCT.md, DESIGN.md, or both?

**What it writes:** Nothing by itself. Determines whether the full interview runs or init skips to Step 5 (DESIGN.md only).

---

### Register confirmation (legacy PRODUCT.md)

**When:** `PRODUCT.md` exists but has no `## Register` section.

**Example question:**
> From the codebase, this looks like a **product** surface (dashboard routes, app shell). Does that match, or should the default register be **brand**?

**What it writes:**

```markdown
## Register

product
```

Bare word only — `brand` or `product`, no prose.

---

## Round 1 questions

### 1. Register

**What it is:** Whether design **is** the product (marketing, landing, portfolio) or **serves** the product (app, dashboard, tools). Shapes every downstream command.

**Example questions:**

| Situation | Example ask |
|----------|-------------|
| Clear hypothesis from code | From the codebase, this looks like a **brand** surface (marketing homepage, `/docs`, editorial layout). Does that match your intent? |
| Empty repo | Is this primarily a **brand** surface (marketing, landing, content) or a **product** surface (app UI, dashboard, tool)? |
| Split codebase (marketing + app) | You have both a marketing site and `/app/dashboard`. Which register is the **primary** default — brand or product? |

**Example answers:**

- `brand` — Impeccable marketing site, agency portfolio, product launch page.
- `product` — SaaS dashboard, admin panel, internal ops tool.

**What it writes:**

```markdown
## Register

brand
```

**Impeccable example:** `brand` (design IS the product for the public site).

**Also drives:** Which register file loads later (`reference/brand.md` vs `reference/product.md`).

---

### 2. Who uses this?

**What it is:** Primary audience — role, skill level, motivation. Not demographics for their own sake.

**Example questions:**

- Who is the primary audience for this project?
- Are they developers, product managers, executives, or general consumers?
- How technical are they when they arrive?

**Example answers:**

| Project type | Example answer |
|--------------|----------------|
| Dev tool (Impeccable) | Designers, PMs, and engineers who use AI coding tools and want better design output from their AI. |
| Invoice SaaS | Freelance designers and small-studio owners who send invoices without a finance team. |
| Restaurant site | Local diners choosing where to eat tonight; mix of tourists and regulars, mobile-first. |

**What it writes:** Opening paragraph(s) of `## Users` — who they are.

**Impeccable example:**

```markdown
## Users

Designers, product managers, and engineers who use AI coding tools (Cursor, Claude Code, GitHub Copilot, Gemini CLI, Codex CLI, and others) and want better design output from their AI.
```

---

### 3. What is their context?

**What it is:** How and when they encounter the product — arrival path, prior knowledge, time pressure.

**Example questions:**

- How do they find this — search, GitHub, referral, ad, word of mouth?
- What do they already believe or know before they land?
- Are they browsing casually or under time pressure?

**Example answers:**

| Project type | Example answer |
|--------------|----------------|
| Impeccable | They land from GitHub, social media, or word of mouth, already aware that AI-generated UIs have quality problems. |
| Dashboard | Daily standup check-in; 2-minute scan before the meeting starts. |
| E-commerce | Arrive from Instagram ad; skeptical, comparing two options on phone. |

**What it writes:** Middle of `## Users` — context paragraph, often merged with “who.”

**Impeccable example:** Same section continues with *“They land on the site from GitHub, social media, or word of mouth, already aware…”*

---

### 4. What job are they trying to get done?

**What it is:** The outcome they hire this for — not a feature list.

**Example questions:**

- What problem brought them here today?
- What outcome do they want from this visit?
- What would they use if this did not exist?

**Example answers:**

| Project type | Example answer |
|--------------|----------------|
| Impeccable | They're looking for a **practical solution**, not education about the problem. |
| Analytics app | Spot whether their team’s throughput dropped this week and drill into why. |
| Booking app | Book a table for tonight without calling anyone. |

**What it writes:** Closing sentence(s) of `## Users` — job to be done.

**Impeccable example:** *“They're looking for a practical solution, not education about the problem.”*

---

### 5a. Emotions to evoke *(brand register only)*

**What it is:** Intended feeling on first visit. Brand surfaces are impression-first.

**Example questions:**

- Should it feel confident or calm?
- Delight and surprise, or trust and seriousness?
- Urgency to act, or room to explore?
- Editorial and refined, or bold and energetic?

**Example answers:**

- Impeccable: expert confidence, editorial calm, zero hype — not playful startup energy.
- Luxury hotel: calm, trust, understated prestige.
- Campaign landing: urgency, excitement, FOMO to sign up.

**What it writes:** Woven into `## Users` and/or `## Brand Personality` (emotional goals, tone).

**Impeccable example:** Personality section — *“confident taste, editorial quality, zero hedging.”*

---

### 5b. What workflow are they in? *(product register only)*

**What it is:** Recurring mode of use when they open the app.

**Example questions:**

- Daily check-in or deep analysis session?
- First-time setup or repeat power use?
- Solo focus work or collaborating with a team?

**Example answers:**

- Ops dashboard: daily 8am standup scan, then occasional deep dive during incidents.
- Settings panel: configure once, rarely return.
- CRM: power users live in it 6 hours a day; novices need guided first run.

**What it writes:** `## Users` — workflow context alongside role and job.

---

### 5c. Primary task on each screen? *(product register only)*

**What it is:** The one job each view must complete without distraction.

**Example questions:**

- On the overview: scan metrics and spot anomalies?
- On detail view: edit one record and leave?
- On settings: configure once and forget?

**Example answers:**

- Overview: find team regression in under 2 minutes.
- Invoice list: send one invoice and exit.
- Onboarding: connect bank account, see first dashboard, done.

**What it writes:** `## Users` or informs `## Product Purpose` success criteria for product flows.

---

### 6. What does this product or site do?

**What it is:** Core promise in plain language — what it does.

**Example questions:**

- What is the one-sentence promise?
- What does this do that alternatives do not?
- What would you tell someone at a dinner party this project is for?

**Example answers:**

- Impeccable: Gives builders a shared design vocabulary with their AI, as a plug-and-play skill across major harnesses.
- Invoice tool: Lets freelancers send professional invoices the same day they finish work.
- Analytics: Shows team health in one screen without exporting to spreadsheets.

**What it writes:** Opening of `## Product Purpose` — the promise.

**Impeccable example:**

```markdown
## Product Purpose

Impeccable gives builders a shared design vocabulary with their AI, delivered as a plug-and-play skill that works in every major AI coding harness.
```

---

### 7. Why does it exist?

**What it is:** Motivation and gap — why now, why this project.

**Example questions:**

- What gap in the market or workflow does it fill?
- Why now — what changed that makes this needed?
- Who loses if this never gets built?

**Example answers:**

- Impeccable: AI UI quality is broken; vague prompts cannot fix it; builders need a shared vocabulary with their agent.
- Invoice tool: Email threads lose invoices; spreadsheets are error-prone for non-accountants.

**What it writes:** Often merged into `## Product Purpose` first paragraph (purpose + why).

---

### 8. What does success look like?

**What it is:** Observable win criteria — not “users love it.”

**Example questions:**

- How would you know it is working in 3 months?
- What behavior means you won?
- What would a failed version look like?

**Example answers (brand):**

- Understand what we do in under 10 seconds.
- Feels distinct — not generic AI marketing.
- Visitor installs or stars the repo without a tutorial lecture.

**Example answers (product):**

- User finishes core flow without reading docs.
- Primary task done in under 3 minutes.
- Linear/Figma user trusts the UI on first open.

**What it writes:** Second half of `## Product Purpose` — numbered or bulleted success criteria.

**Impeccable example:**

```markdown
Success is measured in two ways: (1) the user can steer AI output with design precision instead of vague prose, and (2) the AI produces interfaces that pass professional design review, not "looks like an AI made it" output.
```

---

## Round 2 questions

### 9. Brand personality in three words

**What it is:** Short voice anchor for copy and visual tone across the project.

**Example questions:**

- How would you describe the brand personality in exactly three words?
- If this brand were a person in the room, how would they speak?

**Example answers:**

- Impeccable: **expert, decisive, editorial**
- Friendly fintech: warm, clear, trustworthy
- Dev tool: precise, dry, confident

**What it writes:** `## Brand Personality` — three-word line plus expanded voice/tone prose.

**Impeccable example:**

```markdown
Three-word personality: **expert, decisive, editorial**.
```

Plus paragraphs on direct, specific, rooted-in-craft tone.

---

### 10. Reference sites or apps

**What it is:** Named taste references — what to emulate, specifically.

**Example questions:**

- Name 2–3 sites or apps that capture the right feel.
- What **specifically** about each one — not “I like Stripe.”

**Example answers (good):**

- Eye Magazine — long-form, considered typography, design-publication tone.
- Klim specimen pages — specimen restraint, one accent color, typographic confidence.
- A List Apart — craft-focused editorial, not hype marketing.

**Example answers (bad — agent should push back):**

- “Modern and clean”
- “Like Apple”
- “Professional SaaS”

**What it writes:** Informs `## Brand Personality` prose and **`## Design Principles`** (e.g. editorial over marketing).

**Impeccable example:** Design Principle #4 — *“Feels like a design publication (Eye Magazine, It's Nice That, A List Apart)…”*

---

### 11. Anti-references — what NOT to look like

**What it is:** Explicit bad examples and patterns to avoid. Prevents AI default slop.

**Example questions:**

- What should this explicitly NOT look like?
- Name a site or pattern that would mean we failed.
- Any category clichés to ban?

**Example answers:**

- Impeccable: Generic AI tool marketing (purple gradients, glassmorphism); SaaS hero-metric grids; hedging copy.
- Dev tool: Notion-clone purple UI; cyan-on-black “hacker” aesthetic.
- Editorial brand: Not a template SaaS landing with identical feature cards.

**What it writes:** `## Anti-references` — bulleted list with named patterns.

**Impeccable example:**

```markdown
- **Generic AI tool marketing**: dark mode with purple gradients, neon accents, glassmorphism...
- **SaaS landing-page clichés**: hero-metric layouts, identical-card feature grids...
```

Also feeds `DESIGN.md` Don'ts later via `/impeccable document`.

---

### 12. Accessibility requirements

**What it is:** Inclusion bar beyond generic “be accessible.”

**Example questions:**

- Target WCAG level — AA or AAA?
- Known user needs in your audience (low vision, motor, cognitive)?
- Legal or contractual a11y requirements?

**Example answers:**

- Impeccable: WCAG 2.1 AA baseline on all pages.
- Gov-adjacent product: Section 508, AAA where feasible.
- Consumer app: AA + tested with screen reader users.

**What it writes:** Opening line of `## Accessibility & Inclusion` — WCAG level and commitments.

**Impeccable example:**

```markdown
Baseline: WCAG 2.1 AA on all pages. Key commitments:
```

---

### 13. Accommodations (motion, color, etc.)

**What it is:** Specific inclusion considerations beyond WCAG checkbox.

**Example questions:**

- Must all motion respect `prefers-reduced-motion`?
- Color-blind or low-contrast users in the audience?
- Keyboard-only or switch-device users?

**Example answers:**

- Impeccable: Contrast checks not eyeballing; keyboard nav; reduced motion on every animation; semantic HTML first.
- Marketing site: No autoplay video; no information conveyed by color alone.
- Dashboard: Don’t rely on red/green alone for status; provide icons + labels.

**What it writes:** Bullet list under `## Accessibility & Inclusion`.

**Impeccable example:**

```markdown
- Color contrast ratios verified with actual contrast checks, not eyeballing.
- All interactive elements keyboard-navigable with visible focus states.
- `prefers-reduced-motion` respected for every animation.
```

---

## Derived content (not a direct question)

### Design Principles

**What it is:** 3–5 strategic rules **synthesized** from the conversation — not asked as a standalone menu.

**Agent derives from:** personality, anti-references, purpose, success criteria, register.

**Example principles (Impeccable):**

1. Practice what you preach — site passes its own anti-pattern tests.
2. Show, don't tell — the site IS the demo.
3. Expert confidence — no hedging.
4. Editorial over marketing — publication, not SaaS landing.
5. Purposeful restraint — every element earns its place.

**What it writes:**

```markdown
## Design Principles

1. **Practice what you preach.** ...
2. **Show, don't tell.** ...
```

**Not visual rules:** No “use OKLCH,” “16px radius,” “magenta accent” — those belong in `DESIGN.md`.

---

## Confirmation gate (after all questions)

**Example ask:**

> Here’s what I’ll write to PRODUCT.md — [summary]. Confirm before I write, or tell me what to change.

**What it writes:** Nothing until user confirms. Then full `PRODUCT.md` at project root.

---

## Optional question (after write — Step 7)

**Example ask:**

> Want a short **Design Context** summary appended to CLAUDE.md / `.cursorrules` for easier agent reference?

**What it writes:** Optional pointer section in agent config file — **not** part of `PRODUCT.md`.

---

## What init does NOT ask for PRODUCT.md

| Topic | Where it belongs |
|-------|----------------|
| Hex colors, palettes | `DESIGN.md` / seed or scan |
| Font names, type scale | `DESIGN.md` |
| Border radius, spacing | `DESIGN.md` |
| Component specs | `DESIGN.md` |
| Motion timing, easing | `DESIGN.md` |
| Layout grid details | `DESIGN.md` |

---

## Full PRODUCT.md section map

| Interview topic | PRODUCT.md section |
|-----------------|------------------|
| Register | `## Register` |
| Who + context + job (+ emotions or workflow) | `## Users` |
| What it does + why + success | `## Product Purpose` |
| 3-word personality + voice | `## Brand Personality` |
| References (implicit) + anti-references | `## Brand Personality` + `## Anti-references` + `## Design Principles` |
| Anti-references (explicit) | `## Anti-references` |
| WCAG + accommodations | `## Accessibility & Inclusion` |
| Synthesis of whole conversation | `## Design Principles` |

---

## Inference modes (same questions, different delivery)

| Repo state | How register / users questions are asked |
|----------|----------------------------------------|
| **Blank** | Ask explicitly — no hypothesis |
| **Sparse** | Lead with hypothesis — “Looks like X for Y. Right?” |
| **Rich README** | Skip or one-line confirm — “README names audience; use unless you want changes?” |
| **PRODUCT.md exists with register** | Skip Round 1 entirely — jump to DESIGN.md offer |

---

## Source

- `skill/reference/init.md` — Steps 1–4
- Example output: `PRODUCT.md` in this repo

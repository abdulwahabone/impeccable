// The prompts that build a world's cards, in one place so a caller can render
// exactly what ships. hero-prompt-lab.mjs was reconstructing buildHeroPrompt by
// slicing the source and eval-ing it, which broke on the first refactor and
// would have silently drifted from the real prompt if it had not.

export function boardTitle(concept) {
  return concept.form
    .split(',')[0]
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function buildHeroPrompt(concept) {
  const palette = concept.system[0].replace(/^Palette\/material:\s*/, '');
  const type = concept.system[1].replace(/^Type\/composition:\s*/, '');
  return `A complete desktop landing page filling the entire 16:9 frame edge to edge, as if screenshotted at 1440 pixels wide. No browser chrome, no device mockup, no specimen-board framing, no caption: the page itself is the entire image.

The composition comes from the world, not from a template. This prompt used to
specify the furniture, a slim top nav, a large headline, one supporting line, a
call-to-action button, and the next section peeking in at the bottom, and every
world in the catalog was rendered into that same skeleton. That is the default
landing page a model produces unprompted, which is precisely what a challenger
exists to displace.

So decide the arrangement from the world's own laws below. Its topology rule says
how a surface is organised and navigated; obey that rather than adding a top
navigation bar because pages have one. Its type rule says what scale and
alignment it works at; if that means one monumental line filling the viewport, or
a dense tabular field, or text ranged against an edge, do that instead of a
centred headline with a subhead. Ask where imagery belongs in this world before
placing any, and whether this world would have a button at all before drawing
one. A page that could be reskinned into any other world here has failed.

This image is the FIRST VIEWPORT of a much longer page, not the whole page. It is
the top of something that continues well below the fold. So: no footer, no
closing section, no full site map, no complete feature set. Whatever sits at the
bottom edge should be cut off mid-element, the way a real screenshot of a page
top is cut off, because more of it exists below.

That is a limit on how much you draw, not on how you arrange it: a dense world
should still be dense, it should simply be dense within one screen.

And obey the density the world's own rules describe. If they describe a calm or
ceremonial surface, leave the emptiness in; the temptation is to fill a frame
because a frame is there. If they describe a packed or working surface, pack it.
Read this off the five rules rather than splitting the difference: only 31 of 562
concepts carry a recorded density axis, so for almost every world the rules are
the only statement of it there is.

The page is designed wholly inside this visual world: ${concept.form}.
Palette and materials: ${palette}
Typography and composition: ${type}
Organisation and navigation: ${concept.system[2].replace(/^Topology\/navigation:\s*/, '')}
Density and behaviour: ${concept.system[4].replace(/^Responsive\/motion:\s*/, '')}
Atmosphere, never written on the page but carried into it: ${concept.spark}
Light the page like the world: its hour, light quality, and mood shape the page ground, surfaces, and imagery, not just the accent color. Take the page ground from the palette above rather than from atmosphere: a world of cream stock, daylight, paper, or bright ink produces a genuinely light page, and only a world that is actually nocturnal or interior produces a dark one. Do not darken a page whose palette is light.

Invent a plausible fictional product or brand this world would naturally serve and write short realistic copy for it (plain punctuation, never an em dash): an invented name that reuses no brand, label, designer, or place name from the world description, a headline of at most eight words, one supporting sentence, and button labels. The result must read as a real, current, award-caliber website built from this world's laws: disciplined grid, aligned edges, believable interface details, generous intentional spacing. Not a poster, not a pastiche, a landing page.

The world must live in the interface itself, not only in imagery: the navigation, buttons, cards, dividers, and type voices are built from the world's materials, colors, textures, and lettering traditions. A photograph or illustration may appear as content, but a generic clean website wearing a themed hero image is a failure; a stranger shown only the page footer or a single button should still recognize the world.

Craft rules, all mandatory: every piece of interface copy is English, even when the world is Japanese, Arabic, or otherwise non-Latin in origin; at most one small non-Latin glyph may appear as a decorative motif, never in the wordmark, navigation, headlines, or body text, and when in doubt use none. Rendered materials must read premium and physically plausible: real metal, wood, paper, and glass with honest light, never plasticky gradient fakes of them. Game and HUD grammar is welcome whenever the world carries it: meters, maps, status readouts, and menu language are legitimate interface material when art-directed to contemporary award standard. The failure is cheap dated chrome, the 2000s-MMORPG stone-and-rivet kind that no web design could wear; when the world is screen- or game-born, render its grammar with the same craft a premium product site would get. Vary the composition beyond the world's single most famous motif and refuse AI-cliche renderings of it (Matrix-style glyph rain, red recording dots); use the world's wider grammar.`;
}

export function buildDocsPrompt(concept) {
  const palette = concept.system[0].replace(/^Palette\/material:\s*/, '');
  const type = concept.system[1].replace(/^Type\/composition:\s*/, '');
  return `A complete desktop DOCUMENTATION page filling the entire 16:9 frame edge to edge, as if screenshotted at 1440 pixels wide. No browser chrome, no device mockup, no specimen board, no caption: the page itself is the whole image.

This is a technical reference page someone has to actually read for twenty minutes, not a marketing page. It must contain, all clearly legible:
1. A persistent left sidebar of nested navigation links, one section expanded, one item marked current.
2. A main article column with an H1, at least two H2 subheadings, and FOUR OR MORE full paragraphs of real running body prose. The paragraphs are the point of the image: they must be long enough and set at a size and measure a person would genuinely read at length.
3. One monospaced code block with three to six lines and subtle syntax differentiation.
4. One small table or parameter list with a header row and three or four rows.
5. A right-hand on-this-page contents rail, or a prev/next pair at the article foot.

The page is designed wholly inside this visual world: ${concept.form}.
Palette and materials: ${palette}
Typography and composition: ${type}

The world must be legible in the interface itself, in the sidebar, the rules, the code block, the table, the link and heading treatments. But this is a reading surface first: body prose stays comfortably readable, the measure stays sane, and hierarchy serves comprehension rather than impact. If the world's laws and long-form legibility genuinely conflict, show that conflict honestly rather than quietly abandoning the world or quietly fixing the text. Do not turn this into a poster, a hero section, or an art piece.

Invent a plausible fictional technical product and write short realistic English copy for it, plain punctuation, never an em dash, reusing no brand, designer, or place name from the world description. Interface copy is always English. Never transcribe any sentence of these instructions onto the page.`;
}

export function buildPrompt(concept) {
  const palette = concept.system[0].replace(/^Palette\/material:\s*/, '');
  const type = concept.system[1].replace(/^Type\/composition:\s*/, '');
  return `A single flat design-system specimen board, the kind a design studio produces to prove a visual world translates into web and app design. The board is titled "${boardTitle(concept)}" and fills the whole image edge to edge: no desk, wall, binder clips, pins, or drop shadows around it.

The visual world being translated: ${concept.form}.
Mood reference for art direction only: ${concept.spark}

Board sections, left to right:
1. COLOR & MATERIAL column: five to seven labeled palette swatches plus two or three material texture chips, derived strictly from: ${palette}.
2. TYPOGRAPHY panel: a large display headline specimen and a short body-text block obeying: ${type}.
3. COMPONENTS panel: a primary button, a secondary button, a text input, one content card, and a small navigation bar, all styled by this exact system, with normal and active states.
4. One small phone-screen composition in the corner showing the system as a real app or landing screen.

The board ground and dividers take their tone from the world's palette. Precise, crisp, flat graphic rendering like a printed specimen sheet; not a photograph or illustration of the world itself, only the interface system it yields. The only text on the board is the title, short section labels, and brief invented specimen words; never transcribe any sentence from these instructions onto the board.`;
}

// Three variants per card, each given a different invented context so the set is
// genuinely varied rather than three renders of one idea. The reviewer picks a
// winner and the others are kept, both so a choice can be revisited and because
// a later version of impeccable may offer all three as starting points.
//
// The seeds steer only the SUBJECT. Every visual law still comes from the world,
// which is the point: three unrelated products in one identity prove the world
// travels, where three renders of the same product only prove the renderer is
// consistent.
export const VARIANT_CONTEXTS = {
  v1: '',
  v2: `

For this variant, invent a product from a DIFFERENT domain than the obvious one for this world. If the world suggests something cultural, make it practical; if it suggests something technical, make it domestic. The visual system does not change at all, only what is being sold.`,
  v3: `

For this variant, invent a product unlike either an obvious choice or a merely adjacent one: a service, a piece of hardware, a place, an institution, or a tool, whichever this world has not yet been asked to dress. Choose a different audience too. Every visual law stays exactly as specified; only the subject and its copy change.`,
};

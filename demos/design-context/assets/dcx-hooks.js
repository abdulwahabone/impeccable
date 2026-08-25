(() => {
  "use strict";

  const STORAGE_KEY = "dcx-hooks-preview-v1";
  const MOBILE_FAMILIES = window.matchMedia("(max-width: 560px)");
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
  const FAMILY_META = {
    fingerprints: {
      label: "Fingerprints",
      description: "Recurring signatures found across generated interfaces.",
    },
    slop: {
      label: "UI tells",
      description: "Common generated-UI habits that make a design feel interchangeable.",
    },
    quality: {
      label: "Quality floor",
      description: "Measurable defects in legibility, hierarchy, overflow, and system consistency.",
    },
  };
  const DISCIPLINE_ORDER = [
    "Visual Details",
    "Typography",
    "Color & Contrast",
    "Layout & Space",
    "Motion",
    "Imagery",
    "Copy",
    "Quality",
  ];
  // Snapshot from the canonical Impeccable detector registry. The standalone
  // demo has no module graph or Hooks backend, so this remains intentionally local.
  const RULES = [
  {
    "id": "side-tab",
    "name": "Side-tab accent border",
    "description": "Thick colored border on one side of a card — the most recognizable tell of AI-generated UIs. Use a subtler accent or remove it entirely.",
    "group": "slop",
    "discipline": "Visual Details"
  },
  {
    "id": "border-accent-on-rounded",
    "name": "Border accent on rounded element",
    "description": "Thick accent border on a rounded card — the border clashes with the rounded corners. Remove the border or the border-radius.",
    "group": "slop",
    "discipline": "Visual Details"
  },
  {
    "id": "overused-font",
    "name": "Overused font",
    "description": "Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, and Space Grotesk are used on so many sites they no longer feel distinctive. Each new wave of AI-generated UIs converges on the same handful of faces. Choose a face that gives your interface personality.",
    "group": "slop",
    "discipline": "Typography"
  },
  {
    "id": "flat-type-hierarchy",
    "name": "Flat type hierarchy",
    "description": "Font sizes are too close together — no clear visual hierarchy. Use fewer sizes with more contrast (aim for at least a 1.25 ratio between steps).",
    "group": "slop",
    "discipline": "Typography"
  },
  {
    "id": "gradient-text",
    "name": "Gradient text",
    "description": "Gradient text is decorative rather than meaningful — a common AI tell, especially on headings and metrics. Use solid colors for text.",
    "group": "slop",
    "discipline": "Color & Contrast"
  },
  {
    "id": "ai-color-palette",
    "name": "AI color palette",
    "description": "Purple/violet gradients and cyan-on-dark are the most recognizable tells of AI-generated UIs. Choose a distinctive, intentional palette.",
    "group": "slop",
    "discipline": "Color & Contrast"
  },
  {
    "id": "cream-palette",
    "name": "Cream / beige palette",
    "description": "A warm cream or beige page background has become the default \"tasteful\" AI surface, reached for by reflex. Choose a background that comes from a deliberate palette, not the safe warm off-white.",
    "group": "slop",
    "discipline": "Color & Contrast"
  },
  {
    "id": "nested-cards",
    "name": "Nested cards",
    "description": "Cards inside cards create visual noise and excessive depth. Flatten the hierarchy — use spacing, typography, and dividers instead of nesting containers.",
    "group": "slop",
    "discipline": "Layout & Space"
  },
  {
    "id": "monotonous-spacing",
    "name": "Monotonous spacing",
    "description": "The same spacing value used everywhere — no rhythm, no variation. Use tight groupings for related items and generous separations between sections.",
    "group": "slop",
    "discipline": "Layout & Space"
  },
  {
    "id": "bounce-easing",
    "name": "Bounce or elastic easing",
    "description": "Bounce and elastic easing feel dated and tacky. Real objects decelerate smoothly — use exponential easing (ease-out-quart/quint/expo) instead.",
    "group": "slop",
    "discipline": "Motion"
  },
  {
    "id": "pulsing-dot",
    "name": "Pulsing status dot",
    "description": "Small pulsing status dots simulate liveness decoratively. Reserve pulse animation for indicators tied to genuinely live, changing data; a static indicator with clear labeling is honest and calmer.",
    "group": "slop",
    "discipline": "Motion"
  },
  {
    "id": "blinking-cursor",
    "name": "Decorative blinking cursor",
    "description": "A blinking text cursor animated into a hero or landing section simulates typing where no input exists. It borrows the dev-tool aesthetic as decoration. Real editable fields draw their own caret; anywhere else, let the composition hold attention without a fake prompt.",
    "group": "slop",
    "discipline": "Motion"
  },
  {
    "id": "shape-assembled-illustration",
    "name": "Shape-assembled illustration",
    "description": "A large inline SVG that builds a pictorial scene from a pile of primitive shapes reads as placeholder clip art, not illustration. Icons, logos, and data graphics are fine at their scale; a hero-sized visual deserves real artwork, a photograph, or a deliberately drawn graphic.",
    "group": "slop",
    "discipline": "Imagery"
  },
  {
    "id": "dark-glow",
    "name": "Glowing shadow accents",
    "description": "Colored glow shadows — a zero-offset chromatic halo (box- or text-shadow) on any background, or any colored blurred shadow on a dark background — are the default \"cool\" look of AI-generated UIs. Use neutral elevation shadows and subtle, purposeful lighting instead.",
    "group": "slop",
    "discipline": "Color & Contrast"
  },
  {
    "id": "radial-halo",
    "name": "Radial-gradient background halo",
    "description": "A chromatic radial-gradient wash — saturated at the center, fading to transparent — used as a decorative background glow on a dark page. Same tell as glowing shadows, drawn with a gradient instead of a shadow. Ground the surface with a solid or subtly shifted background instead.",
    "group": "slop",
    "discipline": "Color & Contrast"
  },
  {
    "id": "radial-spotlight-glow",
    "name": "Decorative radial spotlight glow",
    "description": "A soft, low-opacity accent-colored radial gradient fading to transparent, dropped behind a hero or section as a \"spotlight.\" It is a reflex AI decoration — the translucent cousin of the saturated radial halo. Let the surface stand on its own, or light the composition with a deliberate material accent rather than a floating colored haze.",
    "group": "slop",
    "discipline": "Color & Contrast"
  },
  {
    "id": "marquee",
    "name": "Auto-scrolling marquee",
    "description": "Continuously auto-scrolling content demands attention it has not earned and hides half its content at any moment. Reserve motion for content that changes; let readers move at their own pace.",
    "group": "slop",
    "discipline": "Motion"
  },
  {
    "id": "icon-tile-stack",
    "name": "Icon tile stacked above heading",
    "description": "A small rounded-square icon container above a heading is the universal AI feature-card template — every generator outputs this exact shape. Try a side-by-side icon and heading, or let the icon sit in flow without its own container.",
    "group": "slop",
    "discipline": "Typography"
  },
  {
    "id": "italic-serif-display",
    "name": "Italic serif display headline",
    "description": "Oversized italic serif (Fraunces, Recoleta, Playfair, Newsreader-italic) as the primary hero headline reads as taste in isolation but has become the universal AI-startup landing page hero. Set roman, or move to a non-serif display face. Editorial / magazine register may legitimately want this — judge by context.",
    "group": "slop",
    "discipline": "Typography"
  },
  {
    "id": "hero-eyebrow-chip",
    "name": "Hero eyebrow / pill chip",
    "description": "A tiny uppercase letter-spaced label sitting immediately above an oversized hero headline — or the same shape rendered as a pill chip — is now the default AI SaaS hero. Drop the eyebrow, integrate the kicker into the headline, or run it as a navigation breadcrumb instead.",
    "group": "slop",
    "discipline": "Typography"
  },
  {
    "id": "kicker-above-heading",
    "name": "Kicker / eyebrow label above heading",
    "description": "A tiny tracked uppercase or small-caps label sitting as its own block directly above a heading is banned outright, repeated or not. Generated kickers never earn their place: the heading carries its own weight. Delete the label and let the heading speak; if the words matter, work them into the heading or the body.",
    "group": "slop",
    "discipline": "Typography"
  },
  {
    "id": "numbered-section-labels",
    "name": "Tiny numbered section labels",
    "description": "Small numeric index labels riding next to section headings, repeated section after section, are AI editorial scaffolding — a page numbering its own chapters instead of earning structure. Let hierarchy, content, and rhythm carry the sequence.",
    "group": "slop",
    "discipline": "Layout & Space"
  },
  {
    "id": "em-dash-overuse",
    "name": "Em-dash overuse",
    "description": "Em-dash saturation in body copy is an AI cadence tell. Advisory only: humans use em-dashes legitimately, so this fires only on saturation — at least 8 em-dashes (— or --) at a density near one per 500 characters of body text — never on a long article that uses a few. Prefer commas, colons, periods, or parentheses.",
    "group": "slop",
    "discipline": "Copy"
  },
  {
    "id": "marketing-buzzword",
    "name": "Marketing buzzword",
    "description": "Generic SaaS phrases (streamline / empower / supercharge / world-class / enterprise-grade / next-generation / cutting-edge / etc) are instant AI tells. Pick a specific verb and noun that says what the product literally does.",
    "group": "slop",
    "discipline": "Copy"
  },
  {
    "id": "aphoristic-cadence",
    "name": "Aphoristic-cadence copy",
    "description": "Three or more sections landing on a short rebuttal sentence (\"X. No Y.\" / \"X. Just Y.\") or a manufactured-contrast aphorism (\"Not a feature. A platform.\") reads as AI cadence, not voice. Once is fine; the pattern is the tell.",
    "group": "slop",
    "discipline": "Copy"
  },
  {
    "id": "oversized-h1",
    "name": "Oversized hero headline",
    "description": "A full-sentence headline set at display size ends up dominating the viewport, leaving no room for anything else above the fold. A punchy one- or two-word headline at that size is fine — the problem is a long headline blown up too large. Set long headlines smaller, or tighten the copy.",
    "group": "slop",
    "discipline": "Typography"
  },
  {
    "id": "extreme-negative-tracking",
    "name": "Crushed letter spacing",
    "description": "Letter-spacing pulled tighter than the point where characters keep their own shapes costs legibility. Tighten display type optically, not destructively.",
    "group": "slop",
    "discipline": "Typography"
  },
  {
    "id": "broken-image",
    "name": "Broken or placeholder image",
    "description": "<img> tags with empty src, missing src, or placeholder values ship as broken-image boxes. Use real images, generated assets, or remove the tag.",
    "group": "quality",
    "discipline": "Imagery"
  },
  {
    "id": "script-error",
    "name": "Uncaught script error on load",
    "description": "A script threw an uncaught exception or failed to parse while the page loaded. Broken JavaScript silently kills reveals, interactions, and dynamic content, and can leave most of a page invisible. Fix the error before judging anything else.",
    "group": "quality",
    "discipline": "Quality"
  },
  {
    "id": "content-hidden-at-rest",
    "name": "Content invisible at rest",
    "description": "A large share of the page text sits at opacity 0 or visibility hidden even after every reveal handler had a chance to run. This is the failed-reveal signature: the content shipped but never becomes visible. Make content visible by default and let JavaScript enhance its entrance instead of gating its existence.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "edge-flush-cards",
    "name": "Cards flush against the scroller edge",
    "description": "Cards inside a horizontal scroller or tab panel sit flush against the container edge at rest while keeping a gutter on the other side, so their edges and rounded corners get cut off. Usually the panel is sized wider than its clip box. Keep a consistent inset on both sides.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "text-occlusion",
    "name": "Text occluded by an overlapping element",
    "description": "Text is painted under an opaque element or a second text run, so part of it cannot be read. A decorative box, a stacked layer, or an inline element with leaked padding lands on the words instead of beside them. Give overlapping layers room, or move the text out from under the layer above it.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "first-viewport-column-overflow",
    "name": "One column stretches the first viewport",
    "description": "A multi-column opening section lets one column run far past the fold while its sibling fits in a single viewport, so the short column floats in dead space and the fold falls deep inside one section. Balance the columns, cap the tall one, or let the long content flow below the opening row.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "gray-on-color",
    "name": "Gray text on colored background",
    "description": "Gray text looks washed out on colored backgrounds. Use a darker shade of the background color instead, or white/near-white for contrast.",
    "group": "quality",
    "discipline": "Color & Contrast"
  },
  {
    "id": "low-contrast",
    "name": "Low contrast text",
    "description": "Text does not meet WCAG AA contrast requirements (4.5:1 for body, 3:1 for large text). Increase the contrast between text and background.",
    "group": "quality",
    "discipline": "Quality"
  },
  {
    "id": "layout-transition",
    "name": "Layout property animation",
    "description": "Animating width, height, padding, or margin causes layout thrash and janky performance. Use transform and opacity instead, or grid-template-rows for height animations.",
    "group": "quality",
    "discipline": "Motion"
  },
  {
    "id": "line-length",
    "name": "Line length too long",
    "description": "Text lines wider than ~80 characters are hard to read. The eye loses its place tracking back to the start of the next line. Add a max-width (65ch to 75ch) to text containers.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "cramped-padding",
    "name": "Cramped padding",
    "description": "Text is too close to the edge of its container. Two shapes: (1) an element with its own text where the padding is too low for the font size, and (2) a wrapper with text-bearing children and near-zero padding against a visible boundary (border, outline, or non-transparent background) — children land flush against the boundary line. Add at least 8px (ideally 12–16px) of padding inside bordered, outlined, or colored containers.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "body-text-viewport-edge",
    "name": "Body text touching viewport edge",
    "description": "Body paragraphs render flush against the left or right viewport edge with no container providing horizontal padding. Wrap content in a container with at least 16px (ideally 24-32px) of horizontal padding, or apply max-width with mx-auto.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "tight-leading",
    "name": "Tight line height",
    "description": "Line height below 1.3x the font size makes multi-line text hard to read. Use 1.5 to 1.7 for body text so lines have room to breathe.",
    "group": "quality",
    "discipline": "Typography"
  },
  {
    "id": "skipped-heading",
    "name": "Skipped heading level",
    "description": "Heading levels should not skip (e.g. h1 then h3 with no h2). Screen readers use heading hierarchy for navigation. Skipping levels breaks the document outline.",
    "group": "quality",
    "discipline": "Typography"
  },
  {
    "id": "heading-rhythm",
    "name": "Heading crowded against the previous block",
    "description": "A heading binds to the content it introduces, so the rendered space above it should exceed the space below it. When headings across a page sit as close or closer to the block above than to their own content, every section reads as if it captions the previous one. Open up the space above each heading.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "justified-text",
    "name": "Justified text",
    "description": "Justified text without hyphenation creates uneven word spacing (\"rivers of white\"). Use text-align: left for body text, or enable hyphens: auto if you must justify.",
    "group": "quality",
    "discipline": "Typography"
  },
  {
    "id": "tiny-text",
    "name": "Tiny body text",
    "description": "Body text below 12px is hard to read, especially on high-DPI screens. Use at least 14px for body content, 16px is ideal.",
    "group": "quality",
    "discipline": "Typography"
  },
  {
    "id": "undersized-ui-text",
    "name": "Undersized functional text",
    "description": "Interactive and content-bearing UI text (links, buttons, nav items, labels, table cells, meta rows, timecodes) below 11px is a legibility failure, not a style choice. WCAG sets no absolute pixel floor, but functional text under 11px is a defensible quality bar: it fails on high-DPI and small viewports and it degrades tap and read targets. The 11px floor holds even inside a footer; only non-interactive legal smallprint gets the softer 10px floor. Being ON the DESIGN.md size ramp does not exempt a value here: adding 8px to the ramp launders the token but not the legibility problem, and that is exactly the escape hatch this rule closes. Exempts sup/sub, visually-hidden (sr-only) text, and code/terminal contexts. Decorative letterspaced micro-labels are still functional and stay in scope.",
    "group": "quality",
    "discipline": "Typography"
  },
  {
    "id": "all-caps-body",
    "name": "All-caps body text",
    "description": "Long passages in uppercase are hard to read. We recognize words by shape (ascenders and descenders), which all-caps removes. Reserve uppercase for short labels and headings.",
    "group": "quality",
    "discipline": "Typography"
  },
  {
    "id": "wide-tracking",
    "name": "Wide letter spacing on body text",
    "description": "Letter spacing above 0.05em on body text disrupts natural character groupings and slows reading. Reserve wide tracking for short uppercase labels only.",
    "group": "quality",
    "discipline": "Typography"
  },
  {
    "id": "text-overflow",
    "name": "Content overflowing its container",
    "description": "Content renders wider than its container, spilling out or forcing a horizontal scrollbar. Let text wrap, constrain widths, or give the region a deliberate scroll affordance.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "repeated-container-text",
    "name": "Same text repeated inside one container",
    "description": "The same literal text rendered three or more times in structurally different spots inside a single card or panel is redundant messaging — usually a status or label wired into every slot of a template. Say it once, in the slot where it matters most.",
    "group": "quality",
    "discipline": "Quality"
  },
  {
    "id": "clipped-overflow-container",
    "name": "Positioned child clipped by overflow container",
    "description": "A clipping container (overflow hidden or clip) wrapping an absolutely-positioned child cuts off tooltips, menus, and popovers that need to escape. Let the overflow be visible, or move the positioned layer out of the clip.",
    "group": "quality",
    "discipline": "Layout & Space"
  },
  {
    "id": "design-system-font",
    "name": "Font outside DESIGN.md",
    "description": "A font is used that is not declared in DESIGN.md typography. Use the documented type system or update DESIGN.md if this is an intentional brand addition.",
    "group": "quality",
    "discipline": "Typography"
  },
  {
    "id": "design-system-color",
    "name": "Color outside DESIGN.md",
    "description": "A literal color is outside the DESIGN.md palette and sidecar tonal ramps. This may be legitimate, but it should be an intentional design-system addition rather than drift.",
    "group": "quality",
    "discipline": "Color & Contrast"
  },
  {
    "id": "design-system-radius",
    "name": "Radius outside DESIGN.md",
    "description": "A border-radius value is outside the DESIGN.md rounded scale. Use a documented radius token or update the design system if the new shape is intentional.",
    "group": "quality",
    "discipline": "Visual Details"
  },
  {
    "id": "design-system-font-size",
    "name": "Font size outside DESIGN.md",
    "description": "A literal font-size is off the type ramp documented in DESIGN.md typography. Use a documented size step or update the design system if the new step is intentional.",
    "group": "quality",
    "discipline": "Typography"
  },
  {
    "id": "gpt-thin-border-wide-shadow",
    "name": "Hairline border with wide shadow",
    "description": "A hairline border paired with a wide, diffuse shadow is a recurring generated-UI signature. Commit to one — a defined edge or a soft elevation — rather than both at once.",
    "group": "fingerprints",
    "discipline": "Visual Details"
  },
  {
    "id": "repeating-stripes-gradient",
    "name": "Repeating-gradient stripes",
    "description": "Repeating-gradient stripes used as surface decoration are a recurring generated-UI signature. Reach for a deliberate texture or leave the surface plain.",
    "group": "fingerprints",
    "discipline": "Visual Details"
  },
  {
    "id": "codex-grid-background",
    "name": "Decorative grid-line background",
    "description": "A decorative grid or line-field background drawn with hairline linear-gradient layers tiled by a fixed pixel cell is a recurring generated-UI signature. Reserve grid overlays for actual canvas, map, blueprint, or measurement surfaces; elsewhere use product structure or a plain surface.",
    "group": "fingerprints",
    "discipline": "Visual Details"
  },
  {
    "id": "theater-slop-phrase",
    "name": "Theater framing copy",
    "description": "Dismissing something as \"theater\" is a recurring generated-copy tic. Say plainly what the thing does or does not do.",
    "group": "fingerprints",
    "discipline": "Copy"
  },
  {
    "id": "image-hover-transform",
    "name": "Image hover transform",
    "description": "Scaling or rotating an image on hover is a recurring generated-UI signature. Let imagery sit still, or use a subtler, purposeful interaction.",
    "group": "slop",
    "discipline": "Motion"
  }
];

  const initialState = () => ({
    enabled: true,
    activeFamily: "fingerprints",
    disabled: ["em-dash-overuse"],
    custom: [],
  });

  const loadState = () => {
    const fallback = initialState();
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return fallback;
      return {
        enabled: parsed.enabled !== false,
        activeFamily: FAMILY_META[parsed.activeFamily] ? parsed.activeFamily : fallback.activeFamily,
        disabled: Array.isArray(parsed.disabled)
          ? parsed.disabled.filter((id) => typeof id === "string")
          : fallback.disabled,
        custom: Array.isArray(parsed.custom)
          ? parsed.custom.filter((rule) => rule && typeof rule.id === "string" && typeof rule.name === "string")
          : [],
      };
    } catch {
      return fallback;
    }
  };

  const state = loadState();
  const disabledRules = new Set(state.disabled);
  const disciplineAnimations = new WeakMap();
  const customFormAnimations = new WeakMap();
  let syncFrame = 0;

  const persist = () => {
    state.disabled = [...disabledRules];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The file:// preview may deny storage; the in-memory controls still work.
    }
  };

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const slugify = (value) => String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "custom-rule";

  const compactDescription = (value) => {
    const text = String(value).trim();
    const firstSentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
    return firstSentence || text;
  };

  const templateMarkup = () => `
    <article class="dcx-article">
      <header>
        <h2 class="dcx-title">Hooks</h2>
        <p class="dcx-lede">Checks that catch design regressions while you work.</p>
      </header>
      <section class="dcx-block" data-label="How it runs">
        <span class="dcx-block-label">How it runs</span>
        <div class="dcx-hooks-intro">
          <p class="dcx-hooks-definition">Hooks watch interface changes and surface problems before they spread.</p>
          <div class="dcx-hooks-status" data-hooks-status>
            <div class="dcx-hooks-status-copy">
              <strong data-hooks-master-copy>Enable hooks</strong>
              <p data-hooks-master-detail>Preview only — project settings are unchanged.</p>
            </div>
            <div class="dcx-hooks-status-control">
              <span class="dcx-hooks-status-state" data-hooks-master-state>On</span>
              <label class="dcx-hooks-switch dcx-hooks-switch--master">
                <input type="checkbox" role="switch" data-hooks-master aria-label="Enable design hooks">
                <span aria-hidden="true"></span>
              </label>
            </div>
          </div>
          <dl class="dcx-hooks-flow">
            <div>
              <dt>On each edit</dt>
              <dd>Checks the changed UI.</dd>
            </div>
            <div>
              <dt>At session end</dt>
              <dd>Runs a full pass on touched UI files.</dd>
            </div>
          </dl>
        </div>
      </section>
      <section class="dcx-block" data-label="Built-in rules">
        <span class="dcx-block-label">Built-in rules</span>
        <div class="dcx-hooks-browser" data-hooks-browser>
          <div class="dcx-hooks-families" role="tablist" aria-label="Rule families" data-hooks-families></div>
          <div class="dcx-hooks-rule-panel" id="dcx-hooks-rule-panel" role="tabpanel">
            <div class="dcx-hooks-toolbar">
              <label class="dcx-hooks-search">
                <input type="search" autocomplete="off" aria-label="Search rules" placeholder="Search rules" data-hooks-search>
              </label>
              <p class="dcx-hooks-summary" data-hooks-summary aria-live="polite"></p>
            </div>
            <div class="dcx-hooks-rule-groups" data-hooks-rule-groups></div>
          </div>
        </div>
      </section>
      <section class="dcx-block" data-label="Custom rules">
        <span class="dcx-block-label">Custom rules</span>
        <div class="dcx-hooks-custom" data-hooks-custom>
          <div class="dcx-hooks-custom-toolbar">
            <p data-hooks-custom-count>No custom rules.</p>
            <button class="dcx-hooks-button" type="button" data-hooks-add aria-expanded="false" aria-controls="dcx-hooks-custom-form">Add rule</button>
          </div>
          <form class="dcx-hooks-custom-form" id="dcx-hooks-custom-form" data-hooks-form hidden>
            <label>
              <span>Rule name</span>
              <input name="name" required maxlength="80" placeholder="e.g. Approved corner radius">
            </label>
            <label>
              <span>Category</span>
              <select name="discipline">
                <option>Visual Details</option>
                <option>Typography</option>
                <option>Color & Contrast</option>
                <option>Layout & Space</option>
                <option>Motion</option>
                <option>Imagery</option>
                <option>Copy</option>
              </select>
            </label>
            <label class="dcx-hooks-custom-form-description">
              <span>What should it catch?</span>
              <textarea name="description" required rows="3" maxlength="240" placeholder="Describe the condition and the correction."></textarea>
            </label>
            <div class="dcx-hooks-form-actions">
              <button class="dcx-hooks-button dcx-hooks-button--quiet" type="button" data-hooks-cancel>Cancel</button>
              <button class="dcx-hooks-button" type="submit">Save rule</button>
            </div>
          </form>
          <div class="dcx-hooks-custom-list" data-hooks-custom-list></div>
          <p class="dcx-hooks-storage-note">Preview only — saved in this browser; custom rules do not run.</p>
        </div>
      </section>
    </article>
  `;

  const renameInterfaceToHooks = () => {
    const tile = document.querySelector('.dcx-tile[data-category="interface"]');
    if (tile) {
      tile.dataset.category = "hooks";
      tile.dataset.name = "Hooks";
      tile.setAttribute("aria-label", "Open Hooks");
      const title = tile.querySelector(".dcx-tile-title");
      if (title) title.textContent = "Hooks";
    }

    const shellTemplate = document.querySelector("#dcx-shell-template");
    const navItem = shellTemplate?.content.querySelector('li[data-category="interface"]');
    const navLink = navItem?.querySelector(".dcx-nav-link");
    if (navItem && navLink) {
      navItem.dataset.category = "hooks";
      navLink.href = "#hooks";
      navLink.dataset.dcxNav = "hooks";
      navLink.textContent = "Hooks";
    }
  };

  const installTemplate = () => {
    if (document.querySelector("#dcx-detail-hooks")) return;
    const template = document.createElement("template");
    template.id = "dcx-detail-hooks";
    template.innerHTML = templateMarkup();
    document.querySelector("#dcx-detail-interface")?.after(template);
  };

  const familyRules = (family) => RULES.filter((rule) => rule.group === family);
  const isEnabled = (id) => !disabledRules.has(id);

  const revealSelectedFamily = (target) => {
    if (!MOBILE_FAMILIES.matches) return;
    const selected = target.querySelector('[data-hooks-family][aria-selected="true"]');
    if (!selected) return;

    const viewport = target.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    let delta = 0;
    if (item.left < viewport.left + 3) delta = item.left - viewport.left - 3;
    else if (item.right > viewport.right - 3) delta = item.right - viewport.right + 3;
    if (Math.abs(delta) < 1) return;
    target.scrollTo({
      left: Math.max(0, target.scrollLeft + delta),
      behavior: REDUCED_MOTION.matches ? "auto" : "smooth",
    });
  };

  const setDisciplineOpen = (details, expanded) => {
    const panel = details.querySelector(":scope > .dcx-hooks-disclosure");
    const inner = panel?.querySelector(":scope > .dcx-hooks-disclosure-inner");
    if (!panel || !inner) {
      details.open = expanded;
      return;
    }

    const previous = disciplineAnimations.get(details);
    const currentHeight = panel.getBoundingClientRect().height;
    const currentOpacity = Number.parseFloat(getComputedStyle(panel).opacity) || 0;
    previous?.cancel();

    if (REDUCED_MOTION.matches) {
      disciplineAnimations.delete(details);
      details.classList.remove("is-closing");
      details.open = expanded;
      panel.style.removeProperty("height");
      panel.style.removeProperty("opacity");
      return;
    }

    details.open = true;
    details.classList.toggle("is-closing", !expanded);
    const fromHeight = previous ? currentHeight : expanded ? 0 : currentHeight;
    const fromOpacity = previous ? currentOpacity : expanded ? 0 : 1;
    const toHeight = expanded ? inner.scrollHeight : 0;
    const toOpacity = expanded ? 1 : 0;

    const animation = panel.animate([
      { height: `${fromHeight}px`, opacity: fromOpacity },
      { height: `${toHeight}px`, opacity: toOpacity },
    ], {
      duration: 360,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    });
    disciplineAnimations.set(details, animation);

    animation.finished.then(() => {
      if (disciplineAnimations.get(details) !== animation) return;
      disciplineAnimations.delete(details);
      details.classList.remove("is-closing");
      details.open = expanded;
      animation.cancel();
      panel.style.removeProperty("height");
      panel.style.removeProperty("opacity");
    }).catch(() => {});
  };

  const setCustomFormOpen = (form, expanded) => {
    const previous = customFormAnimations.get(form);
    const currentHeight = form.hidden ? 0 : form.getBoundingClientRect().height;
    const currentOpacity = form.hidden ? 0 : Number.parseFloat(getComputedStyle(form).opacity) || 1;
    previous?.cancel();

    if (REDUCED_MOTION.matches) {
      customFormAnimations.delete(form);
      form.hidden = !expanded;
      return;
    }

    if (expanded) form.hidden = false;
    const toHeight = expanded ? form.scrollHeight : 0;
    form.style.overflow = "clip";
    const animation = form.animate([
      { height: `${currentHeight}px`, opacity: currentOpacity },
      { height: `${toHeight}px`, opacity: expanded ? 1 : 0 },
    ], {
      duration: 320,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    });
    customFormAnimations.set(form, animation);

    animation.finished.then(() => {
      if (customFormAnimations.get(form) !== animation) return;
      customFormAnimations.delete(form);
      form.hidden = !expanded;
      animation.cancel();
      form.style.removeProperty("height");
      form.style.removeProperty("opacity");
      form.style.removeProperty("overflow");
    }).catch(() => {});
  };

  const toggleDiscipline = (article, summary) => {
    const disclosure = summary.parentElement;
    const expanded = !disclosure.open || disclosure.classList.contains("is-closing");
    const query = article.querySelector("[data-hooks-search]")?.value.trim();
    if (expanded && !query) {
      disclosure.parentElement?.querySelectorAll(":scope > .dcx-hooks-discipline[open]").forEach((sibling) => {
        if (sibling !== disclosure) setDisciplineOpen(sibling, false);
      });
    }
    setDisciplineOpen(disclosure, expanded);
  };

  const renderFamilies = (article) => {
    const target = article.querySelector("[data-hooks-families]");
    if (!target) return;
    target.innerHTML = Object.entries(FAMILY_META).map(([id, meta]) => {
      const rules = familyRules(id);
      const enabled = rules.filter((rule) => isEnabled(rule.id)).length;
      const selected = state.activeFamily === id;
      return `
        <button
          id="dcx-hooks-family-${id}"
          class="dcx-hooks-family${selected ? " is-active" : ""}"
          type="button"
          role="tab"
          tabindex="${selected ? "0" : "-1"}"
          aria-selected="${selected}"
          aria-label="${escapeHtml(meta.label)}, ${enabled} of ${rules.length} selected"
          aria-controls="dcx-hooks-rule-panel"
          data-hooks-family="${id}"
        >
          <span class="dcx-hooks-family-name">${escapeHtml(meta.label)}</span>
          <span class="dcx-hooks-family-count">${enabled}/${rules.length}</span>
        </button>
      `;
    }).join("");
    const panel = article.querySelector("#dcx-hooks-rule-panel");
    panel?.setAttribute("aria-labelledby", `dcx-hooks-family-${state.activeFamily}`);
    requestAnimationFrame(() => revealSelectedFamily(target));
  };

  const renderRules = (article) => {
    const target = article.querySelector("[data-hooks-rule-groups]");
    const summary = article.querySelector("[data-hooks-summary]");
    const search = article.querySelector("[data-hooks-search]");
    if (!target || !summary) return;

    const query = (search?.value || "").trim().toLowerCase();
    const rules = familyRules(state.activeFamily);
    const filtered = rules.filter((rule) => !query
      || `${rule.id} ${rule.name} ${rule.description} ${rule.discipline}`.toLowerCase().includes(query));
    const enabled = rules.filter((rule) => isEnabled(rule.id)).length;
    summary.textContent = query
      ? `${filtered.length} matching ${filtered.length === 1 ? "rule" : "rules"}`
      : `${enabled} of ${rules.length} selected`;

    const groups = new Map();
    filtered.forEach((rule) => {
      if (!groups.has(rule.discipline)) groups.set(rule.discipline, []);
      groups.get(rule.discipline).push(rule);
    });

    const orderedGroups = [...groups.entries()].sort(([a], [b]) => {
      const ai = DISCIPLINE_ORDER.indexOf(a);
      const bi = DISCIPLINE_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
    });

    if (!orderedGroups.length) {
      target.innerHTML = '<p class="dcx-hooks-empty">No rules match this search.</p>';
      return;
    }

    target.innerHTML = orderedGroups.map(([discipline, entries], index) => {
      const disclosureId = `dcx-hooks-${state.activeFamily}-${slugify(discipline)}`;
      const summaryId = `${disclosureId}-summary`;
      return `
      <details class="dcx-hooks-discipline" ${query || index === 0 ? "open" : ""}>
        <summary id="${summaryId}">
          <span>${escapeHtml(discipline)}</span>
          <span>${entries.length}</span>
        </summary>
        <div class="dcx-hooks-disclosure" id="${disclosureId}" role="region" aria-labelledby="${summaryId}">
          <div class="dcx-hooks-disclosure-inner">
            <ul class="dcx-hooks-rules">
              ${entries.map((rule) => `
                <li class="dcx-hooks-rule" data-rule-id="${escapeHtml(rule.id)}">
                  <div class="dcx-hooks-rule-copy">
                    <strong>${escapeHtml(rule.name)}</strong>
                    <p>${escapeHtml(compactDescription(rule.description))}</p>
                  </div>
                  <label class="dcx-hooks-switch">
                    <input
                      type="checkbox"
                      role="switch"
                      data-hooks-rule="${escapeHtml(rule.id)}"
                      aria-label="Enable ${escapeHtml(rule.name)}"
                      ${isEnabled(rule.id) ? "checked" : ""}
                    >
                    <span aria-hidden="true"></span>
                  </label>
                </li>
              `).join("")}
            </ul>
          </div>
        </div>
      </details>
    `;
    }).join("");
  };

  const renderCustom = (article) => {
    const target = article.querySelector("[data-hooks-custom-list]");
    const count = article.querySelector("[data-hooks-custom-count]");
    if (!target) return;

    if (count) {
      count.textContent = state.custom.length
        ? `${state.custom.length} custom ${state.custom.length === 1 ? "rule" : "rules"}`
        : "No custom rules.";
    }

    if (!state.custom.length) {
      target.innerHTML = "";
      return;
    }

    target.innerHTML = "";
    state.custom.forEach((rule) => {
      const row = document.createElement("article");
      row.className = "dcx-hooks-custom-rule";

      const copy = document.createElement("div");
      copy.className = "dcx-hooks-rule-copy";
      const id = document.createElement("code");
      id.textContent = rule.id;
      const name = document.createElement("strong");
      name.textContent = rule.name;
      const description = document.createElement("p");
      description.textContent = rule.description;
      const discipline = document.createElement("span");
      discipline.className = "dcx-hooks-custom-discipline";
      discipline.textContent = rule.discipline;
      copy.append(id, name, description, discipline);

      const controls = document.createElement("div");
      controls.className = "dcx-hooks-custom-controls";
      const toggle = document.createElement("label");
      toggle.className = "dcx-hooks-switch";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("role", "switch");
      input.setAttribute("aria-label", `Enable ${rule.name}`);
      input.dataset.hooksCustomRule = rule.id;
      input.checked = rule.enabled !== false;
      const track = document.createElement("span");
      track.setAttribute("aria-hidden", "true");
      toggle.append(input, track);

      const remove = document.createElement("button");
      remove.className = "dcx-hooks-remove";
      remove.type = "button";
      remove.dataset.hooksRemove = rule.id;
      remove.setAttribute("aria-label", `Remove ${rule.name}`);
      remove.textContent = "Remove";
      controls.append(toggle, remove);
      row.append(copy, controls);
      target.appendChild(row);
    });
  };

  const syncMaster = (article) => {
    const input = article.querySelector("[data-hooks-master]");
    const status = article.querySelector("[data-hooks-status]");
    const copy = article.querySelector("[data-hooks-master-copy]");
    const detail = article.querySelector("[data-hooks-master-detail]");
    const stateText = article.querySelector("[data-hooks-master-state]");
    if (!input || !status || !copy || !detail || !stateText) return;

    input.checked = state.enabled;
    status.classList.toggle("is-paused", !state.enabled);
    copy.textContent = "Enable hooks";
    detail.textContent = "Preview only — project settings are unchanged.";
    stateText.textContent = state.enabled ? "On" : "Off";
  };

  const renderArticle = (article) => {
    syncMaster(article);
    renderFamilies(article);
    renderRules(article);
    renderCustom(article);
  };

  const initializeMountedArticles = () => {
    syncFrame = 0;
    document.querySelectorAll('.dcx-article[data-dcx-category="hooks"]').forEach((article) => {
      if (article.dataset.dcxHooksReady === "true") return;
      article.dataset.dcxHooksReady = "true";
      renderArticle(article);
    });
  };

  const scheduleSync = () => {
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(initializeMountedArticles);
  };

  document.addEventListener("click", (event) => {
    const article = event.target.closest('.dcx-article[data-dcx-category="hooks"]');
    if (!article) return;

    const summary = event.target.closest(".dcx-hooks-discipline > summary");
    if (summary) {
      event.preventDefault();
      toggleDiscipline(article, summary);
      return;
    }

    const family = event.target.closest("[data-hooks-family]");
    if (family) {
      const restoreFocus = family === document.activeElement;
      state.activeFamily = family.dataset.hooksFamily;
      persist();
      renderFamilies(article);
      renderRules(article);
      if (restoreFocus) {
        article.querySelector(`[data-hooks-family="${state.activeFamily}"]`)?.focus({ preventScroll: true });
      }
      return;
    }

    const add = event.target.closest("[data-hooks-add]");
    if (add) {
      const form = article.querySelector("[data-hooks-form]");
      if (!form) return;
      setCustomFormOpen(form, true);
      add.setAttribute("aria-expanded", "true");
      form.querySelector("input[name='name']")?.focus();
      return;
    }

    const cancel = event.target.closest("[data-hooks-cancel]");
    if (cancel) {
      const form = article.querySelector("[data-hooks-form]");
      form?.reset();
      if (form) setCustomFormOpen(form, false);
      const addButton = article.querySelector("[data-hooks-add]");
      addButton?.setAttribute("aria-expanded", "false");
      addButton?.focus({ preventScroll: true });
      return;
    }

    const remove = event.target.closest("[data-hooks-remove]");
    if (remove) {
      state.custom = state.custom.filter((rule) => rule.id !== remove.dataset.hooksRemove);
      persist();
      renderCustom(article);
      (article.querySelector("[data-hooks-remove]") || article.querySelector("[data-hooks-add]"))
        ?.focus({ preventScroll: true });
    }
  });

  document.addEventListener("input", (event) => {
    if (!event.target.matches("[data-hooks-search]")) return;
    const article = event.target.closest('.dcx-article[data-dcx-category="hooks"]');
    if (article) renderRules(article);
  });

  document.addEventListener("keydown", (event) => {
    const summary = event.target.closest(".dcx-hooks-discipline > summary");
    if (summary && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!event.repeat) {
        const article = summary.closest('.dcx-article[data-dcx-category="hooks"]');
        if (article) toggleDiscipline(article, summary);
      }
      return;
    }

    const family = event.target.closest("[data-hooks-family]");
    if (!family || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const article = family.closest('.dcx-article[data-dcx-category="hooks"]');
    const buttons = [...article.querySelectorAll("[data-hooks-family]")];
    const index = buttons.indexOf(family);
    if (index < 0) return;

    event.preventDefault();
    const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (index + direction + buttons.length) % buttons.length;
    buttons[nextIndex].click();
    article.querySelector(`[data-hooks-family="${state.activeFamily}"]`)?.focus();
  });

  document.addEventListener("change", (event) => {
    const article = event.target.closest('.dcx-article[data-dcx-category="hooks"]');
    if (!article) return;

    if (event.target.matches("[data-hooks-master]")) {
      state.enabled = event.target.checked;
      persist();
      syncMaster(article);
      return;
    }

    if (event.target.matches("[data-hooks-rule]")) {
      if (event.target.checked) disabledRules.delete(event.target.dataset.hooksRule);
      else disabledRules.add(event.target.dataset.hooksRule);
      persist();
      renderFamilies(article);
      const query = article.querySelector("[data-hooks-search]")?.value.trim();
      const summary = article.querySelector("[data-hooks-summary]");
      if (!query && summary) {
        const rules = familyRules(state.activeFamily);
        summary.textContent = `${rules.filter((rule) => isEnabled(rule.id)).length} of ${rules.length} selected`;
      }
      return;
    }

    if (event.target.matches("[data-hooks-custom-rule]")) {
      const rule = state.custom.find((entry) => entry.id === event.target.dataset.hooksCustomRule);
      if (rule) {
        rule.enabled = event.target.checked;
        persist();
      }
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-hooks-form]");
    if (!form) return;
    event.preventDefault();
    const article = form.closest('.dcx-article[data-dcx-category="hooks"]');
    if (!article) return;

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const description = String(data.get("description") || "").trim();
    const discipline = String(data.get("discipline") || "Visual Details");
    if (!name || !description) return;

    const base = slugify(name);
    let id = base;
    let suffix = 2;
    const existing = new Set([...RULES.map((rule) => rule.id), ...state.custom.map((rule) => rule.id)]);
    while (existing.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }

    state.custom.push({ id, name, description, discipline, enabled: true });
    persist();
    form.reset();
    setCustomFormOpen(form, false);
    const addButton = article.querySelector("[data-hooks-add]");
    addButton?.setAttribute("aria-expanded", "false");
    renderCustom(article);
    addButton?.focus({ preventScroll: true });
  });

  renameInterfaceToHooks();
  installTemplate();

  const observer = new MutationObserver(scheduleSync);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("pageshow", scheduleSync);
  scheduleSync();
})();

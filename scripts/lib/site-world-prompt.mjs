// The instructions that turn a real page into a world.
//
// There are five, deliberately, because seven rounds of tuning one prompt kept
// trading one failure for another. A page whose whole idea is a centred sentence
// wants a different treatment from a page that lives on a shader, and a single
// instruction that handles both handles neither well. So each candidate is drawn
// five times under five points of view and a human picks, which is the same
// answer this project already reached for card variants.
//
// The revisions behind the shared parts, so none is undone by accident:
//
//   1. Prose in the middle lost the source entirely.
//   2. "Keep the chrome, KEEP THE COMPOSITION" produced reskins carrying the
//      source's own logo.
//   3. Forbidding the signature device made it fall back on a stock hero, which
//      is worse than a copy.
//   4. Describing one device in detail made nine of twelve worlds copy it.
//   5. Calling that device a failure banned a move that was right for its page.
//   6. "The illustration idiom" put drawn figures onto photographic sources.
//   7. Banning cream grounds sent a pale reference back as near-black.
//
// Every ban is phrased against the HABIT rather than the technique, because 5
// and 7 were both caused by barring a move instead of barring arriving at it
// without looking.

// Read off the reference and matched by every strategy. This is the part that is
// not a matter of taste: if the ground, the voice and the medium are wrong, no
// strategy produces something worth reviewing.
function fidelityBlock(sourceDensity) {
  const density = sourceDensity === null ? '' : `

5. HOW FULL THE PAGE IS. Detail covers about ${sourceDensity}% of the reference frame, counting type, images and anything that is not bare ground. Come out within a few points of that.${sourceDensity < 25 ? ` At ${sourceDensity}% this reference is SPARSE, and this is the hardest line here to obey: an almost-empty frame reads as unfinished, and earlier runs answered that feeling by adding an illustration or a row of cards, landing 15 to 20 points denser and losing the quality that made the page worth looking at. A page this sparse is often sparse because it lives on motion, so a still of it is supposed to look empty. Do not compensate.` : ''}`;

  return `FIRST, READ THESE OFF THE REFERENCE. They are fidelity, not taste, and every one of them is wrong by default.

1. GROUND AND PALETTE. What colour is the page itself, how light or dark, how warm or cool? Match it. A pale cool page stays pale and cool, a near-black page stays near-black, a saturated single-hue page keeps its hue. Re-cast the ACCENTS rather than sampling them exactly. The GROUND is not where you are inventive: if the reference is near-white and yours comes back dark, it failed before anything else is judged.

2. TYPE VOICE. Grotesk, geometric sans, high-contrast serif, slab, mono, script? Which weights, what case, how tight? Use different faces to speak in the same voice. A reference set in a geometric sans does not become a serif page.

3. IMAGERY MEDIUM, before any question of style. Studio photography, documentary photography, product shots, 3D render, video stills, archival or scanned material, collage of real objects, line drawing, flat vector, interface screenshots, or none at all? Carry that answer. A source that photographs its subject gives a world that photographs its subject. Only once the source is established as drawn does the hand matter, and then it matters completely.

4. WHAT THE FIRST VIEWPORT HOLDS. Count it: how many pieces of copy, how many controls, how many images. Furniture the source does without is furniture you do without.${density}`;
}

const NEVER = `TWO THINGS THAT ARE NEVER RIGHT, whatever the strategy:

- An italic accent word: one or two words of an upright headline dropped into italic for emphasis. It is among the clearest marks of machine-made design. A whole line set in an italic or script cut is a different thing and is fine when the reference works that way.
- Warm paper under an elegant high-contrast serif, arrived at WITHOUT the reference asking for it. The failure is arriving there by habit, not the use of a light ground. If the reference is pale, be pale.`;

const RENDER = `Render as a complete desktop page filling the whole 16:9 frame, as if screenshotted at 1440 wide, showing the top of the page and cut off mid-element at the bottom edge because more of it exists below. No browser chrome, no device mockup. Interface copy in English, plain punctuation, never an em dash.`;

// Five points of view. They differ in how much of the source's ARRANGEMENT and
// DEVICE they carry, which is the axis that actually changes the result; they do
// not differ in fidelity to ground, voice and medium, because nothing good comes
// from getting those wrong.
export const STRATEGIES = {
  // The earliest version, which produced several of the best worlds before it
  // was tuned away. It is nearest the line, so it is also the one that produces
  // a reskin when it fails; kept because when it lands it lands hardest.
  close: {
    label: 'Close transfer',
    note: 'Carries the arrangement and the system tightly. Best results and the reskin risk both live here.',
    body: `NOW MAKE THE PAGE. Carry the reference's arrangement closely: where the headline sits, how much frame it takes, where imagery enters, what the eye does first and second. Someone who knows the reference should recognise the family instantly.

Three things are still yours and must be: the MARK, which shares no silhouette with theirs and may simply be a wordmark set in type; the COPY and subject, wholly new; and the SIGNATURE DEVICE, whose mechanism you inherit but whose execution you invent. Name what their device does structurally, then do that structural thing another way.

Do not reproduce their logo, their exact chrome, or their palette sampled hex for hex.`,
  },

  // Fidelity in one place, invention in another. The seventh revision.
  vocabulary: {
    label: 'Vocabulary transfer',
    note: 'Matches ground, voice, medium and arrangement archetype; reinvents mark, chrome, device and balance.',
    body: `NOW MAKE THE PAGE. Work out which arrangement the reference uses and use the same one:
  (a) TYPE IS THE LAYOUT: one sentence at enormous size holds the frame, the first viewport carries little else, often no image column and no button. How type and image relate inside it is read off the source, never assumed.
  (b) A SPLIT: copy one side, imagery the other.
  (c) A SCENE: one continuous field or photograph with copy laid over it.
  (d) A STACK: bands read in sequence down the frame.
A text column left with a picture right is (b), it is what this task reaches for by default, and it is right only when the reference does it.

Everything else is yours and must differ: the mark, the chrome, the balance within the arrangement, and the signature device, whose mechanism you inherit and whose execution you invent. Dropping the device is worse than copying it, because dropping it means falling back on the default.`,
  },

  // For pages whose whole identity is one property. Deliberately lets go of
  // everything else, which is how it finds compositions the others never reach.
  amplify: {
    label: 'Signature amplified',
    note: 'Finds the single most distinctive property and builds the whole page on it, letting the rest go.',
    body: `NOW MAKE THE PAGE, and make it about one thing. Find the single most distinctive property of the reference: it might be a scale relationship, a colour doing something unusual, a way type and image collide, an emptiness, a density, a material. Name it to yourself, then build an entire page whose reason for existing is that one property, pushed further than the reference pushes it.

Let the rest go. You are not carrying their chrome, their arrangement or their device; you are carrying their best idea and giving it more room than they did. The result should look like what a designer makes the day after seeing that page, when only one thing has stayed with them.

Their mark, copy and specific imagery are still theirs and stay out.`,
  },

  // Palette, voice, medium, density, and nothing else. The most likely to be
  // fresh and the most likely to lose the reference entirely.
  register: {
    label: 'Register only',
    note: 'Carries the atmosphere and materials, invents the whole page. Freshest, and the likeliest to lose the source.',
    body: `NOW MAKE THE PAGE FROM SCRATCH. You are keeping the reference's atmosphere and nothing structural: its ground and palette, its type voice, its imagery medium, its density, how loud or quiet it is, how much air it allows.

Compose the page as though the reference had never existed. Different arrangement, different devices, different rhythm. The test is that the two pages would sit together in a mood board without either looking like a copy of the other, and that a reader could not reconstruct the reference from yours.`,
  },

  // Anchors on an interior section. Several sources put their whole idea below
  // the fold, and every other strategy reads the top of the page hardest.
  interior: {
    label: 'From the interior',
    note: 'Builds the page from the most interesting section rather than the hero. For sites whose idea lives below the fold.',
    body: `NOW MAKE THE PAGE, and take your cue from the most interesting part of the reference rather than its opening. Look past the hero: the section with the strongest idea in it, wherever it sits, is the one to build from. Many pages spend their opening on a title and put their actual design further down.

Turn that section's thinking into a landing page. Its grid, its relationship between type and image, its rhythm, become the top of yours. The mark, chrome and copy are yours to invent, and the device follows the same rule as everywhere: inherit the mechanism, invent the execution.`,
  },
};

export const STRATEGY_IDS = Object.keys(STRATEGIES);

export function buildWorldPrompt({
  isEntry = false, subject = null, sourceDensity = null, strategy = 'vocabulary',
} = {}) {
  const chosen = STRATEGIES[strategy];
  if (!chosen) throw new Error(`unknown strategy "${strategy}"; expected one of ${STRATEGY_IDS.join(', ')}`);

  const entryNote = isEntry
    ? '\nThese captures may sit on a backdrop or inside a device mockup, and they show several sections rather than one continuous page. Read only the interface; the frame, the shadow and the surface it rests on are presentation, not design.\n'
    : '';

  return `The attached images are ${isEntry ? "the designer's own captures of one website, taken from an awards submission" : 'screenshots of one website'}. Read them the way a designer reads a reference: not as a page to reproduce, but as something to learn from.
${entryNote}
The product is different${subject ? `: ${subject}` : ''}. New subject, new copy, new imagery, new brand.

${fidelityBlock(sourceDensity)}

${chosen.body}

${NEVER}

THE TEST. Two designers shown both pages should say the same influences, the same shelf of references, the same year. They must never say the same studio, and never the same site with different words in it.

${RENDER}`;
}

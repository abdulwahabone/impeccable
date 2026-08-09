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

6. HOW FULL THE PAGE IS. Detail covers about ${sourceDensity}% of the reference frame, counting type, images and anything that is not bare ground. Come out within a few points of that.${sourceDensity < 25 ? ` At ${sourceDensity}% this reference is SPARSE, and it is the hardest line here to obey: an almost-empty frame reads as unfinished, and earlier runs answered that by adding imagery or a row of cards and landed 15 to 20 points denser. A page this sparse often lives on motion, so a still of it is supposed to look empty. Do not compensate.` : ''}`;

  return `FIRST, MEASURE THESE OFF THE REFERENCE. They are fidelity, not taste, and every one of them is wrong by default.

1. GROUND. What fills the frame edge to edge, and what share of it. Measure the pixels, not a container's background. A saturated field that owns the whole frame there owns the whole frame here. Match lightness, temperature and saturation, and re-cast the accent hues rather than sampling them. A vivid reference returning pale, its colour reduced to small parts, is the commonest failure here.

2. HOW MANY REGIONS. Count what the OPENING FRAME divides into, and the largest one's share. Only that frame answers this. The frames after it are sections from the middle of the page, and an opening read off them is a middle served as a top. One region stays one region: do not split a frame the reference left whole, and do not add a band of something else beneath to fill the page out. Count the pieces of copy, the controls and the images too. Furniture the source does without is furniture you do without.

3. WHAT TOUCHES WHAT, which is what gets lost most often. Take each pair of things in the opening and name the verb between them: crosses, lies over, is cut by, runs behind, sits within, runs off an edge and which edge. Those verbs are the design more than the things they join. Carry every one, using your own objects. Separate clear rectangles that never meet is one specific answer among many, right only when the reference is that, and also what gets drawn when the pairs were never read.

4. TYPE VOICE. Grotesk, geometric, high-contrast serif, slab, mono, script; which weights, what case, how tight. Different faces, the same voice.

5. WHAT THE PICTURES ARE MADE OF. Photograph, render, scan, print, collage, hand drawing, flat vector, interface screenshot, or nothing at all. Carry that answer in both directions: photographic stays photographic, drawn or vector comes back drawn or vector. Putting a photograph in its place fails, and so does leaving the imagery out because it is harder to make. No imagery in the reference means none here.${density}`;
}


// The two bans ride at the very end rather than in the middle. Stated mid-prompt
// they were skimmed past: one of five strategies still returned an italicised
// accent word on a run where the ban was two paragraphs above. Last read is the
// other position a model weights heavily, and this is a hard constraint rather
// than a consideration.
const RENDER = `Render as a complete desktop page filling the whole 16:9 frame, as if screenshotted at 1440 wide, showing the top of the page. The bottom edge falls wherever the opening reaches: it cuts through the opening while the opening is still going, and shows the start of what follows only once the opening has ended on its own. Never end the opening early to get something under it. No browser chrome, no device mockup. Interface copy in English, plain punctuation, never an em dash.

LAST, AND THESE OVERRIDE EVERYTHING ABOVE:
- Do NOT set one or two words of an upright headline in italic for emphasis. Not one word. A whole line in an italic or script cut is fine when the reference works that way; a single italicised word inside an upright line is not, on any strategy, for any reference.
- Do NOT arrive at warm paper under an elegant high-contrast serif unless the reference plainly is that. The failure is arriving there by habit, not the use of a light ground.`;

// Five points of view. They differ in how much of the source's ARRANGEMENT and
// DEVICE they carry, which is the axis that actually changes the result; they do
// not differ in fidelity to ground, voice and medium, because nothing good comes
// from getting those wrong.
export const STRATEGIES = {
  // Nearest the line, and the one that produced several of the best worlds.
  close: {
    label: 'Close transfer',
    note: 'Carries the arrangement as measurement: proportion, alignment, cropping. Best results and the reskin risk both live here.',
    body: `NOW MAKE THE PAGE. Carry the arrangement as measurement rather than impression. Before drawing, read off the reference: which element is largest and what share of the frame it takes, what is centred and what is offset, what runs off an edge and which edge, what sits over what, how far down the frame the opening section reaches. Match those readings. Where the reference holds a symmetry, hold it to the same precision; where it cuts something off at the frame edge, cut yours at that same edge rather than floating it safely inside.

Scale and count too. If the reference gives the first screen to one thing, yours does, at the size the reference gives it. Do not shrink the opening to make room for more underneath. A page you would have to scroll to understand is the right answer here.

Colour, texture and light carry at full strength. Recast the accent hues, then keep the reference's saturation and the share of the frame that colour covers. A loud page comes back loud.

Three things are yours and must be: the MARK, which shares no silhouette with theirs; the COPY and subject, wholly new; and the SIGNATURE DEVICE, whose mechanism you inherit and whose execution you invent. Name what their device does structurally, then do that structural thing with your own subject and your own objects. Their logo, their chrome, their assets and their palette sampled hex for hex stay theirs.`,
  },

  // The middle position: same arrangement archetype, everything else rebuilt.
  vocabulary: {
    label: 'Vocabulary transfer',
    note: 'Matches the arrangement archetype and the system; reinvents mark, chrome, device execution and balance.',
    body: `NOW MAKE THE PAGE. Settle the arrangement first, because the wrong one is this strategy's usual failure. Look at what the reference's opening viewport actually is: type holding the frame nearly alone, a split of copy against imagery, one continuous field or picture running edge to edge with copy sitting on it, or bands stacked down the page. Decide which, then build that one. If the reference gives its whole opening to a single image or scene, yours does too, at that size, bleeding off the same edges. Copy left with a picture right is one option among several and it is the one this task reaches for when it stops looking. Adding a row of small supporting items below the hero is the same reflex.

Everything else is yours and must differ: the mark, the chrome down to its smallest furniture, and the balance inside the arrangement. Their signature move you inherit at the level of mechanism and rebuild in your own execution, placed at a different scale or in a different part of the frame than they placed it. Dropping it is worse than copying it, because dropping it means falling back on the default.

Carry the colour at full strength. Re-casting an accent means moving its hue, never lowering its saturation, and it covers as much of your frame as theirs covers of the reference. Grain, texture and light belong to the vocabulary too. A vivid reference that comes back muted has failed whatever else is right.`,
  },

  // One property, taken further than the reference took it.
  amplify: {
    label: 'Signature amplified',
    note: "Finds the one property that survives a thumbnail and gives the page to it. The reviewer's favourite remit.",
    body: `NOW MAKE THE PAGE, AND MAKE IT ABOUT ONE THING.

Find the reference's single most distinctive property. Two tests decide whether you have the right one. It must survive a thumbnail: shrink the reference until no type is readable and the property is still the first thing you see. And you must be able to state it in one sentence that uses no noun from their subject, because what transfers is a structural relationship, not their content. If the sentence needs their subject, you have taken what the page is about instead of what it does, and you will draw their picture. A bare attribute is not an answer yet: push until the sentence says what occupies the frame, in what proportion, and against what.

Build a page whose only reason for existing is that property, carried further than the reference carries it, by an amount you could measure: more of the frame surrendered to it, a more extreme ratio, a more saturated commitment, twice where they did it once. If the property is an absence, the page holds less, not more. Half measures read as timidity, and timidity is the failure here.

Letting the rest go means handing that space to the property. It does not mean the furniture that arrives when nothing has been decided: nav, headline, paragraph, two buttons, a row of small features. The first-viewport count is a ceiling now rather than a target. If the property has taken the frame, there is nothing left to place, and that is correct.

Their mark, copy and specific imagery stay theirs.`,
  },

  // Atmosphere and materials only. The page is invented.
  register: {
    label: 'Register only',
    note: 'Carries intensity, surface and volume, and invents the page. Where atmosphere is meant to survive.',
    body: `NOW MAKE THE PAGE FROM SCRATCH. Keep the reference's atmosphere and nothing structural. Compose as though it had never existed: different arrangement, different devices, different rhythm.

Atmosphere is not the materials, it is their intensity, and intensity is what gets lost.

HOW MUCH COLOUR, not which. Estimate what share of the frame is saturated rather than neutral, and land within a few points of it. Colour surviving only in a button or a label means you kept the hue and threw the world away. Match the strongest colour's intensity, never a step to the calmer side of it.

SURFACE. Grain, tooth, print, noise, compression, gloss, or none. A clean flat surface is what gets drawn when nobody looked. Make it a decision.

VOLUME. A loud reference stays loud, a quiet one stays quiet. Restraint on a shouting page misses by as much as noise on a still one.

Whatever its pictures are made of, yours are made of the same stuff under the same light at the same intensity. The failure is rarely the wrong medium, it is the right medium with the light and colour drained out.

Where this lands when it stops reading: pale neutral ground, dark sans headline left, soft photograph right, small line icons beneath, one colour left in a button. It has arrived there from references holding none of it.

THE TEST: both pages give the same feeling in the first second, sit together on a mood board, and neither can be rebuilt from the other.`,
  },

  // For sites whose real design is below the fold, and for stills of motion.
  interior: {
    label: 'From the interior',
    note: 'Picks the strongest frame rather than the first, and composes a moment rather than completing it into a hero.',
    body: `NOW MAKE THE PAGE FROM THE STRONGEST FRAME, NOT THE FIRST ONE.

The attachments run down one page. Before you draw, decide which single frame carries the most design: the boldest colour, the largest scale, the hardest crop to make. Often it is not the opening, because many pages spend the opening on a title. If it is not the first attachment, treat that frame as the reference and the others as context. If nothing beats the opening, the opening is the answer, and reading it harder than the others do is the job.

Then be careful what you take. Most of a page's interior is the part every site has, in the same order, for the same reasons. Passing over the hero and landing there is the habit to avoid. The section worth having is the one no other site could have run.

Build the top of your page out of that frame's thinking: its scale, its cropping, its grid, how type and image sit against each other, and above all its COLOUR. If the page keeps its loudest colour down here rather than in the hero, that is the page's colour, and yours comes back as saturated as that.

A frame of a page that moves shows one moment: subject off centre, forms running past both edges, a field with no layout on it. That is the design, not an unfinished page. Compose yours as a moment too. Do not complete it into a hero.

Mark, chrome and copy are yours. Inherit their device's mechanism, invent its execution.`,
  },

};
export const STRATEGY_IDS = Object.keys(STRATEGIES);

export function buildWorldPrompt({
  isEntry = false, subject = null, sourceDensity = null, strategy = 'vocabulary',
  leadsWithInterior = false,
} = {}) {
  const chosen = STRATEGIES[strategy];
  if (!chosen) throw new Error(`unknown strategy "${strategy}"; expected one of ${STRATEGY_IDS.join(', ')}`);

  const entryNote = isEntry
    ? '\nThese captures may sit on a backdrop or inside a device mockup, and they show several sections rather than one continuous page. Read only the interface; the frame, the shadow and the surface it rests on are presentation, not design.\n'
    : '';

  // Every fidelity item that says "the opening" was unresolved until now: the
  // model receives three to five frames with equal weight and nothing saying
  // which is the top. On an art-directed site the interior frames are
  // conventional by definition, so the hero was outvoted three to one, and the
  // outputs matched the interior rather than the opening in 60% of the cases
  // where the two differ.
  const attachments = isEntry
    ? "the designer's own captures of one website, taken from an awards submission"
    : leadsWithInterior
      ? 'screenshots of one website; the first attachment is a section from further down, taken because the top of the page is nearly empty, and the rest run in page order from the top'
      : 'screenshots of one website, in order down the page: the first is the opening screen, the rest are sections below it';

  return `The attached images are ${attachments}. Read them the way a designer reads a reference: not as a page to reproduce, but as something to learn from.
${entryNote}
The product is different${subject ? `: ${subject}` : ''}. New subject, new copy, new imagery, new brand.

${fidelityBlock(sourceDensity)}

${chosen.body}


THE TEST. Two designers shown both pages should say the same influences, the same shelf of references, the same year. They must never say the same studio, and never the same site with different words in it.

${RENDER}`;
}

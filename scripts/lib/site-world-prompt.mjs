// The instruction that turns a real page into a world.
//
// It lives in its own file because it has been revised seven times and each
// revision was a lesson, and because at ten thousand characters it had stopped
// being readable inside the script that sends it.
//
// The revisions, in order, so none of them is undone by accident:
//
//   1. Prose in the middle lost the source entirely.
//   2. "Keep the chrome, KEEP THE COMPOSITION" produced reskins carrying the
//      source's own logo.
//   3. Forbidding the signature device made it fall back on a stock hero, which
//      is worse than a copy.
//   4. Describing one device in detail made nine of twelve worlds copy it.
//   5. Calling that device a failure banned a move that was right for the page
//      it came from.
//   6. "The illustration idiom" put drawn figures onto photographic sources.
//   7. Banning cream grounds sent a pale reference back as near-black.
//
// The shape that survives all seven: fidelity first and in one place, invention
// second and in one place, and the short list of things that are never right
// kept short so it cannot swamp the reading. Every ban is phrased against the
// HABIT rather than against the technique, because five and seven were both
// caused by barring a move instead of barring arriving at it without looking.

export function buildWorldPrompt({ isEntry = false, subject = null, sourceDensity = null } = {}) {
  const entryNote = isEntry
    ? '\nThese captures may sit on a backdrop or inside a device mockup, and they show several sections rather than one continuous page. Read only the interface; the frame, the shadow and the surface it rests on are presentation, not design.\n'
    : '';

  const density = sourceDensity === null ? '' : [
    '',
    `5. HOW FULL THE PAGE IS. Detail covers about ${sourceDensity}% of the reference's first viewport, counting type, images and anything that is not bare ground. Come out within a few points of that.`,
    sourceDensity < 25
      ? ` At ${sourceDensity}% this reference is SPARSE, and this is the hardest line here to obey: an almost-empty frame reads as unfinished, and every earlier run answered that feeling by adding an illustration or a row of cards, landing 15 to 20 points denser and losing the quality that made the page worth looking at. A page this sparse is often sparse because it lives on motion, so a still of it is supposed to look empty. Do not compensate.`
      : '',
  ].join('');

  return `The attached images are ${isEntry ? "the designer's own captures of one website, taken from an awards submission" : 'screenshots of one website'}. Read them the way a designer reads a reference: not as a page to reproduce, but as a vocabulary to learn. Then design something else with that vocabulary.
${entryNote}
The product is different${subject ? `: ${subject}` : ''}. New subject, new copy, new imagery, new brand.

=== PART ONE: READ THESE OFF THE REFERENCE AND MATCH THEM ===

All of Part One is fidelity. Get it wrong and nothing in Part Two can save the page.

1. GROUND AND PALETTE. What colour is the page itself, how light or dark, how warm or cool? Match it. A pale cool page stays pale and cool, a near-black page stays near-black, a saturated single-hue page keeps its hue. Re-cast the ACCENTS rather than sampling them exactly, shifting within the same family or promoting a secondary, so the palettes are unmistakably related without being identical. The GROUND is not where you are inventive: if the reference is a near-white page and yours comes back dark, it has failed before anything else is judged.

2. TYPE VOICE. Grotesk, geometric sans, high-contrast serif, slab, mono, script? Which weights, what case, how tight? Use different faces to speak in the same voice. A reference set in a geometric sans does not become a serif page.

3. IMAGERY MEDIUM, before any question of style. What KIND of picture does the reference use: studio photography, documentary photography, product shots, 3D render, video stills, archival or scanned material, collage of real objects, line drawing, flat vector, interface screenshots, or none at all? Carry that answer. A source that photographs its subject gives a world that photographs its subject. Only once the source is established as drawn does the hand matter, and then it matters completely: line weight, energy, whether figures are mid-action or posed, whether props scatter at several scales.

4. ARRANGEMENT. Work out which of these the reference uses, then use the same one. The invention goes into Part Two, not here.
   (a) TYPE IS THE LAYOUT: one sentence at enormous size holds the frame and the first viewport carries little else, often no image column, no paragraph and no button. How type and image relate inside it is read off the source, never assumed.
   (b) A SPLIT: copy on one side, imagery on the other.
   (c) A SCENE: one continuous field or photograph with the copy laid over it.
   (d) A STACK: bands or panels read in sequence down the frame.
   Match the inventory as well as the shape. Count what the reference's first viewport actually holds and hold the same: furniture the source does without is furniture you do without. A text column on the left with a picture on the right is (b), it is the answer this task reaches for by default, and it is right only when the reference does it.${density}

=== PART TWO: MAKE IT YOURS ===

All of Part Two must differ, because these are what turn an influence into a copy.

- THE MARK. Invent one sharing no silhouette with theirs, or set a wordmark in type and nothing else.
- THE CHROME. A different nav position and structure, a different number of items, a different call to action. If the reference puts a labelled button with an arrow at top right, yours must not.
- THE SIGNATURE DEVICE. Every distinctive page has one trick more identifying than anything else. Do not reproduce it. Do not simply drop it either, because dropping it means falling back on the default arrangement, and that is a worse answer than a copy. What you inherit is the MECHANISM, not the execution: name what the device does structurally, then do that same structural thing another way. No example is given here on purpose. An earlier version of this prompt described one, and nine of twelve worlds in a row copied it whatever their source had done. The device comes from the reference in front of you and from nowhere else.
- THE BALANCE WITHIN THE ARRANGEMENT. Same archetype as Part One, your own content and your own composition inside it.

=== TWO THINGS THAT ARE NEVER RIGHT ===

- An italic accent word: one or two words of an upright headline dropped into italic for emphasis. It is among the clearest marks of machine-made design. A whole line set in an italic or script cut is a different thing and is fine when the reference works that way.
- Warm paper under an elegant high-contrast serif, arrived at WITHOUT the reference asking for it. This is the look this task falls into when it stops reading. Read that carefully: the failure is arriving there by habit, not the use of a light ground. If the reference is pale, be pale. Rule 1 decides.

=== THE TEST ===

Two designers shown both pages should say the same influences, the same shelf of references, the same year. They must never say the same studio, and never the same site with different words in it. And if you could have drawn your page without looking at the reference at all, you drew the wrong page: the reference decides the ground, the voice, the medium, the arrangement and the density. If the reference is loud, ugly, technical, cold or plain, so is the world.

Render as a complete desktop page filling the whole 16:9 frame, as if screenshotted at 1440 wide, showing the top of the page and cut off mid-element at the bottom edge because more of it exists below. No browser chrome, no device mockup. Interface copy in English, plain punctuation, never an em dash.`;
}

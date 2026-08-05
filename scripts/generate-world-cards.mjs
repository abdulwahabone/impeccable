#!/usr/bin/env node
/**
 * Generate design-system translation cards for the concept world catalog.
 *
 * Each card renders one world as the web design system it implies: palette
 * swatches and material chips, a type specimen, core UI components, and one
 * small screen composition. The prompt is built from the concept's authored
 * Palette/material and Type/composition rules, so the card tests exactly the
 * translation the catalog claims.
 *
 * Output: site/public/worlds/cards/<concept-id>.webp (16:9, 1K, WebP) plus
 * manifest.json mapping id -> { hash, generatedAt }. hash is the concept's
 * content hash (same fingerprint reviews pin), so an edited concept marks its
 * card stale and a rerun regenerates only what changed.
 *
 * Three image kinds per concept. The docs render exists because the hero is a
 * landing page, so a world reviewed only on its hero is judged on how well it
 * persuades and then dealt to read builds nobody ever saw it serve. A 54-world
 * audit of the read pool found four worlds that had to be cut, and the four
 * were invisible from the hero and the form line alike.
 *
 * Two image kinds per concept:
 *   board (<id>.webp): the design-system specimen sheet (palette, type,
 *     components, phone composition).
 *   hero (<id>-hero.webp): a full-frame desktop landing page composed in the
 *     world's system; the 16:9 frame IS the viewport, proving the world holds
 *     at desktop scale.
 *
 * Usage:
 *   node scripts/generate-world-cards.mjs                    # all stale/missing
 *   node scripts/generate-world-cards.mjs --kind hero        # board | hero | both
 *   node scripts/generate-world-cards.mjs --only <id[,id]>   # specific concepts
 *   node scripts/generate-world-cards.mjs --limit 5          # first N stale jobs
 *   node scripts/generate-world-cards.mjs --force            # ignore manifest
 *   node scripts/generate-world-cards.mjs --model pro        # lite | pro | gpt
 *   node scripts/generate-world-cards.mjs --out <dir>        # alternate output dir
 */

import { GoogleGenAI } from '@google/genai';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { conceptContentHash, readConceptCatalog } from '../skill/scripts/lib/concept-catalog.mjs';
import { compositionContentHash, readCompositionCatalog } from '../skill/scripts/lib/composition-catalog.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CARD_DIR = join(ROOT, 'site', 'public', 'worlds', 'cards');
// gpt (the default) won the human calibration bake-off decisively; lite and
// pro remain for future comparisons.
const MODELS = {
  lite: { kind: 'gemini', id: 'models/gemini-3.1-flash-lite-image', imageSize: '1K' },
  pro: { kind: 'gemini', id: 'models/gemini-3-pro-image', imageSize: '2K' },
  gpt: { kind: 'openai', id: 'gpt-image-2', size: '2048x1152', quality: 'high' },
};
const DEFAULT_MODEL = 'gpt';
const CONCURRENCY = 6;
const MAX_ATTEMPTS = 4;

function loadEnv() {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY) return;
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, '');
  }
}

function boardTitle(concept) {
  return concept.form
    .split(',')[0]
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function buildHeroPrompt(concept) {
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

The page is designed wholly inside this visual world: ${concept.form}.
Palette and materials: ${palette}
Typography and composition: ${type}
Atmosphere, never written on the page but carried into it: ${concept.spark}
Light the page like the world: its hour, light quality, and mood shape the page ground, surfaces, and imagery, not just the accent color. Take the page ground from the palette above rather than from atmosphere: a world of cream stock, daylight, paper, or bright ink produces a genuinely light page, and only a world that is actually nocturnal or interior produces a dark one. Do not darken a page whose palette is light.

Invent a plausible fictional product or brand this world would naturally serve and write short realistic copy for it (plain punctuation, never an em dash): an invented name that reuses no brand, label, designer, or place name from the world description, a headline of at most eight words, one supporting sentence, and button labels. The result must read as a real, current, award-caliber website built from this world's laws: disciplined grid, aligned edges, believable interface details, generous intentional spacing. Not a poster, not a pastiche, a landing page.

The world must live in the interface itself, not only in imagery: the navigation, buttons, cards, dividers, and type voices are built from the world's materials, colors, textures, and lettering traditions. A photograph or illustration may appear as content, but a generic clean website wearing a themed hero image is a failure; a stranger shown only the page footer or a single button should still recognize the world.

Craft rules, all mandatory: every piece of interface copy is English, even when the world is Japanese, Arabic, or otherwise non-Latin in origin; at most one small non-Latin glyph may appear as a decorative motif, never in the wordmark, navigation, headlines, or body text, and when in doubt use none. Rendered materials must read premium and physically plausible: real metal, wood, paper, and glass with honest light, never plasticky gradient fakes of them. Game and HUD grammar is welcome whenever the world carries it: meters, maps, status readouts, and menu language are legitimate interface material when art-directed to contemporary award standard. The failure is cheap dated chrome, the 2000s-MMORPG stone-and-rivet kind that no web design could wear; when the world is screen- or game-born, render its grammar with the same craft a premium product site would get. Vary the composition beyond the world's single most famous motif and refuse AI-cliche renderings of it (Matrix-style glyph rain, red recording dots); use the world's wider grammar.`;
}

function buildDocsPrompt(concept) {
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

function buildPrompt(concept) {
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

async function extractImage(interaction) {
  if (interaction?.output_image?.data) return Buffer.from(interaction.output_image.data, 'base64');
  for (const step of interaction?.steps || []) {
    if (step.type !== 'model_output' || !step.content) continue;
    for (const part of step.content) {
      if (part.type === 'image' && part.data) return Buffer.from(part.data, 'base64');
    }
  }
  return null;
}

// Sequence-heavy families render two consecutive beats as a split frame; a
// still image cannot show motion any other honest way.
const SEQUENCE_FAMILIES = new Set(['narrative-scroll', 'reveal-transform', 'interaction-physics']);

const MODE_FRAMES = {
  persuade: 'an extraordinary marketing page at desktop scale',
  operate: 'an extraordinary application workspace at desktop scale, real work visibly in progress',
  read: 'an extraordinary documentation or long-form reading page at desktop scale, structure visibly serving comprehension',
  experience: 'an extraordinary portfolio or showcase surface at desktop scale, the work itself owning the frame',
};

// The prompt prose below still says "staging" on purpose. To an image model
// "composition" means the framing of the picture, so using it here would steer
// the render toward layout of the frame instead of the interaction idea.
function buildCompositionPrompt(composition) {
  const modeFrame = MODE_FRAMES[composition.surface] || MODE_FRAMES.persuade;
  const hierarchy = composition.grammar[0].replace(/^Staging\/hierarchy:\s*/, '');
  const sequence = composition.grammar[1].replace(/^Sequence\/attention:\s*/, '');
  const controls = composition.grammar[2].replace(/^Controls\/state:\s*/, '');
  const capture = SEQUENCE_FAMILIES.has(composition.familyId)
    ? 'Render two consecutive beats of the same page as one hard-cut split frame, a thin seam dividing left and right halves like film frames seconds apart. The staging visibly advances between the beats: something mid-reveal on the left has landed on the right, attention has moved, state has changed.'
    : composition.familyId === 'first-viewport'
      ? 'Render one cinematic frame of the opening screen at the most dramatic moment of its signature staging.'
      : 'Render one cinematic frame of the page caught mid-sequence, never its resting opening state: elements between states, partial reveals, momentum readable in the composition itself.';
  const copy = composition.surface === 'operate'
    ? 'Invent a plausible product with short realistic English copy (plain punctuation, never an em dash): an invented name and real-looking task content, labels, and data, never placeholder text.'
    : 'Invent a plausible product with short realistic English copy (plain punctuation, never an em dash): an invented name, a headline of at most eight words, one supporting line, one committed action.';
  return `${capture} The subject: ${modeFrame}, filling the entire 16:9 frame edge to edge. No browser chrome, no device mockup, no board framing, no caption.

The composition: ${composition.form}
What owns the frame: ${hierarchy}
The motion to make visible: ${sequence}
One interaction in play: ${controls}. Show exactly one control or element mid-gesture with its state visibly changing: a cursor in contact, a drag mid-flight, a value mid-update. Everything else holds still.

This must read as interactive, dynamic, fully realized web design that raises the bar: monumental scale contrast, fearless negative space, editorial typographic confidence, real art direction discipline, and web technology pushed as far as the staging implies (${composition.webLeverage}). Choose a product domain the staging serves best; when it is technical or game-adjacent, art-direct it to contemporary award standard, never dated game chrome or generic sci-fi mission styling, and never lean on cliche AI-generated motifs like recording indicators. Identity stays quiet so the staging is the star: a monochrome ground, one accent color, one strong typeface family, wielded with award-winning conviction, never as a wireframe. Only the elements this staging requires exist on the page: no toolbars, settings chrome, feature grids, or decorative widgets beyond the one interaction in play.

${copy} Never transcribe these instructions onto the image. The viewer should gasp at the design first, then understand the mechanism from what the frame implies.`;
}

function promptFor(concept, kind) {
  if (kind === 'composition') return buildCompositionPrompt(concept);
  if (kind === 'docs') return buildDocsPrompt(concept);
  return kind === 'hero' ? buildHeroPrompt(concept) : buildPrompt(concept);
}

async function generateGemini(ai, model, concept, kind) {
  const interaction = await ai.interactions.create({
    model: model.id,
    input: promptFor(concept, kind),
    generation_config: {
      temperature: 1,
      top_p: 0.95,
      thinking_level: 'low',
      image_config: { image_size: model.imageSize, aspect_ratio: '16:9' },
    },
    response_modalities: ['image', 'text'],
  });
  return extractImage(interaction);
}

// Set by main() so hero generation can pick up the concept's board as a
// binding style reference (the board/hero pair must read as one system).
let BOARD_REFERENCE_DIR = null;

async function generateOpenAI(model, concept, kind) {
  // Heroes are generated from the specimen board when it exists: the edits
  // endpoint takes the board as reference so both images share one system.
  if ((kind === 'hero' || kind === 'docs') && BOARD_REFERENCE_DIR) {
    const boardPath = join(BOARD_REFERENCE_DIR, `${concept.id}.webp`);
    if (existsSync(boardPath)) {
      try {
        const form = new FormData();
        form.append('model', model.id);
        form.append('image[]', new Blob([readFileSync(boardPath)], { type: 'image/webp' }), `${concept.id}.webp`);
        form.append('prompt', `The attached image is this world's design-system specimen board. Treat its palette, materials, type voices, and component grammar as binding reference; the page you render must read as the same system. ${promptFor(concept, kind)}`);
        form.append('size', model.size);
        form.append('quality', model.quality);
        const response = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: form,
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error?.message || `HTTP ${response.status}`);
        const b64 = json.data?.[0]?.b64_json;
        if (b64) return Buffer.from(b64, 'base64');
      } catch (error) {
        process.stderr.write(`  board-reference hero failed for ${concept.id} (${error.message}); falling back to plain generation\n`);
      }
    }
  }
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      prompt: promptFor(concept, kind),
      size: model.size,
      quality: model.quality,
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message || `HTTP ${response.status}`);
  const b64 = json.data?.[0]?.b64_json;
  return b64 ? Buffer.from(b64, 'base64') : null;
}

async function generateCard(ai, model, concept, kind) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const raw = model.kind === 'openai'
        ? await generateOpenAI(model, concept, kind)
        : await generateGemini(ai, model, concept, kind);
      if (!raw) throw new Error('no image part in response');
      const webp = await sharp(raw).webp({ quality: 90 }).toBuffer();
      // A moderated request can come back as a valid, correctly sized, entirely
      // blank frame rather than an error, which every exception-based check
      // reads as success and the manifest then stamps as generated. Treat a
      // flat frame as a failure so it retries and, if it keeps failing, reports
      // instead of silently shipping a black card.
      const { channels: [luma] } = await sharp(webp).greyscale().stats();
      if (luma.stdev < 3) throw new Error(`blank frame returned (stdev ${luma.stdev.toFixed(2)}), likely moderated`);
      return webp;
    } catch (error) {
      lastError = error;
      const wait = attempt * 8000;
      process.stderr.write(`  retry ${concept.id} (${attempt}/${MAX_ATTEMPTS}): ${error.message}\n`);
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
  throw lastError;
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const modelKey = args.includes('--model') ? args[args.indexOf('--model') + 1] : DEFAULT_MODEL;
  const model = MODELS[modelKey];
  if (!model) throw new Error(`unknown --model ${modelKey}; use ${Object.keys(MODELS).join(', ')}`);
  const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : CARD_DIR;
  const manifestPath = join(outDir, 'manifest.json');
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',').filter(Boolean) : null;
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
  const force = args.includes('--force');
  const kindArg = args.includes('--kind') ? args[args.indexOf('--kind') + 1] : 'both';
  if (!['board', 'hero', 'docs', 'both', 'all', 'composition'].includes(kindArg)) throw new Error(`unknown --kind ${kindArg}; use board, hero, docs, both, all, composition`);
  const kinds = kindArg === 'both' ? ['board', 'hero'] : kindArg === 'all' ? ['board', 'hero', 'docs'] : [kindArg];
  const isComposition = kindArg === 'composition';

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY;
  if (model.kind === 'gemini' && !geminiKey) throw new Error('set GEMINI_API_KEY or GOOGLE_CLOUD_API_KEY (repo .env)');
  if (model.kind === 'openai' && !process.env.OPENAI_API_KEY) throw new Error('set OPENAI_API_KEY (repo .env)');
  const ai = model.kind === 'gemini' ? new GoogleGenAI({ apiKey: geminiKey }) : null;

  // Composition images render composition-catalog entries; boards and heroes
  // render world-catalog concepts. Both share the manifest and output dir.
  const concepts = isComposition
    ? readCompositionCatalog(
        join(ROOT, 'catalog', 'composition-ingredients.json'),
        join(ROOT, 'catalog', 'composition-reviews.json')
      ).compositions
    : readConceptCatalog(
        join(ROOT, 'catalog', 'concept-ingredients.json'),
        join(ROOT, 'catalog', 'concept-reviews.json')
      ).concepts;
  const hashOf = isComposition ? compositionContentHash : conceptContentHash;
  mkdirSync(outDir, { recursive: true });
  BOARD_REFERENCE_DIR = outDir;
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const writeManifest = () => writeFileSync(
    manifestPath,
    `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`
  );

  const SUFFIX = { hero: '-hero', docs: '-docs' };
  const fileFor = (concept, kind) => join(outDir, `${concept.id}${SUFFIX[kind] || ''}.webp`);
  const STAMP = { hero: 'heroGeneratedAt', docs: 'docsGeneratedAt' };
  const stampKey = kind => STAMP[kind] || 'generatedAt';
  // One queue entry per concept, holding its jobs in kind order, because the
  // hero takes the board off disk as binding style reference. Queuing board and
  // hero as independent jobs lets a worker start the hero first: on a new
  // concept there is no board yet so the reference is silently skipped, and on a
  // reworked concept the previous version's board is still sitting there, so the
  // new hero is generated from the art direction that was just replaced.
  // Concepts still run concurrently; only the pair within a concept is ordered.
  const queue = [];
  let queued = 0;
  for (const concept of concepts) {
    if (only && !only.includes(concept.id)) continue;
    const hash = hashOf(concept);
    const row = manifest[concept.id];
    const jobs = [];
    for (const kind of kinds) {
      const needed = force
        || !existsSync(fileFor(concept, kind))
        || row?.hash !== hash
        || !row?.[stampKey(kind)];
      if ((needed || only) && queued < limit) {
        jobs.push({ concept, kind });
        queued += 1;
      }
    }
    if (jobs.length > 0) queue.push(jobs);
  }

  if (only) {
    const found = new Set(queue.flat().map(job => job.concept.id));
    const missing = only.filter(id => !found.has(id));
    if (missing.length) throw new Error(`concept not found: ${missing.join(', ')}`);
  }
  process.stdout.write(`generating ${queued} images (${kinds.join('+')}) across ${concepts.length} concepts with ${modelKey} -> ${outDir}\n`);

  let done = 0;
  let failed = 0;
  const worker = async () => {
    while (queue.length > 0) {
      const jobs = queue.shift();
      for (const { concept, kind } of jobs) {
        try {
          const webp = await generateCard(ai, model, concept, kind);
          writeFileSync(fileFor(concept, kind), webp);
          const row = manifest[concept.id] || {};
          row.hash = hashOf(concept);
          row.model = modelKey;
          row[stampKey(kind)] = new Date().toISOString();
          manifest[concept.id] = row;
          writeManifest();
          done += 1;
          process.stdout.write(`  [${done}] ${concept.id} ${kind} (${Math.round(webp.length / 1024)}KB)\n`);
        } catch (error) {
          failed += 1;
          process.stderr.write(`  FAILED ${concept.id} ${kind}: ${error.message}\n`);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Prune manifest entries for ids that left both catalogs (they share the
  // manifest, so pruning must check the union).
  const worldIds = readConceptCatalog(
    join(ROOT, 'catalog', 'concept-ingredients.json'),
    join(ROOT, 'catalog', 'concept-reviews.json')
  ).concepts.map(concept => concept.id);
  const compositionIds = readCompositionCatalog(
    join(ROOT, 'catalog', 'composition-ingredients.json'),
    join(ROOT, 'catalog', 'composition-reviews.json')
  ).compositions.map(composition => composition.id);
  const liveIds = new Set([...worldIds, ...compositionIds]);
  for (const id of Object.keys(manifest)) {
    if (!liveIds.has(id)) delete manifest[id];
  }
  writeManifest();
  process.stdout.write(`done: ${done} generated, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});

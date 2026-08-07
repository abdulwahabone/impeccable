import { copyFile, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  conceptContentHash,
  CONCEPT_STRENGTHS,
  normalizeConceptForm,
  SYSTEM_PREFIXES,
  validateConceptCatalog,
  validateConceptEntry,
  SEED_MODES,
  WELL_TIERS,
} from '../skill/scripts/lib/concept-catalog.mjs';
import {
  COMPOSITION_GRAINS,
  COMPOSITION_PLATFORMS,
  compositionContentHash,
  isGrain,
  isPlatform,
  validateCompositionCatalog,
} from '../skill/scripts/lib/composition-catalog.mjs';

import {
  QUEUE_RELATIVE, emptyQueue, extractUrls, addUrls, closeSite, reopenSite,
} from './lib/site-queue.mjs';

const API_PATH = '/__impeccable/worlds';
const MAX_BODY_BYTES = 64 * 1024;
const REVIEW_STATUSES = new Set(['pending', 'approved', 'rejected']);

function jsonResponse(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`${JSON.stringify(payload)}\n`);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body is too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

// Ingredient catalogs serialize at indent 1 and review files at indent 2. That
// is the authoring contract in docs/WORLD-CATALOG-AUTHORING.md: it is what makes
// an authoring round round-trip byte-identical, so its diff stays purely
// additive. Writing every file at one indent reformats the whole catalog on the
// first review and buries the round in thousands of phantom line changes.
async function writeJsonAtomic(filePath, value, indent = 2) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, indent)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

function findConcept(catalog, id) {
  for (const family of catalog.families || []) {
    const index = family.concepts?.findIndex(concept => concept.id === id) ?? -1;
    if (index !== -1) return { family, index, concept: family.concepts[index] };
  }
  return null;
}

function assertApprovedFloor(catalog, reviewData) {
  const approvedIds = new Set(
    Object.entries(reviewData.reviews)
      .filter(([, review]) => review.status === 'approved')
      .map(([id]) => id)
  );
  const tierByWell = new Map((catalog.wells || []).map(well => [well.id, well.tier]));
  const approvedTiers = new Set(
    catalog.families
      .filter(family => family.concepts.some(concept => approvedIds.has(concept.id)))
      .map(family => tierByWell.get(family.well))
      .filter(tier => WELL_TIERS.includes(tier))
  );
  if (approvedIds.size < 3 || approvedTiers.size < WELL_TIERS.length) {
    throw new Error('At least three approved concepts covering every challenger tier must remain available to the challenger');
  }
}

function assertValidCatalog(catalog, reviewData) {
  const { errors } = validateConceptCatalog(catalog, reviewData, { requireApprovedMinimum: false });
  if (errors.length > 0) throw new Error(errors[0]);
}

function validateTags(tags) {
  return Array.isArray(tags)
    && tags.length === 3
    && tags.every(tag => typeof tag === 'string' && tag.trim().length >= 2 && tag.trim().length <= 40);
}

function validateSystem(system) {
  return Array.isArray(system)
    && system.length === SYSTEM_PREFIXES.length
    && system.every((rule, index) =>
      typeof rule === 'string'
      && rule.trim().length >= 12
      && rule.trim().length <= 180
      && rule.trim().startsWith(SYSTEM_PREFIXES[index])
    );
}

export function worldsReviewPlugin({ root = process.cwd() } = {}) {
  const catalogPath = path.join(root, 'catalog', 'concept-ingredients.json');
  const reviewsPath = path.join(root, 'catalog', 'concept-reviews.json');
  const compositionCatalogPath = path.join(root, 'catalog', 'composition-ingredients.json');
  const compositionReviewsPath = path.join(root, 'catalog', 'composition-reviews.json');
  const axesPath = path.join(root, 'catalog', 'aesthetic-axes.json');
  let mutationQueue = Promise.resolve();

  // Composition-catalog reviews share the review mechanics but none of the
  // world catalog's floors or editing; v1 supports the review action only.
  async function mutateComposition(body) {
    if (!['review', 'breadth', 'rate', 'grain', 'platforms'].includes(body.action)) {
      throw new Error('Compositions support the review, breadth, rate, grain, and platforms actions only');
    }
    const catalog = await readJson(compositionCatalogPath);
    const reviewData = await readJson(compositionReviewsPath);
    const entry = (catalog.compositions || []).find(composition => composition.id === body.id);
    if (!entry) throw new Error('Composition was not found');

    // Compositions had no gate at all: selection filtered on approval
    // and surface only, so a composition too specific to serve an arbitrary build
    // could not be held out of challenger draws by any means.
    if (body.action === 'breadth') {
      const review = reviewData.reviews[body.id];
      if (review?.status !== 'approved') throw new Error('Breadth only applies to approved compositions');
      if (body.breadth === 'niche') {
        review.breadth = 'niche';
      } else if (body.breadth === 'general' || body.breadth === null) {
        delete review.breadth;
      } else {
        throw new Error('Breadth must be general or niche');
      }
      const { errors: breadthErrors } = validateCompositionCatalog(catalog, reviewData);
      if (breadthErrors.length > 0) throw new Error(breadthErrors[0]);
      await writeJsonAtomic(compositionReviewsPath, reviewData);
      return { id: body.id, breadth: review.breadth ?? 'general', review };
    }

    // Compositions had no quality signal at all: every approved one drew with
    // equal weight, so a flagship and a marginal keep were indistinguishable to
    // the seeder. 103 of the approved pool arrived by migration from rejected
    // world entries and had never been judged as compositions by any measure.
    if (body.action === 'rate') {
      const review = reviewData.reviews[body.id];
      if (review?.status !== 'approved') throw new Error('Rating only applies to approved compositions');
      if (body.rating === null) {
        delete review.rating;
      } else if ([1, 2, 3].includes(body.rating)) {
        review.rating = body.rating;
      } else {
        throw new Error('Rating must be 1, 2, or 3');
      }
      const { errors: rateErrors } = validateCompositionCatalog(catalog, reviewData);
      if (rateErrors.length > 0) throw new Error(rateErrors[0]);
      await writeJsonAtomic(compositionReviewsPath, reviewData);
      return { id: body.id, rating: review.rating ?? null, review };
    }

    // Grain and platforms live on the ingredient rather than the review, because
    // they describe what the composition is and what it can survive rather than a
    // verdict on it. Both write the catalog, so they go out at indent 1 to match
    // the serialization contract, and neither is part of compositionContentHash,
    // so no review goes stale. Both apply at any status: an entry can be filed
    // before it is judged.
    if (body.action === 'grain') {
      if (body.grain === null || body.grain === '') {
        delete entry.grain;
      } else if (isGrain(body.grain)) {
        entry.grain = body.grain;
      } else {
        throw new Error(`Grain must be one of ${COMPOSITION_GRAINS.join(', ')}`);
      }
      const { errors: grainErrors } = validateCompositionCatalog(catalog, reviewData);
      if (grainErrors.length > 0) throw new Error(grainErrors[0]);
      await writeJsonAtomic(compositionCatalogPath, catalog, 1);
      return { id: body.id, grain: entry.grain ?? null };
    }

    if (body.action === 'platforms') {
      const list = Array.isArray(body.platforms) ? [...new Set(body.platforms)] : null;
      if (list === null || list.length === 0 || list.length === COMPOSITION_PLATFORMS.length) {
        delete entry.platforms;
      } else {
        if (list.some(entry2 => !isPlatform(entry2))) {
          throw new Error(`Platforms may only contain ${COMPOSITION_PLATFORMS.join(', ')}`);
        }
        // Fixed order so the catalog does not churn on click order.
        entry.platforms = COMPOSITION_PLATFORMS.filter(name => list.includes(name));
      }
      const { errors: platformErrors } = validateCompositionCatalog(catalog, reviewData);
      if (platformErrors.length > 0) throw new Error(platformErrors[0]);
      await writeJsonAtomic(compositionCatalogPath, catalog, 1);
      return { id: body.id, platforms: entry.platforms ?? null };
    }

    if (!REVIEW_STATUSES.has(body.status)) throw new Error('Review status is invalid');
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (note.length > 500) throw new Error('Review note must be 500 characters or fewer');
    const previousBreadth = reviewData.reviews[body.id]?.breadth;
    const previousRating = reviewData.reviews[body.id]?.rating;
    if (body.status === 'pending') {
      delete reviewData.reviews[body.id];
    } else {
      reviewData.reviews[body.id] = {
        status: body.status,
        reviewedBy: 'pbakaus',
        reviewedAt: new Date().toISOString(),
        formHash: compositionContentHash(entry),
        ...(note ? { note } : {}),
        ...(body.status === 'approved' && [1, 2, 3].includes(previousRating) ? { rating: previousRating } : {}),
        ...(body.status === 'approved' && previousBreadth === 'niche' ? { breadth: previousBreadth } : {}),
      };
    }
    reviewData.reviews = Object.fromEntries(Object.entries(reviewData.reviews).sort(([a], [b]) => a.localeCompare(b)));
    const { errors } = validateCompositionCatalog(catalog, reviewData);
    if (errors.length > 0) throw new Error(errors[0]);
    await writeJsonAtomic(compositionReviewsPath, reviewData);
    return { id: body.id, status: body.status, review: reviewData.reviews[body.id] || null };
  }

  // The axes definition is the third thing this endpoint writes. It is not a
  // catalog of entries but the vocabulary a wave is briefed from, and it is
  // edited against live occupancy: you change a keyword, the counts move, and
  // you can see which worlds a value actually caught. That loop is the whole
  // reason it is editable here rather than by hand.
  async function mutateAxes(body) {
    const doc = body.axes;
    if (!doc || !Array.isArray(doc.axes)) throw new Error('Expected an axes document');
    const ids = new Set();
    for (const axis of doc.axes) {
      if (!axis.id || !axis.label) throw new Error('Every axis needs an id and a label');
      if (ids.has(axis.id)) throw new Error(`Duplicate axis id ${axis.id}`);
      ids.add(axis.id);
      if (!Array.isArray(axis.values) || axis.values.length === 0) {
        throw new Error(`Axis ${axis.id} needs at least one value`);
      }
      const valueIds = new Set();
      for (const value of axis.values) {
        if (!value.id || !value.label) throw new Error(`Axis ${axis.id} has a value without an id or label`);
        if (valueIds.has(value.id)) throw new Error(`Axis ${axis.id} repeats value id ${value.id}`);
        valueIds.add(value.id);
        if (axis.kind === 'count') {
          if (value.min == null && value.max == null) {
            throw new Error(`Counting value ${axis.id}/${value.id} needs a min or a max`);
          }
        } else if (!Array.isArray(value.match) || value.match.length === 0) {
          throw new Error(`Value ${axis.id}/${value.id} needs at least one match word`);
        }
      }
      if (axis.kind === 'count' && (!Array.isArray(axis.lexicon) || axis.lexicon.length === 0)) {
        throw new Error(`Counting axis ${axis.id} needs a lexicon`);
      }
    }
    // Same serialization contract as the ingredient catalogs it sits beside.
    await writeJsonAtomic(axesPath, doc, 1);
    return { axes: doc.axes.length };
  }

  // The site queue, written from the lab so a candidate can be dropped in while
  // reviewing rather than by leaving for a terminal. Both actions go through
  // scripts/lib/site-queue.mjs, the same module the CLI uses, so the two cannot
  // disagree about what counts as a duplicate.
  async function mutateSites(body) {
    const queuePath = path.join(root, ...QUEUE_RELATIVE);
    let queue;
    try {
      queue = JSON.parse(await readFile(queuePath, 'utf8'));
    } catch {
      queue = emptyQueue();
    }

    if (body.action === 'add') {
      const urls = extractUrls(body.text || '');
      if (urls.length === 0) throw new Error('No URLs in that');
      const { added, duplicate } = addUrls(queue, urls, { source: body.source || 'lab' });
      await writeJsonAtomic(queuePath, queue);
      return { added: added.length, duplicate, sites: queue.sites };
    }

    if (body.action === 'close') {
      const verdict = { done: { status: 'done', conceptId: body.conceptId },
        keep: { status: 'keep' },
        passed: { status: 'passed', why: body.why } }[body.status];
      if (!verdict) throw new Error('Status must be keep, done, or passed');
      closeSite(queue, body.url, verdict);
      await writeJsonAtomic(queuePath, queue);
      return { sites: queue.sites };
    }

    if (body.action === 'reopen') {
      reopenSite(queue, body.url);
      await writeJsonAtomic(queuePath, queue);
      return { sites: queue.sites };
    }

    throw new Error('Site queue takes add, close, or reopen');
  }

  async function mutate(body) {
    if (body.catalog === 'axes') return mutateAxes(body);
    if (body.catalog === 'compositions') return mutateComposition(body);
    // Before the concept lookup below, which every catalog-less action would
    // otherwise fail on with "Concept was not found".
    if (body.catalog === 'sites') return mutateSites(body);
    const catalog = await readJson(catalogPath);
    const reviewData = await readJson(reviewsPath);
    const match = findConcept(catalog, body.id);
    if (!match) throw new Error('Concept was not found');

    if (body.action === 'review') {
      if (!REVIEW_STATUSES.has(body.status)) throw new Error('Review status is invalid');
      // Composition strength is a routing verdict, not an approvable type:
      // every composition-typed world entry the reviewer processed was
      // rejected, and approved compositions live in the composition catalog.
      if (body.status === 'approved' && match.concept.strength === 'composition') {
        throw new Error('Compositions live in the composition catalog; reject it here and it joins the mining queue');
      }
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (note.length > 500) throw new Error('Review note must be 500 characters or fewer');
      const previousStatus = reviewData.reviews[body.id]?.status || 'pending';
      const previousRating = reviewData.reviews[body.id]?.rating;
      const previousBreadth = reviewData.reviews[body.id]?.breadth;
      if (body.status === 'pending') {
        delete reviewData.reviews[body.id];
      } else {
        reviewData.reviews[body.id] = {
          status: body.status,
          reviewedBy: 'pbakaus',
          reviewedAt: new Date().toISOString(),
          formHash: conceptContentHash(match.concept),
          ...(note ? { note } : {}),
          ...(body.status === 'approved' && [1, 2, 3].includes(previousRating) ? { rating: previousRating } : {}),
          ...(body.status === 'approved' && previousBreadth === 'niche' ? { breadth: previousBreadth } : {}),
        };
      }
      if (previousStatus === 'approved' && body.status !== 'approved') assertApprovedFloor(catalog, reviewData);
      reviewData.reviews = Object.fromEntries(Object.entries(reviewData.reviews).sort(([a], [b]) => a.localeCompare(b)));
      assertValidCatalog(catalog, reviewData);
      await writeJsonAtomic(reviewsPath, reviewData);
      return { id: body.id, status: body.status, review: reviewData.reviews[body.id] || null };
    }

    if (body.action === 'cardWinner') {
      // Choosing which of a card's variants is the one everything else uses. The
      // winner is copied over the canonical filename rather than pointed at, so
      // R2, the roll API, the pro site and every existing reader keep working
      // without knowing variants exist. The losing variants stay on disk, so
      // changing a mind costs a copy rather than a regeneration.
      const KINDS = { board: '', hero: '-hero', docs: '-docs' };
      if (!(body.kind in KINDS)) throw new Error('kind must be board, hero, or docs');
      if (!/^v[1-9]$/.test(body.variant || '')) throw new Error('variant must look like v1');
      const cardsDir = path.join(root, 'site', 'public', 'worlds', 'cards');
      const from = path.join(cardsDir, `${body.id}${KINDS[body.kind]}-${body.variant}.webp`);
      const to = path.join(cardsDir, `${body.id}${KINDS[body.kind]}.webp`);
      await copyFile(from, to);
      const manifestPath = path.join(cardsDir, 'manifest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      manifest[body.id] = manifest[body.id] || {};
      manifest[body.id][`${body.kind}Winner`] = body.variant;
      // The canonical file just changed, so its stamp has to move or publish
      // will skip it and R2 will keep serving the previous choice.
      const STAMP = { board: 'generatedAt', hero: 'heroGeneratedAt', docs: 'docsGeneratedAt' };
      manifest[body.id][STAMP[body.kind]] = new Date().toISOString();
      await writeJsonAtomic(manifestPath, manifest, 1);
      return { id: body.id, kind: body.kind, variant: body.variant };
    }

    if (body.action === 'strength') {
      // Strength is curation metadata outside the content hash, so retyping a
      // concept never invalidates its human review.
      if (!CONCEPT_STRENGTHS.has(body.strength)) throw new Error('Strength must be world, composition, or dual');
      match.concept.strength = body.strength;
      catalog.catalogVersion = new Date().toISOString();
      assertValidCatalog(catalog, reviewData);
      await writeJsonAtomic(catalogPath, catalog, 1);
      return { id: body.id, strength: body.strength, catalogVersion: catalog.catalogVersion };
    }

    if (body.action === 'rate') {
      // Rating grades an approved concept's strength (3 exceptional, 2 solid,
      // 1 marginal keep) as a calibration signal. It lives on the review but
      // stays outside the content hash and never changes status.
      const review = reviewData.reviews[body.id];
      if (review?.status !== 'approved') throw new Error('Rating only applies to approved concepts');
      if (body.rating === null) {
        delete review.rating;
      } else if ([1, 2, 3].includes(body.rating)) {
        review.rating = body.rating;
      } else {
        throw new Error('Rating must be 1, 2, or 3');
      }
      assertValidCatalog(catalog, reviewData);
      await writeJsonAtomic(reviewsPath, reviewData);
      return { id: body.id, rating: review.rating ?? null, review };
    }

    // Breadth is deliberately separate from rating. Rating grades how good a
    // world is; breadth says whether it can serve an arbitrary build. Before
    // this existed the only way to hold a narrow world back was to rate it
    // marginal, which made "excellent but niche" indistinguishable from "weak"
    // and quietly corrupted the calibration signal for the next authoring
    // round. Absent means general; only 'niche' is stored.
    if (body.action === 'breadth') {
      const review = reviewData.reviews[body.id];
      if (review?.status !== 'approved') throw new Error('Breadth only applies to approved concepts');
      if (body.breadth === 'niche') {
        review.breadth = 'niche';
      } else if (body.breadth === 'general' || body.breadth === null) {
        delete review.breadth;
      } else {
        throw new Error('Breadth must be general or niche');
      }
      assertValidCatalog(catalog, reviewData);
      await writeJsonAtomic(reviewsPath, reviewData);
      return { id: body.id, breadth: review.breadth ?? 'general', review };
    }

    // Mode eligibility. Worlds used to be dealt with no mode awareness at all, so
    // a build asking for an app UI could draw six worlds that only work on a
    // landing page. This lowers a ceiling rather than assigning a category:
    // absent means eligible everywhere, and listing all four is rejected by the
    // validator in favour of omitting the field.
    if (body.action === 'modes') {
      const review = reviewData.reviews[body.id];
      if (review?.status !== 'approved') throw new Error('Mode eligibility only applies to approved concepts');
      const modes = Array.isArray(body.allowedModes) ? [...new Set(body.allowedModes)] : null;
      if (modes === null || modes.length === 0 || modes.length === SEED_MODES.size) {
        delete review.allowedModes;
      } else {
        if (modes.some(mode => !SEED_MODES.has(mode))) {
          throw new Error(`Modes may only contain ${[...SEED_MODES].join(', ')}`);
        }
        // Stored in a fixed order so the file does not churn on click order.
        review.allowedModes = [...SEED_MODES].filter(mode => modes.includes(mode));
      }
      assertValidCatalog(catalog, reviewData);
      await writeJsonAtomic(reviewsPath, reviewData);
      return { id: body.id, allowedModes: review.allowedModes ?? null, review };
    }

    if (body.action === 'update') {
      const form = typeof body.form === 'string' ? body.form.trim() : '';
      const lineage = typeof body.lineage === 'string' ? body.lineage.trim() : '';
      const targetFamily = catalog.families.find(family => family.id === body.familyId);
      if (form.length < 40 || form.length > 360 || !form.includes(',')) {
        throw new Error('Form must be 40–360 characters and include inherited structure after a comma');
      }
      if (lineage.length < 12 || lineage.length > 200) throw new Error('Lineage must be 12–200 characters');
      if (!validateTags(body.tags)) throw new Error('Exactly three structural tags are required');
      if (!validateSystem(body.system)) throw new Error('Exactly five system grammar rules of 12–180 characters are required');
      const spark = typeof body.spark === 'string' ? body.spark.trim() : '';
      if (spark.length < 80 || spark.length > 320) throw new Error('Creative spark must be 80–320 characters');
      const webLeverage = typeof body.webLeverage === 'string' ? body.webLeverage.trim() : '';
      if (webLeverage.length < 20 || webLeverage.length > 240) throw new Error('Web leverage must be 20–240 characters');
      if (!targetFamily) throw new Error('Family was not found');

      const updated = {
        ...match.concept,
        form,
        lineage,
        tags: body.tags.map(tag => tag.trim()),
        system: body.system.map(rule => rule.trim()),
        spark,
        webLeverage,
      };
      const existingForms = new Map();
      for (const family of catalog.families) {
        for (const concept of family.concepts) {
          if (concept.id === body.id) continue;
          existingForms.set(normalizeConceptForm(concept.form), concept.id);
        }
      }
      const entryErrors = validateConceptEntry(updated, { existingForms });
      if (entryErrors.length > 0) throw new Error(entryErrors[0]);
      if (targetFamily.id === match.family.id) {
        match.family.concepts[match.index] = updated;
      } else {
        match.family.concepts.splice(match.index, 1);
        targetFamily.concepts.push(updated);
        targetFamily.concepts.sort((a, b) => a.id.localeCompare(b.id));
      }
      catalog.catalogVersion = new Date().toISOString();
      const previousStatus = reviewData.reviews[body.id]?.status || 'pending';
      if (reviewData.reviews[body.id]) {
        delete reviewData.reviews[body.id];
        reviewData.reviews = Object.fromEntries(Object.entries(reviewData.reviews).sort(([a], [b]) => a.localeCompare(b)));
      }
      if (previousStatus === 'approved') assertApprovedFloor(catalog, reviewData);
      assertValidCatalog(catalog, reviewData);
      await writeJsonAtomic(catalogPath, catalog, 1);
      if (previousStatus !== 'pending') await writeJsonAtomic(reviewsPath, reviewData);
      return {
        id: body.id,
        concept: updated,
        familyId: targetFamily.id,
        status: 'pending',
        catalogVersion: catalog.catalogVersion,
      };
    }

    throw new Error('Action is invalid');
  }

  return {
    name: 'impeccable-worlds-review',
    apply: 'serve',
    configureServer(server) {
      // Site-derived worlds are rendered into .waves/, which is scratch space
      // Astro does not publish, so judging one meant opening files by hand. This
      // serves them read-only to the lab. Dev plugin, dev-only, and the path is
      // resolved and then checked to be inside the directory, so a traversal
      // cannot read the repo.
      const siteWorldCache = new Map();
      server.middlewares.use('/__impeccable/site-worlds', async (req, res, next) => {
        if (req.method !== 'GET') { next(); return; }
        const base = path.join(root, '.waves', 'site-worlds');
        const [rawPath, rawQuery] = (req.url || '').split('?');
        const target = path.resolve(base, `.${decodeURIComponent(rawPath)}`);
        if (!target.startsWith(base + path.sep)) { res.statusCode = 403; res.end(); return; }
        // Sources are full-resolution screenshots, several megabytes each, and
        // sixteen candidates means thirty-two of them. Serving them whole made
        // the tab spend a minute downloading pictures nobody was looking at yet.
        const width = Number(new URLSearchParams(rawQuery || '').get('w')) || 0;
        // The modification time is part of the key, so re-rendering a world
        // invalidates it. Without that the cache had no expiry at all and served
        // the first bytes it ever saw: a rerun wrote a new world to disk and the
        // lab kept showing the old one, which looks exactly like the rerun not
        // having happened.
        const { mtimeMs } = await stat(target);
        const key = `${target}@${width}@${mtimeMs}`;
        try {
          if (!siteWorldCache.has(key)) {
            const started = Date.now();
            const original = await readFile(target);
            siteWorldCache.set(key, width > 0
              ? await sharp(original).resize({ width }).webp({ quality: 82 }).toBuffer()
              : original);
            // Entries for older versions of this same file are now unreachable.
            for (const stale of siteWorldCache.keys()) {
              if (stale.startsWith(`${target}@`) && stale !== key) siteWorldCache.delete(stale);
            }
            process.stdout.write(`[site-worlds] ${path.basename(target)}@${width} in ${Date.now() - started}ms\n`);
          }
          res.setHeader('Content-Type', width > 0 || target.endsWith('.webp') ? 'image/webp' : 'image/png');
          res.setHeader('Cache-Control', 'no-store');
          res.end(siteWorldCache.get(key));
        } catch {
          res.statusCode = 404;
          res.end();
        }
      });

      server.middlewares.use(API_PATH, async (req, res) => {
        if (req.method !== 'POST') {
          jsonResponse(res, 405, { error: 'Method not allowed' });
          return;
        }
        if (!sameOrigin(req)) {
          jsonResponse(res, 403, { error: 'Cross-origin writes are not allowed' });
          return;
        }
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
          jsonResponse(res, 415, { error: 'Expected application/json' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const operation = mutationQueue.then(() => mutate(body));
          mutationQueue = operation.catch(() => {});
          jsonResponse(res, 200, { ok: true, result: await operation });
        } catch (error) {
          jsonResponse(res, 400, { error: error instanceof Error ? error.message : String(error) });
        }
      });
    },
  };
}

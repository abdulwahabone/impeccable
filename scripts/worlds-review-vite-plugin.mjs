import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  conceptContentHash,
  CONCEPT_STRENGTHS,
  normalizeConceptForm,
  SYSTEM_PREFIXES,
  validateConceptCatalog,
  validateConceptEntry,
  WELL_TIERS,
} from '../skill/scripts/lib/concept-catalog.mjs';
import {
  compositionContentHash,
  validateCompositionCatalog,
} from '../skill/scripts/lib/composition-catalog.mjs';

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

async function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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
  let mutationQueue = Promise.resolve();

  // Composition-catalog reviews share the review mechanics but none of the
  // world catalog's floors or editing; v1 supports the review action only.
  async function mutateComposition(body) {
    if (body.action !== 'review') throw new Error('Compositions support the review action only');
    if (!REVIEW_STATUSES.has(body.status)) throw new Error('Review status is invalid');
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (note.length > 500) throw new Error('Review note must be 500 characters or fewer');
    const catalog = await readJson(compositionCatalogPath);
    const reviewData = await readJson(compositionReviewsPath);
    const entry = (catalog.compositions || []).find(composition => composition.id === body.id);
    if (!entry) throw new Error('Composition was not found');
    if (body.status === 'pending') {
      delete reviewData.reviews[body.id];
    } else {
      reviewData.reviews[body.id] = {
        status: body.status,
        reviewedBy: 'pbakaus',
        reviewedAt: new Date().toISOString(),
        formHash: compositionContentHash(entry),
        ...(note ? { note } : {}),
      };
    }
    reviewData.reviews = Object.fromEntries(Object.entries(reviewData.reviews).sort(([a], [b]) => a.localeCompare(b)));
    const { errors } = validateCompositionCatalog(catalog, reviewData);
    if (errors.length > 0) throw new Error(errors[0]);
    await writeJsonAtomic(compositionReviewsPath, reviewData);
    return { id: body.id, status: body.status, review: reviewData.reviews[body.id] || null };
  }

  async function mutate(body) {
    if (body.catalog === 'compositions') return mutateComposition(body);
    const catalog = await readJson(catalogPath);
    const reviewData = await readJson(reviewsPath);
    const match = findConcept(catalog, body.id);
    if (!match) throw new Error('Concept was not found');

    if (body.action === 'review') {
      if (!REVIEW_STATUSES.has(body.status)) throw new Error('Review status is invalid');
      // Composition strength is a routing verdict, not an approvable type:
      // every composition-typed world entry the reviewer processed was
      // rejected, and approved stagings live in the composition catalog.
      if (body.status === 'approved' && match.concept.strength === 'composition') {
        throw new Error('Stagings live in the composition catalog; reject it here and it joins the mining queue');
      }
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (note.length > 500) throw new Error('Review note must be 500 characters or fewer');
      const previousStatus = reviewData.reviews[body.id]?.status || 'pending';
      const previousRating = reviewData.reviews[body.id]?.rating;
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
        };
      }
      if (previousStatus === 'approved' && body.status !== 'approved') assertApprovedFloor(catalog, reviewData);
      reviewData.reviews = Object.fromEntries(Object.entries(reviewData.reviews).sort(([a], [b]) => a.localeCompare(b)));
      assertValidCatalog(catalog, reviewData);
      await writeJsonAtomic(reviewsPath, reviewData);
      return { id: body.id, status: body.status, review: reviewData.reviews[body.id] || null };
    }

    if (body.action === 'strength') {
      // Strength is curation metadata outside the content hash, so retyping a
      // concept never invalidates its human review.
      if (!CONCEPT_STRENGTHS.has(body.strength)) throw new Error('Strength must be world, composition, or dual');
      match.concept.strength = body.strength;
      catalog.catalogVersion = new Date().toISOString();
      assertValidCatalog(catalog, reviewData);
      await writeJsonAtomic(catalogPath, catalog);
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
      await writeJsonAtomic(catalogPath, catalog);
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

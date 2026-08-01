// The wave draw: one company and one aesthetic per brief, decided before
// anything is designed.
//
// Extracted so wave-assign.mjs (which reports a draw) and wave-brief.mjs (which
// writes the authoring prompt from one) cannot drift. The same class of bug had
// already been fixed once between the roll API and the concept seeder, where two
// copies of a selection routine slowly stopped agreeing; there is no reason to
// reintroduce it here.
//
// Pure apart from the catalog reads in loadWaveInputs, so a caller can supply
// its own catalogs in a test.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { computeOccupancy, mergeWorlds } from './world-occupancy.mjs';

export function loadWaveInputs(root = process.cwd()) {
  const read = name => JSON.parse(readFileSync(path.join(root, 'catalog', name), 'utf8'));
  const worlds = mergeWorlds(read('concept-ingredients.json'), read('concept-reviews.json'));
  const axesDefinition = read('aesthetic-axes.json');
  let companyDeck = null;
  try {
    companyDeck = read('company-deck.json');
  } catch {
    companyDeck = null;
  }
  return { worlds, axesDefinition, companyDeck, occupancy: computeOccupancy(worlds, axesDefinition) };
}

// Deterministic, so a wave is reproducible from its key. This is what makes a
// controlled comparison possible: change the prompt, redraw the same key, and
// the only variable that moved is the prompt.
export function unit(...parts) {
  const digest = createHash('sha256').update(parts.join(':')).digest();
  return digest.readUInt32BE(0) / 0xffffffff;
}

function pickWeighted(values, roll) {
  const total = values.reduce((sum, value) => sum + value.weight, 0);
  let cursor = roll * total;
  for (const value of values) {
    cursor -= value.weight;
    if (cursor <= 0) return value;
  }
  return values[values.length - 1];
}

function conflicts(incompatible, chosen, axisId, valueId) {
  return incompatible.some(pair => {
    const [a, b] = pair.pair;
    const hasA = (a.axis === axisId && a.value === valueId) || chosen[a.axis] === a.value;
    const hasB = (b.axis === axisId && b.value === valueId) || chosen[b.axis] === b.value;
    const touchesThis = (a.axis === axisId && a.value === valueId) || (b.axis === axisId && b.value === valueId);
    return touchesThis && hasA && hasB;
  });
}

function drawCompany(companyDeck, key, index) {
  if (!companyDeck) return null;
  // Uniform: unlike the aesthetic axes there is no occupancy to weight against,
  // because the catalog records worlds rather than the companies they were for.
  return (companyDeck.axes || []).map(axis => ({
    axis: axis.id,
    label: axis.label,
    value: axis.values[Math.floor(unit(key, index, 'company', axis.id) * axis.values.length) % axis.values.length],
  }));
}

export function drawBrief({ key, index, occupancy, axesDefinition, companyDeck }) {
  const incompatible = axesDefinition.incompatible || [];
  const chosen = {};
  const notes = [];
  for (const axis of occupancy.axes) {
    // A trusted axis is weighted against its own occupancy. An untrusted one is
    // uniform, because weighting by a distribution that is mostly noise is worse
    // than not weighting at all.
    const trusted = axis.trustworthy && !axis.lopsided;
    const pool = axis.values.map(value => ({ ...value, weight: trusted ? value.weight : 1 }));
    let candidates = pool.filter(value => !conflicts(incompatible, chosen, axis.id, value.id));
    if (candidates.length === 0) candidates = pool;
    const picked = pickWeighted(candidates, unit(key, index, axis.id));
    chosen[axis.id] = picked.id;
    notes.push({
      axis: axis.id,
      label: axis.label,
      question: axis.question,
      value: picked.id,
      valueLabel: picked.label,
      basis: trusted
        ? `weighted: ${Math.round(picked.share * 100)}% of the catalog occupies this`
        : axis.recordedOnly
          ? 'uniform: recorded-only axis, no occupancy to weight against'
          : axis.lopsided
            ? `uniform: one value carries ${Math.round(axis.topShare * 100)}% of this axis, so its shape is a probe artefact`
            : `uniform: axis places ${axis.placed}/${occupancy.total}, too little to weight against`,
    });
  }
  return { index, chosen, notes, company: drawCompany(companyDeck, key, index) };
}

export function drawWave({ key, count, occupancy, axesDefinition, companyDeck }) {
  return Array.from({ length: count }, (_, index) =>
    drawBrief({ key, index, occupancy, axesDefinition, companyDeck }));
}

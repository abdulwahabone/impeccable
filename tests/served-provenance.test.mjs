// The roll API must not tell anyone which real page a world was influenced by.
//
// Deriving a world from a site is the same act as a designer carrying an
// influence into new work, and the output is defensible on exactly those terms.
// Naming the studio it came from turns a tradition into an accusation and
// invites a reading the work does not support. Which page a world came from is
// recorded in catalog/site-queue.json, which is never served.
//
// Two things are checked, because the protection currently rests on one
// allowlist that a single helpful edit could widen:
//
//   1. The served shape carries no provenance field. lineage in particular is
//      absent today only because publicConcept happens not to list it.
//   2. No field that IS served names a domain, in any concept in the catalog.
//      A brand name is no better inside form or spark than inside lineage, and
//      those two go out on every roll.

import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = readFileSync(path.join(ROOT, 'functions', 'api', '_worldroll-core.js'), 'utf8');
const catalog = JSON.parse(readFileSync(path.join(ROOT, 'catalog', 'concept-ingredients.json'), 'utf8'));
const concepts = (catalog.families || []).flatMap(family => family.concepts || []);

// Anything that would identify where a world came from rather than what it is.
const PROVENANCE_FIELDS = ['lineage', 'source', 'sourceUrl', 'derivedFrom', 'reference'];

// Served fields, read off publicConcept so the test follows the code.
const servedFields = (() => {
  const block = core.match(/const publicConcept = concept => \(\{([\s\S]*?)\}\);/);
  assert.ok(block, 'publicConcept should still be a literal shape in _worldroll-core.js');
  return [...block[1].matchAll(/^\s*([a-zA-Z]+):/gm)].map(match => match[1]);
})();

const DOMAINISH = /https?:\/\/|\b[a-z0-9-]{2,}\.(com|net|org|io|co|studio|design|agency|fr|jp|nl|pt|it|ca|dev|xyz|app)\b/i;

describe('served world provenance', () => {
  it('the public shape carries no field naming where a world came from', () => {
    for (const field of PROVENANCE_FIELDS) {
      assert.ok(
        !servedFields.includes(field),
        `publicConcept serves "${field}". Worlds derived from real sites must not tell a caller which page influenced them; the record lives in catalog/site-queue.json, which is never served.`,
      );
    }
  });

  it('serves the fields the catalog is actually reviewed on', () => {
    for (const field of ['form', 'spark', 'system', 'webLeverage']) {
      assert.ok(servedFields.includes(field), `publicConcept should still serve ${field}`);
    }
  });

  it('no served field of any concept names a domain', () => {
    const offenders = [];
    for (const concept of concepts) {
      for (const field of servedFields) {
        const value = concept[field];
        if (value === undefined) continue;
        const text = Array.isArray(value) ? value.join(' ') : String(value);
        if (DOMAINISH.test(text)) offenders.push(`${concept.id}.${field}: ${text.slice(0, 120)}`);
      }
    }
    assert.deepEqual(offenders, [], `these served fields name a domain:\n${offenders.join('\n')}`);
  });

  it('no lineage anywhere names a domain, served or not', () => {
    // Belt and braces: lineage is not served today, and this keeps the catalog
    // clean so that a future decision to serve it cannot leak anything.
    const offenders = concepts
      .filter(concept => concept.lineage && DOMAINISH.test(concept.lineage))
      .map(concept => `${concept.id}: ${concept.lineage.slice(0, 120)}`);
    assert.deepEqual(offenders, [], `these lineages name a domain:\n${offenders.join('\n')}`);
  });
});

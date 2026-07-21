#!/usr/bin/env node
/**
 * The mandatory input artifact for catalog sourcing/authoring agents.
 *
 * Emits everything an authoring round must know, in one document, so ad-hoc
 * corpus exports cannot silently drop the saturation data (the 2026-07-21
 * digital round shipped agents a hand-built export missing provenSeams and
 * paid for it with 8 of 15 entries landing in declared-saturated seams).
 *
 * Output: markdown on stdout. Shelf map first (entries grouped by family so
 * redundancy is visible at a glance), then the full qualityBar verbatim.
 *
 *   node scripts/catalog-authoring-context.mjs > /tmp/authoring-context.md
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(ROOT, 'catalog', 'concept-ingredients.json'), 'utf8'));
const reviews = JSON.parse(readFileSync(join(ROOT, 'catalog', 'concept-reviews.json'), 'utf8')).reviews;

const lines = [];
lines.push('# Catalog authoring context (generated; do not hand-edit)');
lines.push('');
lines.push(`Catalog ${catalog.catalogVersion}. Statuses: [approved3] flagship, [approved1] marginal, [rejected] dead vein, [pending] in review.`);
lines.push('');
lines.push('## Shelf map');
lines.push('');
lines.push('Entries grouped by family. A new candidate that would sit on one of these shelves next to an existing entry is redundant no matter how distinct its name; dedup happens at shelf level.');
for (const family of catalog.families) {
  lines.push('');
  lines.push(`### ${family.id} (${family.well})${family.description ? ` — ${family.description}` : ''}`);
  for (const concept of family.concepts) {
    const review = reviews[concept.id] || {};
    const status = `[${review.status || 'pending'}${review.rating || ''}]`;
    const note = review.note ? `  // ${review.note}` : '';
    lines.push(`- ${status} ${concept.form.split(',')[0]}${note}`);
  }
}
lines.push('');
lines.push('## qualityBar (verbatim)');
lines.push('');
lines.push('```json');
lines.push(JSON.stringify(catalog.qualityBar, null, 1));
lines.push('```');
process.stdout.write(lines.join('\n') + '\n');

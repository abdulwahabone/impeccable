#!/usr/bin/env node
// The whole authoring loop in one command, so expanding the catalog is a daily
// habit rather than an expedition.
//
// Before this, a wave meant driving five scripts by hand and dispatching the
// authoring yourself, which is why rounds happened rarely and each one
// re-decided what a world is. Everything here already existed except the
// authoring call; that was the only manual step and therefore the whole
// bottleneck.
//
//   node scripts/wave-run.mjs --mode read --count 10
//   node scripts/wave-run.mjs --mode read --count 6 --key monday --dry
//   node scripts/wave-run.mjs --mode read --count 10 --no-render
//
// It draws the briefs, authors against them concurrently, screens with both
// transfer probes, checks the batch against the catalog and against itself,
// merges the survivors as pending, and renders board, hero and the mode's own
// surface. What it never does is approve anything: the point of the loop is
// that a human decides, and the round ends at the review queue.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { drawBrief, loadWaveInputs } from './lib/wave-draw.mjs';
import { validateConceptEntry } from '../skill/scripts/lib/concept-catalog.mjs';

const ROOT = process.cwd();
for (const line of readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const mode = flag('mode', null);
const count = Number(flag('count', 6));
const key = flag('key', `wave-${Math.abs([...(mode || 'any')].reduce((a, c) => a * 31 + c.charCodeAt(0), 7))}-${count}`);
const model = flag('model', 'claude-opus-5');
const dry = args.includes('--dry');
const noRender = args.includes('--no-render');
const CONCURRENCY = Number(flag('concurrency', 4));

if (!process.env.ANTHROPIC_API_KEY) {
  process.stderr.write('set ANTHROPIC_API_KEY in .env\n');
  process.exit(1);
}

const outDir = path.join(ROOT, '.waves', key);
mkdirSync(outDir, { recursive: true });

const log = message => process.stdout.write(`${message}\n`);
const run = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8' });

// ---------------------------------------------------------------- 1. brief
log(`wave "${key}": ${count} worlds${mode ? `, mode ${mode}` : ''}, model ${model}`);
const briefArgs = ['scripts/wave-brief.mjs', '--key', key, '--count', String(count), '--out', path.join(outDir, 'briefs')];
if (mode) briefArgs.push('--mode', mode);
run('node', briefArgs);
const briefs = Array.from({ length: count }, (_, i) =>
  readFileSync(path.join(outDir, 'briefs', `${key}-${String(i + 1).padStart(2, '0')}.md`), 'utf8'));
log(`  briefs drawn`);

if (dry) {
  log(`\nDry run. Briefs are in ${path.relative(ROOT, path.join(outDir, 'briefs'))}`);
  process.exit(0);
}

// ---------------------------------------------------------------- 2. author
const guide = readFileSync(path.join(ROOT, 'docs', 'WORLD-CATALOG-AUTHORING.md'), 'utf8');
const catalog = JSON.parse(readFileSync(path.join(ROOT, 'catalog', 'concept-ingredients.json'), 'utf8'));
const families = (catalog.families || []).map(f => f.id);
// A shelf map rather than the whole catalog: the author needs to know what is
// already occupied, not to read 531 entries. Sending the corpus would also cost
// more per world than the world is worth.
const shelf = (catalog.families || []).map(f =>
  `${f.id}: ${(f.concepts || []).map(c => c.form.split(',')[0]).slice(0, 40).join(' | ')}`).join('\n');

const axisIds = (JSON.parse(readFileSync(path.join(ROOT, 'catalog', 'aesthetic-axes.json'), 'utf8')).axes || [])
  .map(axis => axis.id);

const anthropic = new Anthropic();

const SCHEMA = {
  type: 'object',
  required: ['id', 'familyId', 'form', 'lineage', 'spark', 'system', 'webLeverage', 'strength', 'tags', 'axes', 'avoid'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9-]+$' },
    familyId: { type: 'string', enum: families },
    form: { type: 'string', minLength: 40, maxLength: 360 },
    lineage: { type: 'string', minLength: 12, maxLength: 200 },
    spark: { type: 'string', minLength: 80, maxLength: 320 },
    // The API supports neither minItems above 1 nor maxItems, so array counts
    // are enforced by validateConceptEntry below and fed back on retry. The
    // per-item string lengths ARE supported and are worth keeping, because they
    // are what a hand-run wave got wrong first: every rule came back at five to
    // ten times the 180-character limit and left the catalog invalid.
    system: { type: 'array', items: { type: 'string', minLength: 12, maxLength: 180 } },
    webLeverage: { type: 'string', minLength: 20, maxLength: 240 },
    strength: { type: 'string', enum: ['world', 'dual'] },
    tags: { type: 'array', items: { type: 'string' } },
    avoid: { type: 'array', items: { type: 'string', minLength: 12, maxLength: 160 } },
    // Enumerated rather than open, because the API rejects a map-shaped object.
    // The keys are the aesthetic axes the brief drew, so listing them here also
    // stops a world recording an axis the coverage map cannot read.
    axes: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(axisIds.map(id => [id, { type: 'string' }])),
    },
  },
};

async function author(brief, index) {
  const label = `${String(index + 1).padStart(2, '0')}`;
  let feedback = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      // Streamed, not because the tokens are wanted incrementally but because the
      // SDK refuses a non-streaming request whose max_tokens implies more than
      // ten minutes of work. finalMessage() gives back the same shape create()
      // would have returned.
      const response = await anthropic.messages.stream({
        model,
        // Thinking tokens count against max_tokens, so a budget sized for the
        // JSON alone truncates the JSON. At 8000 the first operate wave lost
        // three of ten worlds to "Unexpected end of JSON input", which is a
        // parse error reporting a budget problem.
        max_tokens: 32000,
        thinking: { type: 'adaptive' },
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
        system: `You author world concepts for the impeccable catalog. Return one JSON object and nothing else.

THE QUALITY BAR
${guide}

WHAT THE CATALOG ALREADY HOLDS, by family. Do not repeat any of these at system level, meaning palette plus type voice, not merely by name.
${shelf}`,
        messages: [{ role: 'user', content: `${brief}\n\nid prefix: ${key}-\n${feedback}` }],
      }).finalMessage();
      // Say what actually happened. A truncated response fails in JSON.parse and
      // reads like the model returned nonsense, which sends you to the prompt
      // rather than to the budget.
      if (response.stop_reason === 'max_tokens') {
        throw new Error(`response hit max_tokens (${response.usage?.output_tokens} out), so the JSON is truncated`);
      }
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
      const concept = JSON.parse(text);
      const errors = validateConceptEntry(concept, {});
      if (errors.length) {
        feedback = `\nYour previous attempt failed validation. Fix exactly these and return the whole object again:\n${errors.join('\n')}`;
        throw new Error(errors[0]);
      }
      writeFileSync(path.join(outDir, `world-${label}.json`), `${JSON.stringify(concept, null, 1)}\n`);
      log(`  ok   ${label}  ${concept.form.split(',')[0].slice(0, 62)}`);
      return concept;
    } catch (error) {
      if (attempt === 3) { log(`  FAIL ${label}  ${error.message.slice(0, 400)}`); return null; }
    }
  }
  return null;
}

log(`\nauthoring ${count}, ${CONCURRENCY} at a time`);
const queue = briefs.map((brief, index) => ({ brief, index }));
const authored = [];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const job = queue.shift();
    const concept = await author(job.brief, job.index);
    if (concept) authored.push(concept);
  }
}));

if (!authored.length) { log('\nNothing authored. Stopping.'); process.exit(1); }
const bundlePath = path.join(outDir, 'candidates.json');
writeFileSync(bundlePath, JSON.stringify(authored, null, 1));

// ---------------------------------------------------------------- 3. screen
log(`\nscreening ${authored.length}`);
process.stdout.write(run('node', ['scripts/world-transfer-check.mjs', '--candidates', bundlePath])
  .split('\n').filter(l => /rules locked|clean on both/.test(l)).map(l => `  ${l.trim()}`).join('\n'));
log('');

// Dedup gates rather than reports. It used to print its verdict and merge
// everything anyway, which made it decoration: a run once merged six candidates
// it had just called too close to existing worlds. The whole reason this step
// sits before the render is that a near-duplicate spends the image budget twice.
// The report for a human, then the decision as data. Scraping the report was a
// mistake: the regex could not tell a CONVERGED pair from an "ok" one printed
// for context, so it cut worlds that had passed.
process.stdout.write(run('node', ['scripts/world-dedup.mjs', '--candidates', bundlePath])
  .split('\n').filter(l => /CONVERGED|too close|separated/.test(l)).map(l => `  ${l.trim()}`).join('\n'));
log('');
const { cut } = JSON.parse(run('node', ['scripts/world-dedup.mjs', '--candidates', bundlePath, '--json']));
const tooClose = new Set(cut);
const kept = authored.filter(concept => !tooClose.has(concept.id));
if (tooClose.size > 0) {
  log(`\ncutting ${tooClose.size} near-duplicate(s) before the render:`);
  for (const id of tooClose) log(`  ${id}`);
}
if (kept.length === 0) { log('\nEverything was a near-duplicate. Nothing merged.'); process.exit(1); }
writeFileSync(bundlePath, JSON.stringify(kept, null, 1));

// ---------------------------------------------------------------- 4. merge
log('\nmerging');
process.stdout.write(run('node', ['scripts/wave-merge.mjs', '--candidates', bundlePath, '--write'])
  .split('\n').filter(l => /Wrote|problem/.test(l)).map(l => `  ${l.trim()}`).join('\n'));
log('');

// ---------------------------------------------------------------- 5. render
if (!noRender) {
  log('\nrendering board, hero and docs');
  try {
    run('node', ['scripts/generate-world-cards.mjs', '--kind', 'all']);
    log('  render gate complete');
  } catch (error) {
    log(`  render failed: ${error.message.slice(0, 120)}`);
  }
}

log(`\n${kept.length} pending. Review at http://localhost:4321/labs/worlds`);
log('Approve, rate, and set modes there. Nothing here decides anything for you.');

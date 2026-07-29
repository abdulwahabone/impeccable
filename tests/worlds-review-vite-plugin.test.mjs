import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { describe, it } from 'node:test';
import { worldsReviewPlugin } from '../scripts/worlds-review-vite-plugin.mjs';
import { conceptContentHash } from '../skill/scripts/lib/concept-catalog.mjs';

const FIVE_RULE_SYSTEM = [
  'Palette/material: ink-dark ground, unbleached paper field, and one saturated signal color for the active decision',
  'Type/composition: compact grotesk labels over a generous editorial serif, ranked on a strict modular grid',
  'Topology/navigation: move between the whole field and one consequential detail',
  'Controls/state: reveal compare and preserve every meaningful authored state',
  'Responsive/motion: recompose the spatial law while retaining orientation',
];

function concept(id, form, spark) {
  return {
    id,
    form,
    lineage: 'A specific lineage of visual craft and spatial experience',
    tags: ['spatial-law', 'material-state', 'responsive-motion'],
    strength: 'dual',
    system: FIVE_RULE_SYSTEM,
    spark,
    webLeverage: 'WebGL rendering, direct manipulation, responsive motion, and deep-linked state',
  };
}

async function fixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'impeccable-worlds-'));
  const catalogDir = path.join(root, 'catalog');
  await mkdir(catalogDir, { recursive: true });
  await writeFile(path.join(catalogDir, 'concept-ingredients.json'), JSON.stringify({
    schemaVersion: 7,
    catalogVersion: 'test',
    qualityBar: {
      principle: 'Every concept must create an immediate mental image and turn its source world into meaningful interface structure.',
      rejectIf: ['generic software', 'decorative metaphor', 'weak causality', 'ordinary chrome', 'inaccessible spectacle'],
      reviewAxes: ['specificity', 'laws', 'yield', 'inevitability', 'interaction', 'legibility', 'elasticity', 'execution'],
    },
    wells: [
      { id: 'well-one', label: 'Well One', tier: 'graphic', description: 'Graphic systems whose compositional laws transfer to interface almost directly.' },
      { id: 'well-two', label: 'Well Two', tier: 'atmosphere', description: 'Material worlds with their own physics, topology, and memorable human experience.' },
      { id: 'well-three', label: 'Well Three', tier: 'interaction', description: 'Instruments and display hardware that already solved showing state to people.' },
      { id: 'well-four', label: 'Well Four', tier: 'atmosphere', description: 'Performed time: sequence and choreography of attention through time and space.' },
      { id: 'well-five', label: 'Well Five', tier: 'interaction', description: 'The browser and computation treated as the design material in its own right.' },
    ],
    families: [
      {
        id: 'editorial',
        label: 'Editorial',
        well: 'well-one',
        concepts: [
          concept(
            'editorial-field-guide',
            'a field guide, with specimen plates, branching keys, and index tabs',
            'Pressed specimens unfold into a moonlit field of branching veins, shifting habitats, and magnified traits that make every identification choice visibly consequential.'
          ),
          concept(
            'editorial-living-broadsheet',
            'a living broadsheet, with moving photographs, sectional rhythm, and spatial story layers',
            'A monumental front page wakes like a stage as photographs become moving windows and each opened headline carries the reader into a layered scene without losing the edition.'
          ),
        ],
      },
      {
        id: 'mapping',
        label: 'Mapping',
        well: 'well-three',
        concepts: [concept(
          'mapping-celestial-instrument',
          'a celestial instrument, with a dark horizon, rotating stars, and resolving position',
          'A dark horizon locks beneath a rotating field of stars; aligning one bright body with time and altitude slowly resolves uncertainty into a precise point.'
        )],
      },
      {
        id: 'material',
        label: 'Material',
        well: 'well-two',
        concepts: [concept(
          'material-blown-glass',
          'a blown-glass vessel, with molten breath, colored layers, and refracted light',
          'Molten glass gathers on a pipe and inflates with each breath while ribbons of color stretch through its walls and the whole room bends inside the cooling vessel.'
        )],
      },
      {
        id: 'performance',
        label: 'Performance',
        well: 'well-four',
        concepts: [concept(
          'performance-choreographic-field',
          'a choreographic field, with bodies, counterweight, rhythm, and charged negative space',
          'Bodies cross a dark stage as if joined by invisible tension; one gesture sends a delayed answer through the ensemble and makes the empty space between them feel alive.'
        )],
      },
      {
        id: 'dream',
        label: 'Dream',
        well: 'well-five',
        concepts: [concept(
          'dream-impossible-stair',
          'an impossible stair, with folding gravity, recursive rooms, and reversible thresholds',
          'A stair turns upward and arrives beneath itself; rooms fold through gravity while every crossed threshold quietly reverses what the visitor believed was inside and outside.'
        )],
      },
    ],
  }, null, 2));
  const catalog = JSON.parse(await readFile(path.join(catalogDir, 'concept-ingredients.json'), 'utf8'));
  const conceptById = new Map(catalog.families.flatMap(family => family.concepts.map(entry => [entry.id, entry])));
  const approvedReview = id => ({
    status: 'approved',
    reviewedBy: 'tester',
    reviewedAt: '2026-07-18T00:00:00.000Z',
    formHash: conceptContentHash(conceptById.get(id)),
  });
  await writeFile(path.join(catalogDir, 'concept-reviews.json'), JSON.stringify({
    schemaVersion: 2,
    reviews: {
      'editorial-living-broadsheet': approvedReview('editorial-living-broadsheet'),
      'mapping-celestial-instrument': approvedReview('mapping-celestial-instrument'),
      'material-blown-glass': approvedReview('material-blown-glass'),
      'performance-choreographic-field': approvedReview('performance-choreographic-field'),
    },
  }, null, 2));
  return root;
}

function handlerFor(root) {
  let route = '';
  let handler = null;
  worldsReviewPlugin({ root }).configureServer({
    middlewares: {
      use(pathname, middleware) {
        route = pathname;
        handler = middleware;
      },
    },
  });
  assert.equal(route, '/__impeccable/worlds');
  assert.equal(typeof handler, 'function');
  return handler;
}

function request(handler, body, headers = {}) {
  return new Promise(resolve => {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]);
    req.method = 'POST';
    req.headers = {
      host: 'localhost:4321',
      origin: 'http://localhost:4321',
      'content-type': 'application/json',
      ...headers,
    };
    const responseHeaders = {};
    const res = {
      statusCode: 0,
      setHeader(name, value) { responseHeaders[name] = value; },
      end(value) {
        resolve({ status: this.statusCode, headers: responseHeaders, body: JSON.parse(value) });
      },
    };
    handler(req, res);
  });
}

describe('worlds review dev middleware', () => {
  it('writes and clears human review decisions', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    const approved = await request(handler, { action: 'review', id: 'editorial-field-guide', status: 'approved' });
    assert.equal(approved.status, 200);
    const reviewsPath = path.join(root, 'catalog', 'concept-reviews.json');
    const reviews = JSON.parse(await readFile(reviewsPath, 'utf8'));
    assert.equal(reviews.reviews['editorial-field-guide'].status, 'approved');
    assert.equal(reviews.reviews['editorial-field-guide'].reviewedBy, 'pbakaus');
    const writtenCatalog = JSON.parse(await readFile(path.join(root, 'catalog', 'concept-ingredients.json'), 'utf8'));
    const reviewedConcept = writtenCatalog.families.flatMap(family => family.concepts).find(entry => entry.id === 'editorial-field-guide');
    assert.equal(reviews.reviews['editorial-field-guide'].formHash, conceptContentHash(reviewedConcept));

    const pending = await request(handler, { action: 'review', id: 'editorial-field-guide', status: 'pending' });
    assert.equal(pending.status, 200);
    const cleared = JSON.parse(await readFile(reviewsPath, 'utf8'));
    assert.equal(cleared.reviews['editorial-field-guide'], undefined);
  });

  it('stores an optional decision note and omits empty ones', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    const noted = await request(handler, {
      action: 'review',
      id: 'editorial-field-guide',
      status: 'rejected',
      note: '  too abstract, no design culture behind it  ',
    });
    assert.equal(noted.status, 200);
    const reviewsPath = path.join(root, 'catalog', 'concept-reviews.json');
    let reviews = JSON.parse(await readFile(reviewsPath, 'utf8'));
    assert.equal(reviews.reviews['editorial-field-guide'].note, 'too abstract, no design culture behind it');

    const unnoted = await request(handler, { action: 'review', id: 'editorial-field-guide', status: 'approved', note: '   ' });
    assert.equal(unnoted.status, 200);
    reviews = JSON.parse(await readFile(reviewsPath, 'utf8'));
    assert.equal(reviews.reviews['editorial-field-guide'].note, undefined);

    const tooLong = await request(handler, {
      action: 'review',
      id: 'editorial-field-guide',
      status: 'rejected',
      note: 'x'.repeat(501),
    });
    assert.equal(tooLong.status, 400);
    assert.match(tooLong.body.error, /500 characters/);
  });

  it('refuses to approve a composition-typed world entry', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    await request(handler, { action: 'strength', id: 'editorial-field-guide', strength: 'composition' });
    const approved = await request(handler, { action: 'review', id: 'editorial-field-guide', status: 'approved' });
    assert.equal(approved.status, 400);
    assert.match(approved.body.error, /composition catalog/);
    const rejected = await request(handler, { action: 'review', id: 'editorial-field-guide', status: 'rejected', note: 'composition, mine it' });
    assert.equal(rejected.status, 200);
  });

  it('rates approved concepts, clears with null, and survives a re-approve', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    const reviewsPath = path.join(root, 'catalog', 'concept-reviews.json');

    const early = await request(handler, { action: 'rate', id: 'editorial-field-guide', rating: 3 });
    assert.equal(early.status, 400);
    assert.match(early.body.error, /only applies to approved/);

    await request(handler, { action: 'review', id: 'editorial-field-guide', status: 'approved' });
    const rated = await request(handler, { action: 'rate', id: 'editorial-field-guide', rating: 3 });
    assert.equal(rated.status, 200);
    let reviews = JSON.parse(await readFile(reviewsPath, 'utf8'));
    assert.equal(reviews.reviews['editorial-field-guide'].rating, 3);

    // A re-approve (e.g. saving a note) must not drop the rating.
    await request(handler, { action: 'review', id: 'editorial-field-guide', status: 'approved', note: 'still great' });
    reviews = JSON.parse(await readFile(reviewsPath, 'utf8'));
    assert.equal(reviews.reviews['editorial-field-guide'].rating, 3);

    const invalid = await request(handler, { action: 'rate', id: 'editorial-field-guide', rating: 5 });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /1, 2, or 3/);

    const cleared = await request(handler, { action: 'rate', id: 'editorial-field-guide', rating: null });
    assert.equal(cleared.status, 200);
    reviews = JSON.parse(await readFile(reviewsPath, 'utf8'));
    assert.equal(reviews.reviews['editorial-field-guide'].rating, undefined);
  });

  it('updates concept content without changing its stable id and returns it to the backlog', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    const approved = await request(handler, { action: 'review', id: 'editorial-field-guide', status: 'approved' });
    assert.equal(approved.status, 200);
    const response = await request(handler, {
      action: 'update',
      id: 'editorial-field-guide',
      form: 'an expanded field guide, with specimen plates, branching keys, and index tabs',
      familyId: 'mapping',
      lineage: 'field reference publishing',
      tags: ['specimen-plate', 'branching-key', 'index-tab'],
      system: [
        'Palette/material: cream plate stock, botanical greens, and one wine-red accent reserved for the confirmed match',
        'Type/composition: italic latin binomials under compact caption labels, plates ranked on a fixed specimen grid',
        'Topology/navigation: route by habitat and specimen family',
        'Controls/state: carry observed, compared, and verified states',
        'Responsive/motion: reflow from overview atlas to focused identification key',
      ],
      spark: 'Pressed specimens unfold into a moonlit field of branching veins, shifting habitats, and magnified traits that make every identification choice visibly consequential.',
      webLeverage: 'let readers zoom, compare, and filter live specimen observations without losing place',
    });
    assert.equal(response.status, 200);
    const catalog = JSON.parse(await readFile(path.join(root, 'catalog', 'concept-ingredients.json'), 'utf8'));
    assert.equal(catalog.families[0].concepts.length, 1);
    assert.equal(catalog.families[1].concepts[0].id, 'editorial-field-guide');
    assert.match(catalog.families[1].concepts[0].form, /expanded field guide/);
    assert.equal(catalog.families[1].concepts[0].system.length, 5);
    assert.match(catalog.families[1].concepts[0].spark, /moonlit field/);
    assert.match(catalog.families[1].concepts[0].webLeverage, /zoom/);
    assert.equal(response.body.result.status, 'pending');
    const reviews = JSON.parse(await readFile(path.join(root, 'catalog', 'concept-reviews.json'), 'utf8'));
    assert.equal(reviews.reviews['editorial-field-guide'], undefined);
  });

  it('rejects edits that erase system grammar, creative spark, or web leverage', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    const response = await request(handler, {
      action: 'update',
      id: 'editorial-field-guide',
      form: 'an expanded field guide, with specimen plates, branching keys, and index tabs',
      familyId: 'mapping',
      lineage: 'field reference publishing',
      tags: ['specimen-plate', 'branching-key', 'index-tab'],
      system: [],
      spark: '',
      webLeverage: '',
    });
    assert.equal(response.status, 400);
    assert.match(response.body.error, /system grammar/i);

    const missingSpark = await request(handler, {
      action: 'update',
      id: 'editorial-field-guide',
      form: 'an expanded field guide, with specimen plates, branching keys, and index tabs',
      familyId: 'mapping',
      lineage: 'field reference publishing',
      tags: ['specimen-plate', 'branching-key', 'index-tab'],
      system: [
        'Palette/material: cream plate stock, botanical greens, and one wine-red accent reserved for the confirmed match',
        'Type/composition: italic latin binomials under compact caption labels, plates ranked on a fixed specimen grid',
        'Topology/navigation: route by habitat and specimen family',
        'Controls/state: carry observed, compared, and verified states',
        'Responsive/motion: reflow from overview atlas to focused identification key',
      ],
      spark: '',
      webLeverage: 'let readers zoom, compare, and filter live specimen observations without losing place',
    });
    assert.equal(missingSpark.status, 400);
    assert.match(missingSpark.body.error, /creative spark/i);
  });

  it('retypes strength without invalidating the review', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    const retyped = await request(handler, { action: 'strength', id: 'mapping-celestial-instrument', strength: 'composition' });
    assert.equal(retyped.status, 200);
    const catalog = JSON.parse(await readFile(path.join(root, 'catalog', 'concept-ingredients.json'), 'utf8'));
    const entry = catalog.families.flatMap(family => family.concepts).find(item => item.id === 'mapping-celestial-instrument');
    assert.equal(entry.strength, 'composition');
    const reviews = JSON.parse(await readFile(path.join(root, 'catalog', 'concept-reviews.json'), 'utf8'));
    assert.equal(reviews.reviews['mapping-celestial-instrument'].status, 'approved');

    const invalid = await request(handler, { action: 'strength', id: 'mapping-celestial-instrument', strength: 'vibe' });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error, /world, composition, or dual/);
  });

  it('rejects cross-origin writes', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    const response = await request(
      handler,
      { action: 'review', id: 'editorial-field-guide', status: 'approved' },
      { origin: 'https://example.com' }
    );
    assert.equal(response.status, 403);
    assert.match(response.body.error, /Cross-origin/);
  });

  it('protects the approved-well floor on destructive review changes', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    const response = await request(handler, {
      action: 'review',
      id: 'mapping-celestial-instrument',
      status: 'rejected',
    });
    assert.equal(response.status, 400);
    assert.match(response.body.error, /covering every challenger tier/i);
  });

  it('rejects a move that would empty a family or a literal software archetype', async () => {
    const root = await fixtureRoot();
    const handler = handlerFor(root);
    const solo = JSON.parse(await readFile(path.join(root, 'catalog', 'concept-ingredients.json'), 'utf8'))
      .families.find(family => family.id === 'dream').concepts[0];
    const emptyFamily = await request(handler, {
      action: 'update',
      ...solo,
      familyId: 'mapping',
    });
    assert.equal(emptyFamily.status, 400);
    assert.match(emptyFamily.body.error, /has no concepts/i);

    const bland = await request(handler, {
      action: 'update',
      id: 'editorial-field-guide',
      form: 'a digital platform and management console, with ordinary cards and status rows',
      familyId: 'editorial',
      lineage: 'Generic enterprise product design conventions',
      tags: ['cards', 'filters', 'status'],
      system: FIVE_RULE_SYSTEM,
      spark: 'A conventional application frame presents rows of tasks, colored status chips, and restrained panels with no distinctive material or spatial behavior of its own.',
      webLeverage: 'Responsive filtering, live state, keyboard navigation, and deep-linked views',
    });
    assert.equal(bland.status, 400);
    assert.match(bland.body.error, /literal software or operations archetype/i);
  });
});

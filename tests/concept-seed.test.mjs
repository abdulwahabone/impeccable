import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  conceptContentHash,
  readConceptCatalog,
  validateConceptCatalog,
  validateConceptEntry,
} from '../skill/scripts/lib/concept-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'skill', 'scripts', 'concept-seed.mjs');
const CATALOG_DIR = path.join(ROOT, 'catalog');

// concept-seed.mjs resolves its catalog once at module load, so the env var
// must be set before the import (hence the dynamic form).
process.env.IMPECCABLE_CATALOG_DIR = CATALOG_DIR;
const { renderChallenger, selectApprovedChallengers, selectApprovedStaging } = await import('../skill/scripts/concept-seed.mjs');

const TEST_WELLS = [
  { id: 'well-one', label: 'Well One', tier: 'graphic', description: 'Graphic systems whose compositional laws transfer to interface almost directly.' },
  { id: 'well-two', label: 'Well Two', tier: 'atmosphere', description: 'Material worlds with their own physics, topology, and memorable human experience.' },
  { id: 'well-three', label: 'Well Three', tier: 'interaction', description: 'Instruments and display hardware that already solved showing state to people.' },
  { id: 'well-four', label: 'Well Four', tier: 'atmosphere', description: 'Performed time: sequence and choreography of attention through time and space.' },
  { id: 'well-five', label: 'Well Five', tier: 'interaction', description: 'The browser and computation treated as the design material in its own right.' },
];

const TEST_SYSTEM = [
  'Palette/material: ink-dark ground, unbleached paper field, and one saturated signal color reserved for the active decision',
  'Type/composition: compact grotesk labels over generous editorial serif, ranked on a strict modular grid',
  'Topology/navigation: move between the whole field and one consequential detail',
  'Controls/state: reveal compare and preserve every meaningful authored state',
  'Responsive/motion: recompose the spatial law while retaining orientation',
];

function reviewFor(concept, status = 'approved') {
  return {
    status,
    reviewedBy: 'pbakaus',
    reviewedAt: '2026-07-18T00:00:00.000Z',
    formHash: conceptContentHash(concept),
  };
}

function run(scope, extraArgs = []) {
  return spawnSync(process.execPath, [SCRIPT, '--scope', scope, '--from', 'stable-test', ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf-8',
    env: { ...process.env, IMPECCABLE_CATALOG_DIR: CATALOG_DIR },
  });
}

describe('concept seed scopes', () => {
  it('keeps coupled-direction and established-world surface rolls reproducible but independent', () => {
    const directionA = run('direction');
    const directionB = run('direction');
    const surface = run('surface');
    assert.equal(directionA.status, 0);
    assert.equal(directionA.stdout, directionB.stdout);
    assert.notEqual(directionA.stdout, surface.stdout);
    assert.match(directionA.stdout, /DIRECTION CONCEPT SEED/);
    assert.match(directionA.stdout, /selected\s+independently/);
    assert.match(directionA.stdout, /substantially different future surface/);
    assert.match(directionA.stdout, /Never expose promotion metadata/);
    assert.match(directionA.stdout, /SYSTEM GRAMMAR:/);
    assert.match(directionA.stdout, /CREATIVE SPARK:/);
    assert.match(directionA.stdout, /WEB LEVERAGE:/);
    assert.doesNotMatch(directionA.stdout, /undefined/);
    assert.match(surface.stdout, /SURFACE CONCEPT SEED/);
    assert.match(surface.stdout, /committed visual identity/);
  });

  it('rejects unknown scopes', () => {
    const result = run('unknown');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /direction or surface/);
  });

  it('keeps staging challengers inside the requested surface mode', () => {
    const pool = [
      { id: 'persuade-stage', surface: 'persuade', status: 'approved' },
      { id: 'experience-stage', surface: 'experience', status: 'approved' },
    ];
    const experience = selectApprovedStaging({
      scope: 'direction',
      key: 'mode-match',
      mode: 'experience',
      sourceCompositions: pool,
    });
    const read = selectApprovedStaging({
      scope: 'direction',
      key: 'mode-missing',
      mode: 'read',
      sourceCompositions: pool,
    });
    assert.equal(experience?.id, 'experience-stage');
    assert.equal(read, null, 'a missing mode must not borrow an unrelated staging');

    const rendered = run('direction', ['--mode', 'experience']);
    assert.equal(rendered.status, 0);
    assert.match(rendered.stdout, /mode: experience/);
    assert.match(rendered.stdout, /--scope direction --mode experience --from stable-test/);
  });

  it('validates the web-generative catalog and human review gate', () => {
    const catalogPath = path.join(CATALOG_DIR, 'concept-ingredients.json');
    const reviewsPath = path.join(CATALOG_DIR, 'concept-reviews.json');
    const { catalog, reviewData, concepts } = readConceptCatalog(catalogPath, reviewsPath);
    const result = validateConceptCatalog(catalog, reviewData, { minimumTotal: 260 });

    assert.deepEqual(result.errors, []);
    assert.equal(result.stats.families, 26);
    assert.equal(result.stats.wells, 7);
    assert.deepEqual(
      catalog.wells.map(well => well.id),
      [
        'graphic-systems',
        'canon-movements',
        'vernacular-ephemera',
        'instruments-signals',
        'medium-native',
        'material-worlds',
        'performed-time',
      ]
    );
    assert.deepEqual(
      catalog.families.map(family => family.id),
      [
        'graphic-worlds-publishing',
        'posters-covers-sleeves',
        'notation-diagram-systems',
        'maps-journeys',
        'design-canon',
        'digital-design-canon',
        'brand-identity-canon',
        'vernacular-ephemera',
        'pop-culture-shelf',
        'signals-instruments',
        'machines-contraptions',
        'medium-native',
        'space',
        'earth-water-worlds',
        'living-worlds',
        'light-hidden-forces',
        'patterns-motion',
        'craft-making',
        'fashion-folded-worlds',
        'food-potioncraft',
        'mythical-worlds',
        'performance-spectacle',
        'architecture-places',
        'games-toys-physics-play',
        'festivals-public-life',
        'memory-ruins',
      ]
    );
    // The five high-transfer wells together must not be a minority of the corpus.
    const wellTotals = new Map();
    for (const family of catalog.families) {
      wellTotals.set(family.well, (wellTotals.get(family.well) || 0) + family.concepts.length);
    }
    const highTransfer = ['graphic-systems', 'canon-movements', 'vernacular-ephemera', 'instruments-signals', 'medium-native']
      .reduce((sum, well) => sum + (wellTotals.get(well) || 0), 0);
    assert.equal(highTransfer >= concepts.length * 0.45, true, `high-transfer wells hold ${highTransfer}/${concepts.length}`);
    const wellIds = new Set(catalog.wells.map(well => well.id));
    assert.equal(catalog.families.every(family => wellIds.has(family.well)), true);
    for (const well of catalog.wells) {
      assert.equal(catalog.families.some(family => family.well === well.id), true, `well ${well.id} has families`);
    }
    assert.equal(result.stats.concepts >= 260, true);
    assert.equal(catalog.families.every(family => family.concepts.length >= 2), true);
    assert.equal(result.stats.approved >= 3, true);
    assert.equal(result.stats.pending + result.stats.approved + result.stats.rejected, result.stats.concepts);
    assert.equal(concepts.every(concept => concept.system.length === 5 && concept.spark.length >= 80 && concept.webLeverage.length >= 20), true);
    assert.equal(
      concepts.filter(concept => concept.status === 'approved').length,
      result.stats.approved
    );
  });

  it('rejects concepts that name a motif without system grammar and web leverage', () => {
    const catalog = {
      schemaVersion: 7,
      catalogVersion: 'test',
      wells: TEST_WELLS,
      families: ['one', 'two', 'three'].map((family, index) => ({
        id: family,
        label: family,
        well: TEST_WELLS[index].id,
        concepts: [{
          id: `${family}-newspaper`,
          form: 'a newspaper front page, with headline hierarchy and columns',
          lineage: 'editorial publishing',
          tags: ['hierarchy', 'columns', 'serial'],
          strength: 'dual',
          ...(index === 0 ? {} : {
            system: TEST_SYSTEM,
            spark: 'Ink-dark columns break open into a field of live scenes, unfolding evidence, and reader-controlled depth while the edition retains one unmistakable rhythm.',
            webLeverage: 'stream live updates into addressable sections with reader-controlled pacing',
          }),
        }],
      })),
    };
    const reviewData = {
      schemaVersion: 2,
      reviews: Object.fromEntries(catalog.families.map(family => [family.concepts[0].id, reviewFor(family.concepts[0])])),
    };
    const result = validateConceptCatalog(catalog, reviewData);
    assert.equal(result.errors.some(error => error.includes('one-newspaper') && error.includes('system grammar')), true);
    assert.equal(result.errors.some(error => error.includes('one-newspaper') && error.includes('web leverage')), true);
  });

  it('rejects literal operations archetypes even when their UI grammar is complete', () => {
    const catalog = {
      schemaVersion: 7,
      catalogVersion: 'test',
      wells: TEST_WELLS,
      families: ['one', 'two', 'three'].map((family, index) => ({
        id: family,
        label: family,
        well: TEST_WELLS[index].id,
        concepts: [{
          id: `${family}-concept`,
          form: index === 0
            ? 'a mission control room, where panels, alerts, and operator stations coordinate a launch'
            : `a tidal cavern ${family}, where changing water levels reveal chambers, thresholds, and remembered routes`,
          lineage: 'immersive environmental experience and tidal geology',
          tags: ['depth', 'threshold', 'rhythm'],
          strength: 'dual',
          spark: 'Cold reflected light moves across the cavern ceiling as the tide opens one route, closes another, and leaves a bright mineral trace of every recent high-water mark.',
          system: [
            'Palette/material: wet basalt grays, cold green water light, and one warm mineral seam marking the active route',
            'Type/composition: narrow engraved capitals for chamber names over a quiet cartographic body voice',
            'Topology/navigation: move by chamber, waterline, and revealed threshold',
            'Controls/state: inspect exposed, flooding, submerged, and remembered states',
            'Responsive/motion: turn depth into a stepwise route and honor reduced motion',
          ],
          webLeverage: 'WebGL depth rendering with a complete keyboard-readable route index',
        }],
      })),
    };
    const reviewData = {
      schemaVersion: 2,
      reviews: Object.fromEntries(catalog.families.map(family => [family.concepts[0].id, reviewFor(family.concepts[0])])),
    };
    const result = validateConceptCatalog(catalog, reviewData);
    assert.equal(result.errors.some(error => error.includes('one-concept') && error.includes('operations archetype')), true);
  });

  it('welcomes materially specific craft tools instead of confusing them with operational software', () => {
    const errors = validateConceptEntry({
      id: 'cabinetmaker-workbench',
      form: "a cabinetmaker's workbench, where holdfasts, planing stops, shavings, and old cuts turn careful joinery into visible memory",
      lineage: 'Cabinetmaking benches, workholding craft, hand-planing practice, and tool-wear conservation',
      tags: ['workholding', 'joinery', 'patina'],
      strength: 'world',
      spark: 'Morning light crosses a blackened bench top as pale curls gather behind a plane, a holdfast rings into place, and fresh dovetails rise from a century of cuts.',
      system: [
        'Palette/material: blackened beech, pale shaving curls, and brass holdfast glints over a workshop-gray ground',
        'Type/composition: stamped maker marks and penciled layout lines ranked against a strong horizontal bench datum',
        'Topology/navigation: follow stock from reference face through marked joints and fitted assemblies',
        'Controls/state: clamp, mark, plane, pare, dry-fit, revise, and preserve grain direction',
        'Responsive/motion: unfold the bench into a project sequence and follow each hand gesture',
      ],
      webLeverage: 'Grain-aware direct manipulation, reversible project history, and a keyboard-readable construction diagram',
    });
    assert.deepEqual(errors, []);
  });

  it('selects six approved challengers, two from every translation tier', () => {
    for (let index = 0; index < 200; index += 1) {
      const { picks } = selectApprovedChallengers({ scope: 'surface', key: `coverage-${index}` });
      assert.equal(picks.length, 6);
      for (const tier of ['graphic', 'interaction', 'atmosphere']) {
        assert.equal(picks.filter(pick => pick.wellTier === tier).length, 2);
      }
      assert.equal(new Set(picks.map(pick => pick.id)).size, 6);
      assert.equal(new Set(picks.map(pick => pick.familyId)).size, 6);
      assert.equal(picks.every(pick => pick.status === 'approved'), true);
    }
  });

  it('re-rolls draw disjoint challengers and stay reproducible from the base key', () => {
    const rounds = [0, 1, 2].map(reroll =>
      selectApprovedChallengers({ scope: 'direction', key: 'reroll-chain', reroll })
    );
    const again = selectApprovedChallengers({ scope: 'direction', key: 'reroll-chain', reroll: 2 });
    assert.deepEqual(again.picks.map(pick => pick.id), rounds[2].picks.map(pick => pick.id));
    const seen = new Set();
    for (const round of rounds) {
      assert.equal(round.picks.length, 6);
      assert.equal(round.picks.every(pick => !seen.has(pick.id)), true);
      for (const pick of round.picks) seen.add(pick.id);
      for (const tier of ['graphic', 'interaction', 'atmosphere']) {
        assert.equal(round.picks.filter(pick => pick.wellTier === tier).length, 2);
      }
    }
  });

  it('renders re-roll rounds with elimination framing and a chained reproduction key', () => {
    const round0 = run('direction');
    const round1A = run('direction', ['--reroll', '1']);
    const round1B = run('direction', ['--reroll', '1']);
    assert.equal(round1A.status, 0);
    assert.equal(round1A.stdout, round1B.stdout);
    assert.notEqual(round1A.stdout, round0.stdout);
    assert.match(round1A.stdout, /RE-ROLL ROUND 1/);
    assert.match(round1A.stdout, /may not return reworded/);
    assert.match(round1A.stdout, /--from stable-test --reroll 1/);
    assert.doesNotMatch(round0.stdout, /RE-ROLL ROUND/);
    const invalid = run('direction', ['--reroll', 'nope']);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /non-negative integer/);
  });

  it('filters challengers by strength per scope and falls back when a tier has no match', () => {
    const make = (id, tier, strength) => ({
      id,
      familyId: `${id}-family`,
      wellId: `${id}-well`,
      wellTier: tier,
      strength,
      status: 'approved',
      form: `${id} form`,
      spark: `${id} spark`,
      system: [],
      webLeverage: `${id} web`,
    });
    const pool = [
      make('poster', 'graphic', 'world'),
      make('flipbook', 'graphic', 'composition'),
      make('radar', 'interaction', 'dual'),
      make('cavern', 'atmosphere', 'world'),
    ];
    for (let index = 0; index < 40; index += 1) {
      const direction = selectApprovedChallengers({ scope: 'direction', key: `d-${index}`, sourceConcepts: pool });
      assert.equal(direction.picks.every(pick => pick.strength !== 'composition'), true);
      const surface = selectApprovedChallengers({ scope: 'surface', key: `s-${index}`, sourceConcepts: pool });
      const surfaceGraphic = surface.picks.find(pick => pick.wellTier === 'graphic');
      assert.equal(surfaceGraphic.id, 'flipbook');
      // atmosphere has no composition|dual entries, so surface falls back to its full pool
      const surfaceAtmosphere = surface.picks.find(pick => pick.wellTier === 'atmosphere');
      assert.equal(surfaceAtmosphere.id, 'cavern');
    }
  });

  it('weights challenger draws by approval rating without shrinking the pool', () => {
    const make = (id, rating) => ({
      id,
      familyId: `${id}-family`,
      wellId: `${id}-well`,
      wellTier: 'graphic',
      strength: 'world',
      status: 'approved',
      form: `${id} form`,
      spark: `${id} spark`,
      system: [],
      webLeverage: `${id} web`,
      review: rating ? { status: 'approved', rating } : { status: 'approved' },
    });
    const filler = (tier, id) => ({
      ...make(id, undefined),
      wellTier: tier,
    });
    const pool = [
      make('flagship', 3),
      make('solid-a', 2),
      make('solid-b', undefined),
      make('marginal', 1),
      filler('interaction', 'radar'),
      filler('atmosphere', 'cavern'),
    ];
    const counts = { flagship: 0, 'solid-a': 0, 'solid-b': 0, marginal: 0 };
    for (let index = 0; index < 300; index += 1) {
      const { picks } = selectApprovedChallengers({ scope: 'direction', key: `weight-${index}`, sourceConcepts: pool });
      const graphicFirst = picks.find(pick => pick.wellTier === 'graphic');
      counts[graphicFirst.id] += 1;
    }
    assert.equal(counts.marginal, 0);
    // Two tickets should put the flagship on top roughly twice as often as an
    // unrated peer; a generous margin keeps the assertion deterministic-safe.
    assert.equal(counts.flagship > counts['solid-b'] * 1.3, true,
      `flagship ${counts.flagship} vs solid-b ${counts['solid-b']}`);

    // A tier holding only 1-star approvals still yields challengers.
    const onlyMarginal = [
      make('lone-marginal', 1),
      filler('interaction', 'radar2'),
      filler('atmosphere', 'cavern2'),
    ];
    const { picks } = selectApprovedChallengers({ scope: 'direction', key: 'lone', sourceConcepts: onlyMarginal });
    assert.equal(picks.some(pick => pick.id === 'lone-marginal'), true);
  });

  it('renders the vivid spark before system and browser leverage', () => {
    const output = renderChallenger({
      form: 'a spiral galaxy, where gravity, orbit, density, and darkness organize attention across radical scales',
      spark: 'A brilliant core holds the central promise while related ideas travel through spiral arms and distant fragments wait at the edge of perception.',
      system: [
        'Palette/material: deep space black, star-white points, and one warm core glow reserved for the focus',
        'Type/composition: hairline astronomical labels orbiting a monumental numeral voice',
        'Topology/navigation: orbit a stable core and travel by arm or scale',
        'Controls/state: focus, compare, capture, and release orbiting material',
        'Responsive/motion: collapse depth into a radial sequence and honor reduced motion',
      ],
      webLeverage: 'WebGL semantic zoom with a complete keyboard-readable DOM index',
    }, 0);
    assert.match(output, /spiral galaxy/);
    assert.match(output, /CREATIVE SPARK: A brilliant core/);
    assert.equal(output.indexOf('CREATIVE SPARK:') < output.indexOf('SYSTEM GRAMMAR:'), true);
  });
});

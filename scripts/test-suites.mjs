import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_SUITES = ['core'];
export const OPT_IN_SUITES = [];

const COMMON_INFRA_PATTERNS = [
  /^package\.json$/,
  /^bun\.lock$/,
  /^scripts\/run-tests\.mjs$/,
  /^scripts\/test-suites\.mjs$/,
];

export const SUITES = {
  core: {
    description: 'Site, catalog, and lab tests: docs integrity, world/composition catalogs, theme, slop catalog, Shiki themes, and the Live UI lab.',
    triggers: [
      ...COMMON_INFRA_PATTERNS,
      /^catalog\//,
      /^scripts\/(worlds-review-vite-plugin|validate-concept-catalog|sync-api-data)\.mjs$/,
      /^skill\/scripts\/(concept-seed|lib\/(composition-catalog|concept-catalog)|live\/ui-core)/,
      /^site\/(pages|content|components|layouts|scripts|styles|lib)\//,
      /^cli\/engine\//,
      /^tests\//,
    ],
    commands: [
      {
        runner: 'bun',
        files: [
          'tests/docs-integrity.test.js',
        ],
      },
      {
        runner: 'node',
        files: [
          'tests/concept-seed.test.mjs',
          'tests/live-ui-lab.test.mjs',
          'tests/shiki-theme.test.mjs',
          'tests/slop-catalog.test.mjs',
          'tests/theme.test.mjs',
          'tests/worlds-review-vite-plugin.test.mjs',
        ],
      },
    ],
  },
};

export function expandSuites(requested) {
  const names = requested.length === 0 ? ['default'] : requested;
  const expanded = [];
  for (const name of names) {
    if (name === 'default' || name === 'all-local') {
      expanded.push(...DEFAULT_SUITES);
    } else if (name === 'all') {
      expanded.push(...DEFAULT_SUITES, ...OPT_IN_SUITES);
    } else if (SUITES[name]) {
      expanded.push(name);
    } else {
      throw new Error(`Unknown test suite "${name}". Run: node scripts/run-tests.mjs --list`);
    }
  }
  return [...new Set(expanded)];
}

export function suiteFiles(suiteNames) {
  const files = [];
  for (const name of suiteNames) {
    const suite = SUITES[name];
    if (!suite) throw new Error(`Unknown test suite "${name}"`);
    for (const command of suite.commands) {
      files.push(...command.files);
    }
  }
  return files;
}

export function findTestFiles(root = process.cwd()) {
  const out = [];
  const stack = [path.join(root, 'tests')];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
      } else if (/\.test\.(js|mjs)$/.test(entry.name)) {
        out.push(path.relative(root, abs).split(path.sep).join('/'));
      }
    }
  }
  return out.sort();
}

export function matchesSuiteTriggers(suiteName, changedFiles) {
  const suite = SUITES[suiteName];
  if (!suite) throw new Error(`Unknown test suite "${suiteName}"`);
  return changedFiles.some((file) => suite.triggers?.some((pattern) => pattern.test(file)));
}

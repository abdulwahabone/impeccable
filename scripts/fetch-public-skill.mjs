#!/usr/bin/env node
// Materializes the public impeccable repo's skill/, cli/, and .claude-plugin/
// into this checkout. Those directories are gitignored here: this repo owns the
// catalog, the site, and the API, and the public repo owns the skill. Keeping a
// tracked mirror meant the two drifted silently, which is how the roll API ended
// up dealing one unfiltered staging while the seeder dealt three gated ones.
//
// Sources, in precedence order:
//   --force                  always the public main tarball, ignoring any
//                            override. The deploy path, so a release is
//                            provably built from the open-source repo.
//   IMPECCABLE_SKILL_SRC     a sibling checkout (e.g. ../impeccable), symlinked
//                            so co-development sees uncommitted work.
//   default                  the public main tarball.
//
// Already-materialized trees are left alone unless --force or --refresh is
// passed, so calling this from dev/build/test costs nothing after the first run.
// Every run records provenance in .skill-source.json; the deploy path refuses to
// ship a tree that came from a local checkout.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const TARBALL = 'https://github.com/pbakaus/impeccable/archive/refs/heads/main.tar.gz';
// .claude-plugin carries the released version the build stamps into every
// SKILL.md and version.json; without it the bundle keeps a stale number.
const OVERLAY_DIRS = ['skill', 'cli', '.claude-plugin'];
const STAMP = '.skill-source.json';

const force = process.argv.includes('--force');
const refresh = process.argv.includes('--refresh');
const override = process.env.IMPECCABLE_SKILL_SRC;

function readStamp() {
  try {
    return JSON.parse(readFileSync(STAMP, 'utf8'));
  } catch {
    return null;
  }
}

// Deploy correctness gate: a locally-sourced tree must never reach a release.
if (process.argv.includes('--assert-public')) {
  const stamp = readStamp();
  if (!stamp) {
    process.stderr.write('fetch-public-skill: no provenance stamp; run without --assert-public first\n');
    process.exit(1);
  }
  if (stamp.source !== 'public-main') {
    process.stderr.write(`fetch-public-skill: refusing to ship a tree sourced from ${stamp.source}\n`);
    process.exit(1);
  }
  process.stdout.write(`fetch-public-skill: provenance OK (${stamp.source} at ${stamp.materializedAt})\n`);
  process.exit(0);
}

const materialized = OVERLAY_DIRS.every(dir => existsSync(dir));
const stamp = readStamp();
if (materialized && stamp && !force && !refresh) {
  process.stdout.write(`fetch-public-skill: already materialized from ${stamp.source}, skipping\n`);
  process.exit(0);
}

function clearTargets() {
  // lstat, not exists: an override leaves symlinks behind, and rmSync must
  // remove the link rather than recurse into the sibling checkout and delete it.
  for (const dir of OVERLAY_DIRS) {
    try {
      lstatSync(dir);
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // nothing there yet
    }
  }
}

function materializeFromLocal(src) {
  const root = resolve(src);
  for (const dir of OVERLAY_DIRS) {
    if (!existsSync(join(root, dir))) {
      process.stderr.write(`fetch-public-skill: ${root} has no ${dir}/ (is IMPECCABLE_SKILL_SRC pointing at the impeccable repo?)\n`);
      process.exit(1);
    }
  }
  clearTargets();
  // Symlinks, not copies: the point of the override is that edits in the
  // sibling checkout are visible here immediately, with no re-sync step.
  for (const dir of OVERLAY_DIRS) symlinkSync(join(root, dir), dir, 'dir');
  let head = 'unknown';
  let dirty = false;
  try {
    head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    dirty = execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
  } catch {
    // not a git checkout; provenance still records the path
  }
  return { source: `local:${src}`, head, dirty, linked: true };
}

async function materializeFromPublic() {
  const work = mkdtempSync(join(tmpdir(), 'impeccable-public-'));
  try {
    const tarPath = join(work, 'main.tar.gz');
    const response = await fetch(TARBALL);
    if (!response.ok) throw new Error(`tarball fetch failed: HTTP ${response.status}`);
    writeFileSync(tarPath, Buffer.from(await response.arrayBuffer()));
    execFileSync('tar', ['-xzf', tarPath, '-C', work]);
    const extracted = join(work, 'impeccable-main');
    clearTargets();
    for (const dir of OVERLAY_DIRS) cpSync(join(extracted, dir), dir, { recursive: true });
    return { source: 'public-main', head: 'unknown', dirty: false, linked: false };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// --force is the deploy path and must ignore any developer override.
const provenance = (!force && override)
  ? materializeFromLocal(override)
  : await materializeFromPublic();

writeFileSync(STAMP, `${JSON.stringify({
  ...provenance,
  dirs: OVERLAY_DIRS,
  materializedAt: new Date().toISOString(),
}, null, 2)}\n`);

const how = provenance.linked ? 'symlinked' : 'copied';
const note = provenance.dirty ? ' (sibling checkout has uncommitted changes)' : '';
process.stdout.write(`fetch-public-skill: ${how} ${OVERLAY_DIRS.join(', ')} from ${provenance.source}${note}\n`);

#!/usr/bin/env node
// Fetches the public impeccable repo's main branch and overlays its skill/
// and cli/ directories into this checkout before the site build, so the
// distributed skill bundles and detector imports are provably built from the
// open-source repo, never from this repo's local mirror copies.
//
// Runs the overlay only on Cloudflare Pages (CF_PAGES) or with --force;
// locally the tracked mirrors serve dev convenience and this is a no-op.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARBALL = 'https://github.com/pbakaus/impeccable/archive/refs/heads/main.tar.gz';
const OVERLAY_DIRS = ['skill', 'cli'];

if (!process.env.CF_PAGES && !process.argv.includes('--force')) {
  process.stdout.write('fetch-public-skill: local run without --force, keeping mirror copies\n');
  process.exit(0);
}

const work = mkdtempSync(join(tmpdir(), 'impeccable-public-'));
try {
  const tarPath = join(work, 'main.tar.gz');
  const response = await fetch(TARBALL);
  if (!response.ok) throw new Error(`tarball fetch failed: HTTP ${response.status}`);
  writeFileSync(tarPath, Buffer.from(await response.arrayBuffer()));
  execFileSync('tar', ['-xzf', tarPath, '-C', work]);
  const extracted = join(work, 'impeccable-main');
  for (const dir of OVERLAY_DIRS) {
    rmSync(dir, { recursive: true, force: true });
    cpSync(join(extracted, dir), dir, { recursive: true });
  }
  process.stdout.write(`fetch-public-skill: overlaid ${OVERLAY_DIRS.join(', ')} from public main\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

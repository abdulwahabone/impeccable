import { describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { ANTIPATTERNS } from '../cli/engine/registry/antipatterns.mjs';
import { renderCommandDemo } from '../site/scripts/demo-renderer.js';

const ROOT = process.cwd();

function walk(dir, predicate, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, predicate, out);
    } else if (predicate(abs)) {
      out.push(abs);
    }
  }
  return out;
}

function normalizeRoute(route) {
  if (route === '/') return route;
  return route.replace(/\/$/, '');
}

function pageRoute(file) {
  const rel = path.relative(path.join(ROOT, 'site/pages'), file).replaceAll(path.sep, '/');
  if (rel.includes('[') || !rel.endsWith('.astro')) return null;
  const stem = rel.replace(/\.astro$/, '');
  if (stem === 'index') return '/';
  if (stem.endsWith('/index')) return normalizeRoute(`/${stem.slice(0, -'/index'.length)}`);
  return normalizeRoute(`/${stem}`);
}

function knownRoutes() {
  const routes = new Set();

  for (const file of walk(path.join(ROOT, 'site/pages'), file => file.endsWith('.astro'))) {
    const route = pageRoute(file);
    if (route) routes.add(route);
  }

  for (const file of fs.readdirSync(path.join(ROOT, 'site/content/skills')).filter(file => file.endsWith('.md'))) {
    routes.add(`/docs/${file.replace(/\.md$/, '')}`);
  }
  routes.add('/docs');

  for (const file of fs.readdirSync(path.join(ROOT, 'site/content/tutorials')).filter(file => file.endsWith('.md'))) {
    routes.add(`/tutorials/${file.replace(/\.md$/, '')}`);
  }
  routes.add('/tutorials');

  const referenceDir = path.join(ROOT, 'site/content/reference');
  if (fs.existsSync(referenceDir)) {
    for (const file of fs.readdirSync(referenceDir).filter(file => file.endsWith('.md'))) {
      routes.add(`/docs/${file.replace(/\.md$/, '')}`);
    }
  }

  if (fs.existsSync(path.join(ROOT, 'site/public/neo-mirai/index.html'))) {
    routes.add('/neo-mirai');
  }

  return routes;
}

function docsFiles() {
  const roots = ['site/pages', 'site/content', 'site/components', 'site/layouts'];
  return roots.flatMap(root => walk(path.join(ROOT, root), file => /\.(astro|md|ts|js)$/.test(file)));
}

function routeFromUrl(url) {
  if (!url.startsWith('/') || url.startsWith('//')) return null;
  if (url.startsWith('/api/') || url.startsWith('/_data/')) return null;

  const clean = url.split('#')[0].split('?')[0];
  if (!clean) return '/';

  if (
    clean.startsWith('/assets/') ||
    clean.startsWith('/antipattern-') ||
    clean.startsWith('/js/') ||
    clean.startsWith('/neo-mirai/assets/')
  ) {
    return null;
  }

  if (path.extname(clean)) return null;
  return normalizeRoute(clean);
}

describe('docs integrity', () => {
  test('separates durable world creation from collaborative surface concepts', () => {
    const init = fs.readFileSync(path.join(ROOT, 'skill/reference/init.md'), 'utf8');
    const newWork = fs.readFileSync(path.join(ROOT, 'skill/reference/new-work.md'), 'utf8');
    const shape = fs.readFileSync(path.join(ROOT, 'skill/reference/shape.md'), 'utf8');
    const craft = fs.readFileSync(path.join(ROOT, 'skill/reference/craft.md'), 'utf8');
    const skill = fs.readFileSync(path.join(ROOT, 'skill/SKILL.src.md'), 'utf8');
    const buildFloor = fs.readFileSync(path.join(ROOT, 'skill/reference/build-floor.md'), 'utf8');
    const document = fs.readFileSync(path.join(ROOT, 'skill/reference/document.md'), 'utf8');
    const codex = fs.readFileSync(path.join(ROOT, 'skill/reference/codex.md'), 'utf8');
    const typeset = fs.readFileSync(path.join(ROOT, 'skill/reference/typeset.md'), 'utf8');
    const context = fs.readFileSync(path.join(ROOT, 'skill/scripts/context.mjs'), 'utf8');

    expect(init).toContain('durable product truth');
    expect(init).toContain('does not invent a visual world');
    expect(init).toContain('does not write DESIGN.md');
    expect(init).toContain('If the file is absent, init is incomplete');
    expect(init).not.toContain('## Audience World');

    expect(newWork).toContain('Missing DESIGN.md does not route back to init');
    expect(newWork).toContain('Shape or select the direction');
    expect(newWork).toContain('concept-seed.mjs --scope direction --mode');
    expect(newWork).toContain('concept-seed.mjs --scope surface --mode');
    expect(newWork).toContain('persuade, operate, read, or experience');
    expect(skill).toContain('what the visitor\'s success looks like');
    expect(skill).toContain('a docs index is Read, not Persuade');
    expect(newWork).toContain('Local extension (B or C): inherit, do not reseed');
    expect(newWork).toContain('Never run it for a local extension');
    expect(newWork).toContain('Do not select a new world and its first surface concept in separate tournaments');
    expect(newWork).toContain('do not reopen either half independently');
    expect(newWork).toContain("audience's cultural home");
    expect(newWork).toContain('category default and its predictable contrarian response');
    expect(newWork).toContain('system leverage, and use of the medium');
    expect(newWork).toContain('discard the source carrier, materials, and vocabulary unless product evidence earns them');
    expect(newWork).toContain('.impeccable/surfaces/<target-slug>.md');
    expect(newWork).toContain('DIRECTION CONTRACT');
    expect(newWork).toContain('`THESIS`: the product-specific idea');
    expect(newWork).toContain('`BAR-RAISER`: the product-native use');
    expect(newWork).toContain('routine functional state alone does not clear the bar');
    expect(newWork).toContain('non-routine bar-raiser');
    expect(newWork).toContain('first-surface expression, bar-raiser, cross-surface consequence');
    expect(newWork).toContain('veto rather than rationalize');
    expect(newWork).toContain('every relationship it visualizes exists in product truth; resemblance is not evidence');
    expect(newWork).toContain("removing its bar-raiser materially weakens the surface's central argument or use");
    expect(newWork).toContain('on the primary device and within the real asset and tool budget');
    expect(newWork).toContain('not a probable violation of the brief or audience');
    expect(newWork).toContain('Passing some floors never rescues a failed one');
    expect(newWork.match(/Apply the candidate floor/g)?.length).toBe(2);
    expect(newWork).toContain('[codex.md](codex.md)');
    expect(newWork).toContain('Commit before correcting');
    expect(newWork).toContain('judge survivors skin-blind');
    expect(newWork).toContain('Present, visualize, re-roll');
    expect(newWork).toContain('When the harness can generate images');
    expect(newWork).toContain('no image persists as a project file');
    expect(newWork).toContain('eliminates every candidate presented so far');
    expect(newWork).toContain('optional one-line steer');
    expect(newWork).toContain('--from <key> --reroll <round>');
    expect(newWork).toContain('ask what quality is missing before rolling a third time');
    expect(newWork).not.toContain('palette.mjs');

    expect(shape).toContain('follow [new-work.md](new-work.md)');
    expect(shape).toContain('Ask two or three related questions per round');
    expect(shape).toContain('shape never writes code or a direction contract');
    expect(craft).toContain('deprecated alias');
    expect(craft).toContain('adds no setup, interview, checkpoint, tool, or quality behavior');
    expect(skill).toContain('[reference/build-floor.md](reference/build-floor.md) immediately before editing UI');
    expect(buildFloor).toContain('do not rely on transform/opacity alone');
    expect(newWork).toContain('The old DESIGN.md and implementation are not authority');
    expect(newWork).toContain('Do not offer replacement worlds unless the user asked for a redesign');
    expect(document).toContain('Run **Select one direction**');
    expect(document).toContain('requires a concrete first surface');
    expect(codex).toContain('this file must not reopen it');
    expect(codex).toContain('Do not generate a palette artifact');
    expect(typeset).toContain('route through [new-work.md](new-work.md)');
    expect(skill).not.toContain('reference/finish.md');
    expect(buildFloor).toContain('manual scan only when no automatic detector is active');
    expect(context).toContain('renderLlmOnlySlopReview');
    expect(context).toContain('automaticHookMode');
  });

  test('internal docs links point at canonical local routes', () => {
    const routes = knownRoutes();
    const broken = [];

    for (const file of docsFiles()) {
      const rel = path.relative(ROOT, file);
      const src = fs.readFileSync(file, 'utf8');
      const urls = [];

      for (const match of src.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
        urls.push(match[1]);
      }
      for (const match of src.matchAll(/\]\((\/[^)\s]+)\)/g)) {
        urls.push(match[1]);
      }

      for (const url of urls) {
        const route = routeFromUrl(url);
        if (route && !routes.has(route)) {
          broken.push(`${rel}: ${url}`);
        }
      }
    }

    expect(broken).toEqual([]);
  });

  test('public docs use source-of-truth command and detector counts', () => {
    const commandMetadata = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'skill/scripts/command-metadata.json'), 'utf8')
    );
    const commandCount = Object.keys(commandMetadata).length;
    const detectorCount = new Set(ANTIPATTERNS.map(rule => rule.id)).size;

    const files = [
      'README.md',
      'README.npm.md',
      'site/pages/index.astro',
      'site/content/tutorials/getting-started.md',
      'site/content/skills/impeccable.md',
      'site/public/llms.txt',
    ];

    const stale = [];
    const commandPattern = /\b(\d+)\s+(?:sub-)?commands\b|\b(\d+)\s+steering commands\b/gi;
    const detectorPattern = /\b(\d+)\s+(?:deterministic\s+)?(?:detector\s+)?(?:rules|detections|checks|patterns)\b/gi;

    for (const rel of files) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');

      for (const match of src.matchAll(commandPattern)) {
        const count = Number(match[1] || match[2]);
        if (count !== commandCount && count !== 1) {
          stale.push(`${rel}: "${match[0]}" should be ${commandCount}`);
        }
      }

      for (const match of src.matchAll(detectorPattern)) {
        const count = Number(match[1]);
        if (count > 10 && count !== detectorCount) {
          stale.push(`${rel}: "${match[0]}" should be ${detectorCount}`);
        }
      }
    }

    expect(stale).toEqual([]);
  });

  test('command demo theme rules stay scoped to their page and theme', () => {
    const homeCss = fs.readFileSync(path.join(ROOT, 'site/styles/home-kinpaku.css'), 'utf8');
    const lightCss = fs.readFileSync(path.join(ROOT, 'site/styles/light-mode.css'), 'utf8');
    const docsCss = fs.readFileSync(path.join(ROOT, 'site/styles/docs-kinpaku.css'), 'utf8');
    const demoScope = ':is(.spread-demo-area, .terminal-preview, .mobile-demo-area) .demo-split-comparison';
    const affectedDemos = {
      clarify: ['Save and Continue →'],
      quieter: ['View Plans'],
      bolder: ['Learn More'],
      polish: ['JD', 'Edit Profile'],
    };

    for (const [command, labels] of Object.entries(affectedDemos)) {
      const markup = renderCommandDemo(command);
      const darkFillCount = markup.split('background: var(--color-ink)').length - 1;

      expect(darkFillCount).toBe(labels.length);
      for (const label of labels) expect(markup).toContain(label);
    }

    expect(homeCss).toContain(
      `html.dark .home-kinpaku ${demoScope} [style*="color: #92400e"]`
    );
    expect(homeCss).toContain(
      `html.dark .home-kinpaku ${demoScope} [style*="background: var(--color-ink)"]`
    );
    expect(homeCss).toContain(
      `html.light .home-kinpaku ${demoScope} [style*="color: var(--color-accent)"]`
    );
    expect(homeCss).not.toContain(
      `\n.home-kinpaku ${demoScope} [style*="color: #92400e"]`
    );
    expect(homeCss).not.toContain(
      `\n.home-kinpaku ${demoScope} [style*="background: var(--color-ink)"]`
    );

    expect(docsCss).toMatch(
      /\.docs-kinpaku \.docs-command-demo \.split-after\s*\{[^}]*background:\s*var\(--ks-lacquer\);/
    );
    expect(lightCss).toMatch(
      /html\.light \.docs-kinpaku \.docs-command-demo \.split-after\s*\{[^}]*background:\s*var\(--ks-lacquer-raised\);/
    );
  });
});

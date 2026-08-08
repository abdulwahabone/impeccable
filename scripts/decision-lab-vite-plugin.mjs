// Dev middleware for the decision lab (/labs/decision): spawns the REAL
// serve-question.mjs from this repo's materialized skill/ against scenario
// fixtures, so the lab exercises the exact code path a live direction round
// uses — link a sibling checkout via IMPECCABLE_SKILL_SRC and uncommitted
// skill edits render here immediately. Never a replica.
//
// Each started scenario runs in its own temp cwd so `.impeccable/questions`
// state never lands in this repo. Endpoints (dev server only):
//   POST /labs/decision/api/start    { "scenario": "comp-round" } -> { url, key }
//   POST /labs/decision/api/collect  { "key" }  -> { code, out }   (one --wait pass)
//   POST /labs/decision/api/stop     { "key" }  -> { stopped: true }
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SCRIPT = path.join(ROOT, 'skill', 'scripts', 'serve-question.mjs');
const FIXTURES = path.join(ROOT, 'site', 'labs-fixtures', 'decision');

const running = new Map(); // key -> { cwd }

function run(args, cwd) {
  return new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, ...args], {
      cwd,
      env: { ...process.env, IMPECCABLE_QUESTION_FORCE: '1' },
      timeout: 30000,
    }, (error, stdout, stderr) => {
      resolve({ code: error ? (error.code ?? 1) : 0, out: `${stdout}${stderr}`.trim() });
    });
  });
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  try { return JSON.parse(body || '{}'); } catch { return {}; }
}

const json = (res, status, data) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(data));
};

export function decisionLabPlugin() {
  return {
    name: 'decision-lab',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/labs/decision/api', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
        const route = req.url.replace(/\?.*$/, '');
        const body = await readBody(req);
        try {
          if (route === '/start') {
            const scenario = String(body.scenario || '');
            if (!/^[a-z0-9-]+$/.test(scenario)) return json(res, 400, { error: 'bad scenario name' });
            const fixture = path.join(FIXTURES, `${scenario}.json`);
            if (!existsSync(fixture)) return json(res, 404, { error: 'unknown scenario' });
            if (!existsSync(SCRIPT)) return json(res, 500, { error: 'skill/ not materialized; run: node scripts/fetch-public-skill.mjs' });
            const cwd = mkdtempSync(path.join(tmpdir(), `decision-lab-${scenario}-`));
            writeFileSync(path.join(cwd, 'payload.json'), readFileSync(fixture, 'utf8'));
            const started = await run(['--start', '--payload', 'payload.json'], cwd);
            const url = started.out.match(/QUESTION URL: (\S+)/)?.[1];
            const key = started.out.match(/QUESTION KEY: (\S+)/)?.[1];
            if (!url || !key) return json(res, 500, { error: 'server failed to start', detail: started.out });
            running.set(key, { cwd });
            return json(res, 200, { url, key });
          }
          if (route === '/collect') {
            const entry = running.get(String(body.key || ''));
            if (!entry) return json(res, 404, { error: 'unknown key' });
            const collected = await run(['--wait', '--key', String(body.key), '--poll', '3'], entry.cwd);
            return json(res, 200, collected);
          }
          if (route === '/stop') {
            const key = String(body.key || '');
            const entry = running.get(key);
            if (entry) {
              await run(['--stop', '--key', key], entry.cwd);
              running.delete(key);
            }
            return json(res, 200, { stopped: true });
          }
          return json(res, 404, { error: 'unknown route' });
        } catch (error) {
          return json(res, 500, { error: String(error?.message || error) });
        }
      });
    },
  };
}

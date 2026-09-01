import test from 'node:test';
import assert from 'node:assert/strict';

import { onRequestGet } from '../functions/api/download/bundle/[provider].js';

function context({ provider = 'universal', version = '4.1.2', versionStatus = 200 } = {}) {
  return {
    params: { provider },
    request: new Request('https://impeccable.style/api/download/bundle/universal'),
    env: {
      ASSETS: {
        async fetch(request) {
          assert.equal(new URL(request.url ?? request).pathname, '/_data/api/version.json');
          return new Response(JSON.stringify({ skills: version }), { status: versionStatus });
        },
      },
    },
  };
}

test('bundle downloads redirect to the matching skill release asset', async () => {
  const response = await onRequestGet(context());

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    'https://github.com/pbakaus/impeccable/releases/download/skill-v4.1.2/universal.zip'
  );
});

test('bundle downloads reject unsupported providers before reading metadata', async () => {
  const response = await onRequestGet(context({ provider: 'unknown' }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Invalid provider' });
});

test('bundle downloads fail closed on invalid release metadata', async () => {
  const response = await onRequestGet(context({ version: '../../latest' }));

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'Invalid bundle release metadata' });
});

test('bundle downloads surface missing release metadata', async () => {
  const response = await onRequestGet(context({ versionStatus: 404 }));

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'Bundle release metadata not found' });
});

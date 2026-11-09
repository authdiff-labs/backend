import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { createReviewServer } from './app.mjs';

let server;
let base;

before(async () => {
  server = createReviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});

after(() => new Promise(resolve => server.close(resolve)));

const post = (path, body) => fetch(base + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});

test('reports health without touching fixtures', async () => {
  const response = await fetch(base + '/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('serves the workbench and both review examples', async () => {
  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /AuthDiff/);

  for (const path of ['/example', '/testnet-example']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(payload.before);
    assert.ok(payload.after);
  }
});

test('compares normalized trees and returns a summary', async () => {
  const example = await (await fetch(base + '/example')).json();
  const response = await post('/compare', example);
  assert.equal(response.status, 200);
  const { changes, summary } = await response.json();
  assert.equal(changes.length, 1);
  assert.equal(changes[0].kind, 'argument-changed');
  assert.equal(summary.total, 1);
  assert.equal(summary.counts['argument-changed'], 1);
});

test('compares raw authorization XDR captures', async () => {
  const capture = await (await fetch(base + '/testnet-example')).json();
  const response = await post('/compare-xdr', capture);
  assert.equal(response.status, 200);
  const { changes } = await response.json();
  assert.equal(changes.length, 1);
  assert.equal(changes[0].before.decimal, '100');
  assert.equal(changes[0].after.decimal, '250');
});

test('rejects malformed, unknown and oversized requests', async () => {
  assert.equal((await post('/compare', '{')).status, 400);
  assert.equal((await post('/compare', { before: [], after: {} })).status, 400);
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await post('/health', {})).status, 404);
  assert.equal((await post('/compare', 'x'.repeat(300000))).status, 413);
});

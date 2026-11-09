import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { compareAuthorization } from '../auth-tree-core/index.mjs';
import { decodeAuthorization } from './decode.mjs';

const fixture = JSON.parse(await readFile(new URL('../fixtures/testnet-approve.json', import.meta.url)));

test('replays the captured Stellar testnet authorization delta', () => {
  const before = decodeAuthorization(fixture.before);
  const after = decodeAuthorization(fixture.after);
  assert.equal(before[0].principal, fixture.before.source);
  assert.equal(before[0].root.contract, fixture.contract);
  assert.equal(before[0].root.method, 'approve');
  assert.deepEqual(compareAuthorization(before, after), fixture.changes);
});

test('rejects an invalid source account and malformed authorization entries', () => {
  assert.throws(() => decodeAuthorization({ ...fixture.before, source: 'invalid' }));
  assert.throws(() => decodeAuthorization({ ...fixture.before, auth: ['!!!!!'] }), /base64/);
  assert.throws(() => decodeAuthorization({ ...fixture.before, auth: ['AAAA'] }));
});

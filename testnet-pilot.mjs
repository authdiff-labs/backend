import { Account, Address, Asset, BASE_FEE, Contract, Keypair, Networks, TransactionBuilder, nativeToScVal } from '@stellar/stellar-sdk';
import { writeFile } from 'node:fs/promises';
import { decodeAuthorization } from './decode.mjs';
import { compareAuthorization } from '../auth-tree-core/index.mjs';

const endpoint = 'https://soroban-testnet.stellar.org';
const source = process.env.AUTHDIFF_TESTNET_SOURCE || 'GAUA6YRL7KQPEW2XUJPZLMCYLPBOQJGLQCSIBGOWSRC64ZBOHF7Y27HA';
let id = 0;
async function rpc(method, params = {}) {
  const requestId = ++id;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw Error('RPC HTTP ' + response.status);
  const payload = await response.json();
  if (payload.error || payload.id !== requestId || !payload.result) {
    throw Error('RPC failed: ' + JSON.stringify(payload.error ?? payload));
  }
  return payload.result;
}
const network = await rpc('getNetwork');
if (network.passphrase !== Networks.TESTNET) throw Error('Expected Stellar testnet');
const head = await rpc('getLatestLedger');
const accountResponse = await fetch('https://horizon-testnet.stellar.org/accounts/' + source, {
  signal: AbortSignal.timeout(20000)
});
if (!accountResponse.ok) throw Error('Provide a funded testnet account via AUTHDIFF_TESTNET_SOURCE');
const account = await accountResponse.json();
const spender = Keypair.random().publicKey();
const contract = new Contract(Asset.native().contractId(Networks.TESTNET));
const expiryLedger = head.sequence + 100;
async function capture(amount) {
  const tx = new TransactionBuilder(new Account(source, account.sequence), {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET
  }).addOperation(contract.call('approve',
    Address.fromString(source).toScVal(),
    Address.fromString(spender).toScVal(),
    nativeToScVal(amount, { type: 'i128' }),
    nativeToScVal(expiryLedger, { type: 'u32' })
  )).setTimeout(120).build();
  const result = await rpc('simulateTransaction', { transaction: tx.toXDR(), authMode: 'record' });
  if (result.error || result.results?.length !== 1 || !result.results[0].auth?.length) {
    throw Error('Expected recorded authorization: ' + (result.error || 'no auth entries'));
  }
  return { source, auth: result.results[0].auth, latestLedger: result.latestLedger };
}
const before = await capture(100n);
const after = await capture(250n);
const changes = compareAuthorization(decodeAuthorization(before), decodeAuthorization(after));
if (changes.length !== 1 || changes[0].kind !== 'argument-changed' ||
    changes[0].before.decimal !== '100' || changes[0].after.decimal !== '250') {
  throw Error('Unexpected testnet authorization delta: ' + JSON.stringify(changes));
}
const evidence = { network: 'testnet', endpoint, contract: contract.contractId(), function: 'approve',
  mode: 'unsigned RPC simulation only', capturedAt: new Date().toISOString(), before, after, changes };
await writeFile(process.argv[2] || 'testnet-evidence.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ ledgers: [before.latestLedger, after.latestLedger], changes }));

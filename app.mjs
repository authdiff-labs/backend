import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { decodeAuthorization } from './decode.mjs';
import { compareAuthorization, summarizeChanges } from '../auth-tree-core/index.mjs';

const assets = {
  '/': ['../frontend/index.html', 'text/html; charset=utf-8'],
  '/testnet-example': ['../fixtures/testnet-approve.json', 'application/json'],
  '/example': ['../fixtures/amount-change.json', 'application/json']
};

const MAX_BODY_BYTES = 262144;

async function readBody(req, limit = MAX_BODY_BYTES) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) {
      const error = new Error('Request body too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (req.method === 'GET' && Object.hasOwn(assets, req.url)) {
      const [path, type] = assets[req.url];
      const body = await readFile(new URL(path, import.meta.url));
      res.writeHead(200, { 'Content-Type': type }).end(body);
      return;
    }
    if (req.method !== 'POST' || !['/compare', '/compare-xdr'].includes(req.url)) {
      res.writeHead(404).end();
      return;
    }
    const { before, after } = JSON.parse(await readBody(req));
    const decode = req.url === '/compare-xdr' ? decodeAuthorization : value => value;
    const changes = compareAuthorization(decode(before), decode(after));
    res.writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ changes, summary: summarizeChanges(changes) }));
  } catch (error) {
    const status = error?.status === 413 ? 413 : 400;
    res.writeHead(status, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ error: status === 413 ? 'Request body too large' : 'Invalid authorization comparison input' }));
  }
}

export function createReviewServer() {
  return createServer(handler);
}

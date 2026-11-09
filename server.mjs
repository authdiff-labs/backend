import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { compareAuthorization } from '../auth-tree-core/index.mjs';

const assets = {
  '/': ['../frontend/index.html', 'text/html; charset=utf-8'],
  '/example': ['../fixtures/amount-change.json', 'application/json']
};
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (req.method === 'GET' && Object.hasOwn(assets, req.url)) {
      const [path, type] = assets[req.url];
      const body = await readFile(new URL(path, import.meta.url));
      res.writeHead(200, { 'Content-Type': type }).end(body);
      return;
    }
    if (req.method !== 'POST' || req.url !== '/compare') {
      res.writeHead(404).end();
      return;
    }
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 262144) {
        res.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    const { before, after } = JSON.parse(Buffer.concat(chunks));
    const changes = compareAuthorization(before, after);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ changes }));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid authorization comparison input' }));
  }
});
server.listen(Number(process.env.AUTHDIFF_PORT || 4782), '127.0.0.1');

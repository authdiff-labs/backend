# AuthDiff backend

Check out the frontend, backend, auth-tree-core and fixtures repositories as
siblings. Run `npm ci`, then `npm start` here. The workbench listens on
http://127.0.0.1:4782. Set `AUTHDIFF_PORT` or `AUTHDIFF_HOST` to override.

| Route | Purpose |
| --- | --- |
| `GET /` | Review workbench |
| `GET /health` | Liveness probe |
| `GET /example` | Synthetic normalized baseline and candidate |
| `GET /testnet-example` | Captured unsigned testnet authorization XDR |
| `POST /compare` | Compare two normalized authorization arrays |
| `POST /compare-xdr` | Compare two Stellar `{ source, auth }` captures |

`POST /compare` takes `{ "before": [...], "after": [...] }` and
`POST /compare-xdr` takes two objects with a Stellar `source` account and an
`auth` array of base64 SorobanAuthorizationEntry values. Both return the
ordered `changes` plus a `summary` with per-kind counts. Bodies are limited to
256 KiB and the server binds to loopback only.

Run `npm test` to exercise the HTTP surface and replay the captured testnet
data. Run `npm run pilot` to capture two fresh unsigned RPC simulations. The
pilot uses an existing funded public testnet account and can be pointed at
another via `AUTHDIFF_TESTNET_SOURCE`. It does not require keys or submit
transactions.

# AuthDiff backend

Check out the frontend, backend, auth-tree-core and fixtures repositories as
siblings. Run `npm ci`, then `npm start` here. The workbench listens on
http://127.0.0.1:4782.

`POST /compare` takes two normalized authorization arrays in `before` and
`after`. `POST /compare-xdr` takes two objects with a Stellar `source` account
and an `auth` array of base64 SorobanAuthorizationEntry values.

Run `npm test` to replay the captured testnet data. Run `npm run pilot` to
capture two fresh unsigned RPC simulations. The pilot uses an existing funded
public testnet account and can be pointed at another via
`AUTHDIFF_TESTNET_SOURCE`. It does not require keys or submit transactions.

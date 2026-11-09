import { Address, StrKey, xdr } from '@stellar/stellar-sdk';

export function decodeAuthorization(input) {
  if (!input || !StrKey.isValidEd25519PublicKey(input.source) ||
      !Array.isArray(input.auth) || input.auth.length > 128) {
    throw new TypeError('Expected a Stellar source account and up to 128 authorization entries');
  }
  let calls = 0;
  function invocation(node, depth = 0) {
    if (++calls > 2048 || depth > 32) throw new RangeError('Authorization tree exceeds review limits');
    const fn = node.function;
    if (fn.type !== 'sorobanAuthorizedFunctionTypeContractFn') {
      throw new TypeError('Unsupported authorization function: ' + fn.type);
    }
    const { contractAddress, functionName, args } = fn.contractFn;
    return {
      contract: Address.fromScAddress(contractAddress).toString(),
      method: functionName.toStringStrict(),
      args: args.map(value => ({ type: value.type.slice(3).toLowerCase(), xdr: value.toXDR('base64') })),
      children: node.subInvocations.map(child => invocation(child, depth + 1))
    };
  }
  return input.auth.map(encoded => {
    if (typeof encoded !== 'string' || !encoded.length || encoded.length > 65536 ||
        Buffer.from(encoded, 'base64').toString('base64') !== encoded) {
      throw new TypeError('Invalid authorization entry base64');
    }
    const entry = xdr.SorobanAuthorizationEntry.fromXDR(encoded, 'base64');
    if (entry.toXDR('base64') !== encoded) throw new TypeError('Noncanonical authorization entry');
    const credential = entry.credentials.type;
    let principal;
    switch (credential) {
      case 'sorobanCredentialsSourceAccount':
        principal = input.source;
        break;
      case 'sorobanCredentialsAddress':
        principal = Address.fromScAddress(entry.credentials.address.address).toString();
        break;
      case 'sorobanCredentialsAddressV2':
        principal = Address.fromScAddress(entry.credentials.addressV2.address).toString();
        break;
      default:
        throw new TypeError('Unsupported credential type: ' + credential);
    }
    return { principal, credential, root: invocation(entry.rootInvocation) };
  });
}

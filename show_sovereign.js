const { WsProvider, ApiPromise } = require('@polkadot/api');
require('@polkadot/api-augment');
const { blake2AsU8a, cryptoWaitReady } = require('@polkadot/util-crypto');
const { stringToU8a, bnToU8a, u8aConcat, u8aToHex } = require('@polkadot/util');
const { decodeAddress, encodeAddress, Keyring } = require('@polkadot/keyring');
const EMPTY_U8A_32 = new Uint8Array(32);

const ACALA_WS = 'ws://127.0.0.1:10020';
const EFINITY_WS = 'ws://127.0.0.1:10010';
const RELAY_WS = 'ws://127.0.0.1:9944';

const get_parachain_sovereign_account = (paraId) =>
  encodeAddress(u8aConcat(stringToU8a('para'), bnToU8a(paraId, 32, true), EMPTY_U8A_32).subarray(0, 32));

const getApi = async (endpoint) => {
  return ApiPromise.create({ provider: new WsProvider(endpoint) });
};

const getRelayApi = async (endpoint) => {
  return ApiPromise.create({ provider: new WsProvider(endpoint) });
};

async function main() {
  console.log('');
  console.log('');
  console.log('');
  await cryptoWaitReady();

  // Fund parachains soveriegn account on relay chain
  let efinity_sovereign = get_parachain_sovereign_account(2021);
  let acala_sovereign = get_parachain_sovereign_account(2000);
  console.log(`Efinity Sovereign Account: ${efinity_sovereign}`);
  console.log(`Acala Sovereign Account: ${acala_sovereign}`);

  process.exit(0);
}

main().catch(console.error);

const { WsProvider, ApiPromise } = require("@polkadot/api");
require("@polkadot/api-augment");
const { blake2AsU8a, cryptoWaitReady } = require("@polkadot/util-crypto");
const { stringToU8a, bnToU8a, u8aConcat, u8aToHex } = require("@polkadot/util");
const { decodeAddress, encodeAddress, Keyring } = require("@polkadot/keyring");

const ACALA_WS = "ws://127.0.0.1:10020";
const EFINITY_WS = "ws://127.0.0.1:10010";
const RELAY_WS = "ws://127.0.0.1:9944";

const getApi = async (endpoint) => {
  return ApiPromise.create({ provider: new WsProvider(endpoint) });
};

async function force_default_version(ws) {
  let api = await getApi(ws);
  const keyring = new Keyring({ type: "sr25519" });
  // we assume Alice is Sudo
  const sender = keyring.addFromUri("//Alice");

  const force_version = await api.tx.sudo
  .sudo(
    api.tx.polkadotXcm.forceDefaultXcmVersion(2)
  ).signAndSend(sender, (result) => { console.log(result) });
}

async function main() {
  console.log('');
  console.log('');
  console.log('');
  await cryptoWaitReady();

  await force_default_version(EFINITY_WS);

  process.exit(0);
}

main()
  .catch(console.error);

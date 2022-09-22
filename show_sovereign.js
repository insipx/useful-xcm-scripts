const { WsProvider, ApiPromise } = require("@polkadot/api");
require("@polkadot/api-augment");
const { blake2AsU8a, cryptoWaitReady } = require("@polkadot/util-crypto");
const { stringToU8a, bnToU8a, u8aConcat, u8aToHex } = require("@polkadot/util");
const { decodeAddress, encodeAddress, Keyring } = require("@polkadot/keyring");
const EMPTY_U8A_32 = new Uint8Array(32);

const ACALA_WS = "ws://127.0.0.1:10020";
const EFINITY_WS = "ws://127.0.0.1:10010";
const RELAY_WS = "ws://127.0.0.1:9944";

const get_parachain_sovereign_account = (paraId) =>
  encodeAddress(
    u8aConcat(stringToU8a("para"), bnToU8a(paraId, 32, true), EMPTY_U8A_32)
      .subarray(0, 32),
  );

const getApi = async (endpoint) => {
  return ApiPromise.create({ provider: new WsProvider(endpoint) });
};

const getRelayApi = async (endpoint) => {
  return ApiPromise.create({ provider: new WsProvider(endpoint) });
};

async function fund(toAddress, amount, required_amount, ws = "ws://127.0.0.1:9944") {
  let api = await getApi(ws);
  const keyring = new Keyring({ type: "sr25519" });
  const sender = keyring.addFromUri("//Charlie");

  let currently_holds = await api.query.balances.account(toAddress);

    console.log(`Fund address ${toAddress} ${amount}, currently holding: ${currently_holds.free}`);
    if (required_amount < currently_holds.free) {
      console.log(`funding account because it is below required amount`);
      const transfer = api.tx.balances.transfer(toAddress, amount);
      const hash = await transfer.signAndSend(sender, { nonce: -1 });
    } else {
      console.log(`not adding additional funds because amount is greater or equal to what is required`);
    }
}


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

main()
  .catch(console.error);

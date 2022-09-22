// Import the API
const { WsProvider, ApiPromise } = require("@polkadot/api");
require("@polkadot/api-augment");
const { cryptoWaitReady } = require("@polkadot/util-crypto");
const { Keyring } = require("@polkadot/keyring");


const ACALA_WS = "ws://127.0.0.1:10020";
const EFINITY_WS = "ws://127.0.0.1:10010";
const RELAY_WS = "ws://127.0.0.1:9944";

const getApi = async (endpoint) => {
  return ApiPromise.create({ provider: new WsProvider(endpoint) });
};

/// Register the efinity asset on Acala
async function register_asset(paraWs = "ws://127.0.0.1:10020") {
  const api = await getApi(paraWs.toString());
  const Alice = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
  const signer = new Keyring({ type: "sr25519" })
    .addFromUri(`${
      process.env.PARA_CHAIN_SUDO_KEY ||
      "//Alice"
    }`);

  let location =  {
    V0: {
      X2: [
        "Parent",
        {
          "Parachain": 2021
        }
      ]
    }
  };
  let metadata = {
    "name": "Efinity",
    "symbol": "EFI",
    "decimals": 18,
    "minimalBalance": "1000000000000000000"
  };
  let register = api.tx.assetRegistry.registerForeignAsset(location, metadata);
  let sudo_register = api.tx.sudo.sudo(register);
  await sudo_register.signAndSend(signer, { nonce: -1 }).catch((err) => {
    console.log("ERROR");
    console.log(err);
    process.exit(1);
  });

  console.log('succesfully registered');
}

async function main() {
  console.log('');
  console.log('');
  console.log('');
  await cryptoWaitReady();

  await register_asset(ACALA_WS);
  process.exit(0);
}

main()
   .catch(console.error);

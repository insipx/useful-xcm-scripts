// Import the API
const { WsProvider, ApiPromise } = require('@polkadot/api');
require('@polkadot/api-augment');
const { blake2AsU8a, cryptoWaitReady } = require('@polkadot/util-crypto');
const { stringToU8a, bnToU8a, u8aConcat, u8aToHex } = require('@polkadot/util');
const { decodeAddress, encodeAddress, Keyring } = require('@polkadot/keyring');

const EMPTY_U8A_32 = new Uint8Array(32);
const XCM_FEE = 2500000000000000;

const relayWs = 'ws://127.0.0.1:9944';

const createAddress = (id) => encodeAddress(u8aConcat(stringToU8a(`modl${id}`), EMPTY_U8A_32).subarray(0, 32));

const get_parachain_sovereign_account = (paraId) =>
  encodeAddress(u8aConcat(stringToU8a('para'), bnToU8a(paraId, 32, true), EMPTY_U8A_32).subarray(0, 32));

const getApi = async (endpoint) => {
  return ApiPromise.create({ provider: new WsProvider(endpoint) });
};

const getRelayApi = async (endpoint) => {
  return ApiPromise.create({ provider: new WsProvider(endpoint) });
};

const nextNonce = async (api, signer) => {
  return await api.rpc.system.accountNextIndex(signer.address);
};

const createXcm = (encoded, refundAccount) => {
  return {
    V2: [
      {
        WithdrawAsset: [
          {
            id: { Concrete: { parents: 0, interior: 'Here' } },
            fun: { Fungible: XCM_FEE },
          },
        ],
      },
      {
        BuyExecution: {
          fees: {
            id: { Concrete: { parents: 0, interior: 'Here' } },
            fun: { Fungible: XCM_FEE },
          },
          weightLimit: 'Unlimited',
        },
      },
      {
        Transact: {
          originType: 'Native',
          requireWeightAtMost: '20000000000',
          call: { encoded },
        },
      },
      'RefundSurplus',
      {
        DepositAsset: {
          assets: {
            Wild: {
              AllOf: {
                id: { Concrete: { parents: 0, interior: 'Here' } },
                fun: 'Fungible',
              },
            },
          },
          maxAssets: 1,
          beneficiary: {
            parents: 0,
            interior: {
              X1: {
                AccountId32: {
                  network: 'Any',
                  id: u8aToHex(decodeAddress(refundAccount)),
                },
              },
            },
          },
        },
      },
    ],
  };
};

async function fund(api, toAddress, amount) {
  const keyring = new Keyring({ type: 'sr25519' });
  const sender = keyring.addFromUri('//Charlie');
  console.log(`Fund address ${toAddress} ${amount}`);
  console.log(`funding account because it is below required amount`);
  const transfer = api.tx.balances.transfer(toAddress, amount);
  const hash = await transfer.signAndSend(sender, { nonce: -1 });
}

async function open(sender, recipient, paraWs = 'ws://127.0.0.1:9944') {
  const relayApi = await getRelayApi(relayWs.toString());
  const api = await getApi(paraWs.toString());

  const Alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const signer = new Keyring({ type: 'sr25519' }).addFromUri(`${process.env.PARA_CHAIN_SUDO_KEY || '//Alice'}`);
  const account = get_parachain_sovereign_account(sender);
  console.log(`account for ${2021}: ${account}`);

  const configuration = await relayApi.query.configuration.activeConfig();

  const encoded = relayApi.tx.hrmp
    .hrmpInitOpenChannel(recipient, configuration.hrmpChannelMaxCapacity, configuration.hrmpChannelMaxMessageSize)
    .toHex();

  console.log(
    'Encoded hrmpInitOpenChannel request: ',
    encoded,
    configuration.hrmpChannelMaxCapacity,
    configuration.hrmpChannelMaxMessageSize.toNumber()
  );

  const proposal = api.tx.polkadotXcm.send(
    { V1: { parents: 1, interior: 'Here' } },
    createXcm(`0x${encoded.slice(6)}`, get_parachain_sovereign_account(sender))
  );

  const tx = api.tx.sudo.sudo(proposal);

  await tx.signAndSend(signer, { nonce: await nextNonce(api, signer) }).catch((err) => {
    console.log('ERROR');
    logger.error(err.message);
    process.exit(1);
  });
  console.log(`HRMP open request for ${sender} sent`);
}

async function accept(sender, recipient, paraWs = 'ws://127.0.0.1:9988') {
  const relayApi = await getRelayApi(relayWs.toString());
  const api = await getApi(paraWs.toString());

  const count = await relayApi.query.hrmp.hrmpOpenChannelRequestCount(sender);
  console.log('Open channel requests ', count.toNumber());

  if (count < 1) {
    return;
  }

  const Alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const signer = new Keyring({ type: 'sr25519' }).addFromUri(`${process.env.PARA_CHAIN_SUDO_KEY || '//Alice'}`);

  const encoded = relayApi.tx.hrmp.hrmpAcceptOpenChannel(sender).toHex();

  console.log('Encoded hrmpAcceptOpenChannel request: ', encoded, sender);

  const proposal = api.tx.polkadotXcm.send(
    { V1: { parents: 1, interior: 'Here' } },
    createXcm(`0x${encoded.slice(6)}`, get_parachain_sovereign_account(recipient))
  );
  console.log(proposal);

  const tx = api.tx.sudo.sudo(proposal);

  await tx.signAndSend(signer, { nonce: await nextNonce(api, signer) }).catch((err) => {
    logger.error(err.message);
    process.exit(1);
  });
}

async function main() {
  console.log('');
  console.log('');
  console.log('');
  await cryptoWaitReady();
  const relayWs = 'ws://127.0.0.1:9944';
  const api = await getApi(relayWs);

  // Fund parachains soveriegn account on relay chain
  await fund(api, get_parachain_sovereign_account(2000), 9 * 1e15);
  await new Promise((r) => setTimeout(r, 2000));
  await fund(api, get_parachain_sovereign_account(2021), 9 * 1e15);
  await new Promise((r) => setTimeout(r, 2000));
  await fund(api, get_parachain_sovereign_account(1000), 9 * 1e15);

  console.log('sending open');
  await open(2021, 2000, 'ws://127.0.0.1:10010');
  console.log('sleeping before accepting on acalas end...');
  await new Promise((r) => setTimeout(r, 60000));
  // wait for hrmpInitOpenChannel notification
  await accept(2021, 2000, 'ws://127.0.0.1:10020');

  console.log('channel accepted. waiting 20 seconds before establishing reverse channel');
  await new Promise((r) => setTimeout(r, 60000));

  await open(2000, 2021, 'ws://127.0.0.1:10020');
  console.log('sleeping before accepting on efinitys end...');
  await new Promise((r) => setTimeout(r, 60000));
  await accept(2000, 2021, 'ws://127.0.0.1:10010');

  console.log('channel accepted. establishing statemint channel');

  process.exit(0);
}

main().catch(console.error);

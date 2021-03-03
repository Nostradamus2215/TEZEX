const conseiljs = require("conseiljs");
const config = require("./config.json");
const log = require("loglevel");
const conSign = require("conseiljs-softsigner");
const fetch = require("node-fetch");
const bigInt = require("big-integer");

const init = async () => {
  const logger = log.getLogger("conseiljs");
  logger.setLevel("error", false);
  const store = {};
  store.keyStore = await conSign.KeyStoreUtils.restoreIdentityFromSecretKey(
    config.tezos.privateKey
  );
  store.signer = await conSign.SoftSigner.createSigner(
    conseiljs.TezosMessageUtils.writeKeyWithHint(
      store.keyStore.secretKey,
      "edsk"
    )
  );
  conseiljs.registerFetch(fetch);
  conseiljs.registerLogger(logger);
  return store;
};

const deployTokenContract = async (store) => {
  console.log("deploying a tzip7 token contract");
  const groupid = await conseiljs.Tzip7ReferenceTokenHelper.deployContract(
    config.tezos.RPC,
    store.signer,
    store.keyStore,
    500_000,
    store.keyStore.publicKeyHash,
    false,
    0,
    150_000,
    5_000
  );
  console.log(`Injected operation group id ${groupid}`);
  const conseilResult = await conseiljs.TezosConseilClient.awaitOperationConfirmation(
    config.tezos.conseilServer,
    config.tezos.conseilServer.network,
    groupid,
    2
  );
  console.log("Token contract ADDR : ", conseilResult["originated_contracts"]);
  return conseilResult["originated_contracts"];
};

async function mintMinimumBalance(store, contractAddress) {
  const groupid = await conseiljs.Tzip7ReferenceTokenHelper.mint(
    config.tezos.RPC,
    store.signer,
    store.keyStore,
    contractAddress,
    20_000,
    store.keyStore.publicKeyHash,
    bigInt(500000)
      .multiply(10 ** 18)
      .toString(),
    120_000,
    100
  );
  console.log(`Injected operation group id ${groupid}`);
  const opRes = await conseiljs.TezosConseilClient.awaitOperationConfirmation(
    config.tezos.conseilServer,
    config.tezos.conseilServer.network,
    groupid,
    2
  );
  if (opRes.status != "applied") {
    throw new Error("tx failed : " + JSON.stringify(opRes));
  }
  console.log("Successful Mint");
}

const deploy = async () => {
  const store = await init();
  const contract = await deployTokenContract(store);
  await mintMinimumBalance(store, contract);
};

deploy();

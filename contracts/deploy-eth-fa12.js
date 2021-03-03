const conseiljs = require("conseiljs");
const config = require("./config.json");
const ethConfig = require("./ethereum/build/contracts/AtomicSwap.json");
const tezConfig = require("./tezos/build/TokenSwap_compiled.json");
const feeStore = require("./tezos/build/FeeStore_compiled.json");
const log = require("loglevel");
const conSign = require("conseiljs-softsigner");
const fetch = require("node-fetch");
const Web3 = require("web3");

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
  //   console.log(store.keyStore);
  conseiljs.registerFetch(fetch);
  conseiljs.registerLogger(logger);
  const web3 = new Web3(new Web3.providers.HttpProvider(config.ethereum.RPC));
  return { store, web3 };
};

const estimateFees = async (store, web3) => {
  try {
    const tezosEstimate = await conseiljs.TezosNodeWriter.testContractDeployOperation(
      config.tezos.RPC,
      config.tezos.chain_id,
      store.keyStore,
      0,
      undefined,
      100000,
      10000,
      20000,
      trim(tezConfig),
      conseiljs.TezosLanguageUtil.translateMichelsonToMicheline(
        `(Pair (Pair True "${store.keyStore.publicKeyHash}") (Pair "${config.tezos.tokenContract.address}" (Pair 15 {})))`
      ),
      conseiljs.TezosParameterFormat.Micheline
    );

    const ethContract = new web3.eth.Contract(ethConfig.abi);

    const ethContractTx = ethContract.deploy({
      data: ethConfig.bytecode,
      arguments: [],
    });
    const ethereumFees = (await ethContractTx.estimateGas()) * 2;
    const gasPrice = await web3.eth.getGasPrice();
    console.log(
      `\nFee Estimates:\n\n- Tesoz Fee Required : ${
        (tezosEstimate["estimatedFee"] +
          tezosEstimate["estimatedStorageBurn"]) /
        1000000
      } xtz\n- Ethereum Fee Required: ${web3.utils.fromWei(
        (ethereumFees * gasPrice).toString()
      )} eth`
    );
  } catch (err) {
    console.log("[x] Failed to estimate deploy fees : ", err);
  }
};
const trim = (obj) => {
  const str = JSON.stringify(obj);
  const temp = str
    .replace(" ", "")
    .replace(/\\"/g, '"')
    .replace(/[\n\t\r]/, "");
  return temp;
};

const deployTezosContract = async (code, storage, store) => {
  const fee = await conseiljs.TezosNodeWriter.testContractDeployOperation(
    config.tezos.RPC,
    config.tezos.chain_id,
    store.keyStore,
    0,
    undefined,
    100000,
    10000,
    20000,
    trim(code),
    conseiljs.TezosLanguageUtil.translateMichelsonToMicheline(storage),
    conseiljs.TezosParameterFormat.Micheline
  );
  const result = await conseiljs.TezosNodeWriter.sendContractOriginationOperation(
    config.tezos.RPC,
    store.signer,
    store.keyStore,
    0,
    undefined,
    fee["estimatedFee"],
    fee["storageCost"],
    fee["gas"],
    trim(code),
    conseiljs.TezosLanguageUtil.translateMichelsonToMicheline(storage),
    conseiljs.TezosParameterFormat.Micheline,
    conseiljs.TezosConstants.HeadBranchOffset,
    true
  );
  const groupid = result["operationGroupID"]
    .replace(/"/g, "")
    .replace(/\n/, ""); // clean up RPC output
  console.log(`Injected operation group id ${groupid}`);
  const conseilResult = await conseiljs.TezosConseilClient.awaitOperationConfirmation(
    config.tezos.conseilServer,
    config.tezos.conseilServer.network,
    groupid,
    2
  );
  return conseilResult["originated_contracts"];
};

const deployEthereumContract = async (ethConfig, argument, web3) => {
  const ethContract = new web3.eth.Contract(ethConfig.abi);

  const ethContractTx = ethContract.deploy({
    data: ethConfig.bytecode,
    arguments: argument, //[config.ethereum.tokenAddr],
  });

  const ethAccount = web3.eth.accounts.privateKeyToAccount(
    config.ethereum.privateKey
  );

  const createTransaction = await ethAccount.signTransaction({
    data: ethContractTx.encodeABI(),
    gas: (await ethContractTx.estimateGas()) * 2,
  });

  const createReceipt = await web3.eth.sendSignedTransaction(
    createTransaction.rawTransaction
  );
  return createReceipt.contractAddress;
};

const deploy = async (store, web3) => {
  try {
    console.log("\nContract Addresses :");
    const tezosSwapContract = await deployTezosContract(
      tezConfig,
      `(Pair (Pair True "${store.keyStore.publicKeyHash}") (Pair "${config.tezos.tokenContract.address}" (Pair 15 {})))`,
      store
    );
    console.log(`- Tezos Swap contract at ${tezosSwapContract}`);
    const ethereumSwapContract = await deployEthereumContract(
      ethConfig,
      [],
      web3
    );
    console.log(`- Ethereum Swap contract at ${ethereumSwapContract}`);
  } catch (err) {
    console.log("[x] Failed to deploy contracts : ", err);
  }
};

const run = async (estimate = true) => {
  const { store, web3 } = await init();
  await estimateFees(store, web3);
  if (!estimate) {
    await deploy(store, web3);
  }
};

run(false);

import { BigNumber } from "bignumber.js";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { constants, updateBotStats } from "../../../../library/common/util";
import { shorten } from "../../../../util";
import Loader from "../../../loader";
import useStyles from "../../style";
import CreateSwap from "../createSwap";
const GetSwap = ({ genSwap, tezStore, ethStore, balance }) => {
  const [swaps, setSwaps] = useState([]);
  const [loader, setLoader] = useState(true);
  const [feeDetails, setFee] = useState({});
  const [fullLoader, setFullLoader] = useState(false);
  const history = useHistory();
  const classes = useStyles();

  const filterSwaps = async () => {
    try {
      const swps = await tezStore.getWaitingSwaps(4200);
      setSwaps(swps);
      setLoader(false);
    } catch (err) {
      console.error("Error getting swaps: ", err);
    }
  };

  const updateReward = async () => {
    const data = await Promise.all([
      tezStore.getFees(),
      tezStore.getPrice("ETH-USD"),
      tezStore.getPrice("XTZ-USD"),
      tezStore.getReward(),
      ethStore.web3.eth.getGasPrice(),
      updateBotStats(),
    ]);
    const reward = data[3];
    const usdtzFeeData = data[0]["USDTZ"];
    const usdcFeeData = data[0]["USDC"];
    const ethereumGasPrice = new BigNumber(
      ethStore.web3.utils.fromWei(data[4], "ether")
    );
    const botFee = new BigNumber(
      usdtzFeeData["initiateWait"] + usdtzFeeData["addCounterParty"]
    )
      .multipliedBy(data[2])
      .div(constants.decimals10_6)
      .plus(
        new BigNumber(usdcFeeData["redeem"])
          .multipliedBy(ethereumGasPrice)
          .multipliedBy(data[1])
      )
      .multipliedBy(constants.usdtzFeePad)
      .toFixed(0, 2);
    const txFee = {
      eth: new BigNumber(
        usdcFeeData["initiateWait"] + usdcFeeData["addCounterParty"]
      )
        .multipliedBy(ethereumGasPrice)
        .toFixed(6),
      tez: new BigNumber(usdtzFeeData["redeem"]).div(constants.decimals10_6),
    };
    setFee({
      reward,
      botFee,
      txFee,
      stats: data[5],
    });
  };

  const SwapItem = (data) => {
    return (
      <div
        onClick={() => {
          generateSwap(data.value, data);
        }}
        key={data.hashedSecret}
        className={classes.swap}
      >
        <p>Hash : {shorten(15, 15, data.hashedSecret)}</p>
        <p>USDtz Value : {data.value}</p>
        <p>USDC to Pay : {data.value}</p>
      </div>
    );
  };

  const generateSwap = async (value, data) => {
    setFullLoader(true);
    const res = await genSwap(2, value, value, data);
    setFullLoader(false);
    if (!res) {
      alert("Error: Swap Couldn't be created");
    } else {
      history.push("/");
    }
  };
  useEffect(() => {
    updateReward();
    // filterSwaps();
    // const timer = setInterval(() => {
    //   filterSwaps();
    // }, 600000);
    const timer1 = setInterval(() => {
      updateReward();
    }, 60000);
    return () => {
      // clearInterval(timer);
      clearInterval(timer1);
    };
  }, []);

  let data = "No Swaps Found. Create One!";
  if (swaps.length > 0) data = swaps.map((swp) => SwapItem(swp));
  if (fullLoader) return <Loader message="..Creating Your Swap.." />;
  if (feeDetails.stats === undefined)
    return <Loader message="..Loading details.." />;
  return (
    <div className={classes.swapScreen}>
      <div className={classes.container}>
        <h3 className={classes.msg}>Create New Swap</h3>
        <CreateSwap
          className={classes.newSwap}
          genSwap={genSwap}
          loader={setFullLoader}
          feeDetails={feeDetails}
          balance={balance}
        />
      </div>
    </div>
  );
};

export default GetSwap;

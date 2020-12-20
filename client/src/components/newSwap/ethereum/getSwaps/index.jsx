import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { shorten } from "../../../../util";
import Loader from "../../../loader";
import useStyles from "../../style";
import CreateSwap from "../createSwap";

const GetSwap = ({ genSwap, tezStore }) => {
  const [swaps, setSwaps] = useState([]);
  const [loader, setLoader] = useState(true);
  const [reward, setReward] = useState(0);
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
    console.log("heree", 11);
    const rewrd = await tezStore.getReward();
    console.log("heree", rewrd);
    setReward(rewrd);
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
        <p>USDTz Value : {data.value}</p>
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
    filterSwaps();
    const timer = setInterval(() => {
      filterSwaps();
    }, 600000);
    const timer1 = setInterval(() => {
      updateReward();
    }, 120000);
    return () => {
      clearInterval(timer);
      clearInterval(timer1);
    };
  }, []);

  let data = "No Swaps Found. Create One!";
  if (swaps.length > 0) data = swaps.map((swp) => SwapItem(swp));
  if (fullLoader) return <Loader message="..Creating Your Swap.." />;
  return (
    <div className={classes.swapScreen}>
      <div className={classes.container}>
        <h3 className={classes.msg}>Create New Swap</h3>
        <CreateSwap
          className={classes.newSwap}
          genSwap={genSwap}
          loader={setFullLoader}
          reward={reward}
        />
      </div>
      <div className={classes.or}>
        <p>Or</p>
      </div>
      <div className={classes.container}>
        <h3 className={classes.msg}>Select From Available SWAPS</h3>
        <div className={classes.swaps}>
          {loader && <Loader message="..Loading Swaps.." />}
          {!loader && data}
        </div>
      </div>
    </div>
  );
};

export default GetSwap;

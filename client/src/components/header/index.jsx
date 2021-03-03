import bigInt from "big-integer";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { convertBigIntToFloat } from "../../library/common/util";
import logo from "../../tezexbridge.png";
import { shorten, truncate } from "../../util";
import useStyles from "./style";
const Header = ({ ethStore, tezStore, balUpdate }) => {
  const [balance, setBalance] = useState({ eth: 0, tez: 0 });
  const classes = useStyles();
  const history = useHistory();
  const updateBalance = async () => {
    let eth = await ethStore
      .balance(ethStore.account)
      .then((val) => bigInt(val));
    let tez = await tezStore
      .balance(tezStore.account)
      .then((val) => bigInt(val));
    let usdc = await ethStore
      .tokenBalance(ethStore.account)
      .then((val) => bigInt(val));
    let usdtz = await tezStore
      .tokenBalance(tezStore.account)
      .then((val) => bigInt(val));
    balUpdate({ eth, tez, usdc, usdtz });
    setBalance({
      eth: convertBigIntToFloat(eth, 18, 6),
      tez: convertBigIntToFloat(tez, 6, 6),
      usdc: convertBigIntToFloat(usdc, 6, 6),
      usdtz: convertBigIntToFloat(usdtz, 6, 6),
    });
  };

  useEffect(() => {
    updateBalance();
    const timer = setInterval(async () => {
      await updateBalance();
    }, 60000);
    return () => {
      clearInterval(timer);
    };
  }, [ethStore.account, tezStore.account]);

  return (
    <div className={classes.header}>
      <div className={classes.account}>
        <p>Ethereum Addr.: {shorten(5, 5, ethStore.account)}</p>
        <p>Balance : {truncate(balance.eth, 4)} ETH</p>
        <p>Token Balance : {balance.usdc} USDC</p>
      </div>
      <div className={classes.nav}>
        <img className={classes.logo} src={logo} alt="Logo" />
        <button className={classes.button} onClick={() => history.push("/")}>
          Home
        </button>
        <button
          className={classes.button}
          onClick={() => history.push("/about")}
        >
          About
        </button>
        <button
          className={classes.button}
          onClick={() => history.push("/stats")}
        >
          Live Stats
        </button>
        <button
          className={classes.button}
          onClick={() => history.push("/create")}
        >
          New Swap
        </button>
      </div>
      <div className={classes.account}>
        <p>Tezos Addr.: {shorten(5, 5, tezStore.account)}</p>
        <p>Balance : {balance.tez} XTZ</p>
        <p>Token Balance : {balance.usdtz} USDtz</p>
      </div>
    </div>
  );
};

export default Header;

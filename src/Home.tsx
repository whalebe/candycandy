import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import logo from "./assets/img/whalebe_bn.png";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
  getMetadata,
} from "./candy-machine";
import NavbarCustom from "./NavbarCustom";
import Button from "react-bootstrap/esm/Button";

const ConnectButton = styled(WalletDialogButton)`
  background-color: rgb(76, 220, 188) !important;
`;



const PageWrapper = styled.div``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
  const [itemsRemaining, setItemsRemaining] = useState(0);
  const [displayAddress, setDisplayAddress] = useState("");
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [updater, setUpdater] = useState(0);
  const [meta, setMeta] = useState("");

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
          setUpdater((prev) => prev + 1);
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(() => {
    (async () => {
      if (!wallet) return;

      const { candyMachine, goLiveDate, itemsRemaining } =
        await getCandyMachineState(
          wallet as anchor.Wallet,
          props.candyMachineId,
          props.connection
        );
      const meta = await getMetadata(
        new anchor.web3.PublicKey(
          "3fsCerG3iZKeN4CKw8CNynD5RqVvab7bs2u22MsihuPo"
        )
      );
      setMeta(meta.toString());
      setItemsRemaining(itemsRemaining);
      setIsSoldOut(itemsRemaining === 0);
      console.log(goLiveDate);
      console.log(startDate);
      setStartDate(goLiveDate);

      setCandyMachine(candyMachine);
      setDisplayAddress(shortenAddress(wallet.publicKey?.toBase58() || ""));
    })();
  }, [wallet, props.candyMachineId, props.connection, updater]);

  useEffect(() => {
    if (wallet && showFullAddress) {
      setDisplayAddress(wallet.publicKey.toBase58() || "");
    } else if (wallet) {
      setDisplayAddress(shortenAddress(wallet.publicKey.toBase58() || ""));
    }
  }, [wallet, showFullAddress]);

  const handleNavClick = () => {
    setShowFullAddress(!showFullAddress);
  };

  return (
    <PageWrapper>
      <NavbarCustom
        clicked={handleNavClick}
        balance={wallet ? (balance || 0).toLocaleString() : ""}
        walletAddress={wallet ? displayAddress : ""}
      ></NavbarCustom>
      <div style={{ textAlign: "center", marginTop: "10%" }}>
        {/* {wallet.connected && (
            <div>Wallet: {wallet.publicKey?.toBase58() || ""}</div>
        )} */}
        {/* {wallet.connected && (
          <div className="my-2">Balance: {(balance || 0).toLocaleString()} SOL</div>
        )} */}
    
        <img src={logo} width="60%"></img>
        {/* colors: (193,159,216), (76,220,188), (92, 162, 201) and black */}
        <MintContainer>
          {!wallet ? (
            <ConnectButton>connect wallet</ConnectButton>
          ) : (
            <div>
              <MintButton
                disabled={isSoldOut || isMinting || !isActive}
                onClick={onMint}
                // variant="contained"
                style={{ backgroundColor: "rgb(193,159,216)", border: "none" }}
              >
                {isSoldOut ? (
                  "SOLD OUT"
                ) : isActive ? (
                  isMinting ? (
                    <CircularProgress style={{ color: "white" }} />
                  ) : (
                    "MINT for 1 SOL"
                  )
                ) : (
                  <Countdown
                    date={startDate}
                    onMount={({ completed }) => completed && setIsActive(true)}
                    onComplete={() => setIsActive(true)}
                    renderer={renderCounter}
                  />
                )}
              </MintButton>
            </div>
          )}
        </MintContainer> 
        {wallet && itemsRemaining > 0 && (
          <div className="my-3 text-white" style={{ fontStyle: "italic" }}>
            items remaining: {itemsRemaining}/1000
          </div>
        )} 
      {/*   <h4>text</h4> */}
      </div>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </PageWrapper>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {days} days, {hours} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;

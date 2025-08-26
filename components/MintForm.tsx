"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { mintIrmaToken } from "../lib/mint";
import TokenBalances from "./TokenBalances";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface TokenBalance {
  symbol: string;
  balance: number;
  mint: string;
  decimals: number;
  mintAddress: string;
}

interface MintFormProps {
  walletName: string | null;
}

export default function MintForm({ walletName }: MintFormProps) {
  const { publicKey, signTransaction } = useWallet();
  const [amount, setAmount] = useState<number>(1000);
  const [stablecoin, setStablecoin] = useState<string>("USDC");
  const [isMinting, setIsMinting] = useState(false);
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);

  // Mint rate - 1.04 USDC per IRMA
  const mintRate = 1.04;

  // Calculate total mint price based on selected amount
  const totalMintPrice = amount * mintRate;

  // Get USDC balance from token balances
  const getUSDCBalance = () => {
    const usdcToken = tokenBalances.find((token) => token.symbol === "USDC");
    return usdcToken ? usdcToken.balance : 0;
  };

  // Check if user has enough balance
  const hasEnoughBalance = () => {
    const usdcBalance = getUSDCBalance();
    return usdcBalance >= totalMintPrice;
  };

  const handleMint = async () => {
    if (!publicKey || !signTransaction || amount <= 0) return;

    // Check balance before minting
    if (!hasEnoughBalance()) {
      const usdcBalance = getUSDCBalance();
      toast.warning(
        `Insufficient ${stablecoin} balance! You have ${usdcBalance.toFixed(
          2
        )} ${stablecoin}, but need ${totalMintPrice.toFixed(
          2
        )} ${stablecoin} to mint ${amount.toLocaleString()} IRMA tokens.`,
        {
          position: "top-right",
          autoClose: 8000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        }
      );
      return;
    }

    setIsMinting(true);

    try {
      const success = await mintIrmaToken(publicKey, amount, signTransaction);

      if (success) {
        toast.success(
          `Successfully minted ${amount.toLocaleString()} IRMA tokens!`,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
        setAmount(1000);
      } else {
        toast.error("Failed to mint IRMA tokens. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error) {
      toast.error("An error occurred while minting. Please try again.", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsMinting(false);
    }
  };

  // Handle balance updates from TokenBalances component
  const handleBalanceUpdate = (balances: TokenBalance[]) => {
    setTokenBalances(balances);
  };

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <ToastContainer />

      {/* Token Balances */}
      <TokenBalances
        walletName={walletName}
        onBalanceUpdate={handleBalanceUpdate}
      />

      {/* Balance Warning */}
      {tokenBalances.length > 0 && !hasEnoughBalance() && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-yellow-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-yellow-800">
              <div className="font-medium">Insufficient Balance</div>
              <div>
                You need {totalMintPrice.toFixed(2)} {stablecoin} to mint{" "}
                {amount.toLocaleString()} IRMA tokens
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stablecoin Selection */}
      <div className="p-4">
        <div className="mb-2">
          <label className="block text-sm font-medium text-white-700 mb-2">
            Stablecoin
          </label>
          <div className="relative">
            <select
              value={stablecoin}
              onChange={(e) => setStablecoin(e.target.value)}
              className="w-full px-3 py-3 text-white rounded-md focus:outline-none  appearance-none "
              style={{
                background: "#0b1022",
              }}
            >
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="DAI">DAI</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
        {/* Amount Input */}
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-white-700 mb-2"
          >
            Amount
          </label>
          <div className="relative">
            <select
              id="amount"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-3 text-white rounded-md focus:outline-none appearance-none "
              style={{
                background: "#0b1022",
              }}
            >
              <option value="100">100 IRMA</option>
              <option value="1000">1,000 IRMA</option>
              <option value="10000">10,000 IRMA</option>
              <option value="100000">100,000 IRMA</option>
              <option value="1000000">1,000,000 IRMA</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      {/* Mint Price Display */}
      <div className="p-4">
        <div className="text-md text-white-500 space-y-1">
          <div>
            Mint Rate: {mintRate} {stablecoin} per IRMA
          </div>
          <div className="font-medium text-white-800">
            Total Cost:{" "}
            {totalMintPrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {stablecoin}
          </div>
          {/* <div className="text-xs text-purple-600">
          💡 Orders will be placed on OpenBook v2 market
        </div> */}
        </div>

        {/* Balance Display */}
        {tokenBalances.length > 0 && publicKey ? (
          <div
            className={`text-md ${
              hasEnoughBalance() ? "text-green-600" : "text-red-600"
            }`}
          >
            Available Balance: {getUSDCBalance().toFixed(2)} {stablecoin}
          </div>
        ) : (
          <div
            className={`text-md ${
              hasEnoughBalance() ? "text-green-600" : "text-red-600"
            }`}
          >
            Available Balance: ---
          </div>
        )}

        {/* Mint Button */}
        <button
          onClick={handleMint}
          disabled={
            isMinting || amount <= 0 || !hasEnoughBalance() || !publicKey
          }
          className="w-full mt-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {isMinting ? "Minting..." : "Mint"}
        </button>
      </div>
    </div>
  );
}

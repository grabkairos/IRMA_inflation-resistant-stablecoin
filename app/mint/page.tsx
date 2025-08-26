"use client";

import { useState } from "react";
import WalletConnect from "../../components/WalletConnect";
import MintForm from "../../components/MintForm";

export default function MintPage() {
  const [walletName, setWalletName] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen bg-gray-50 py-12 px-4"
      style={{
        background:
          "linear-gradient(29.71deg, #121C34 -18.98%, #050D17 14.6%, #070A15 56.26%, rgba(9, 14, 29, 0.97) 85.27%)",
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold  mb-2"
            style={{
              color: "#22D1F8",
            }}
          >
            Mint IRMA
          </h1>
          <p
            className=""
            style={{
              color: "#abc4ff80",
            }}
          >
            Connect your wallet and mint IRMA tokens
          </p>
        </div>

        {/* Main Card */}
        <div
          className="bg-white rounded-xl shadow-lg p-8"
          style={{
            background: "#1C243E",
          }}
        >
          {/* Wallet Connection - Top Right */}
          <div
            className="flex justify-end items-start mb-6"
            style={{
              background: "#1C243E",
            }}
          >
            {/* <h2 className="text-xl font-semibold text-gray-800">Mint IRMA</h2> */}
            <WalletConnect onWalletChange={setWalletName} />
          </div>

          {/* Mint Form */}
          <MintForm walletName={walletName} />
        </div>
      </div>
    </div>
  );
}

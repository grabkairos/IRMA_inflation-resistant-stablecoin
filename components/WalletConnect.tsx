"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

// Dynamically import wallet components with no SSR to prevent hydration issues
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200">
        Loading...
      </div>
    ),
  }
);

interface WalletConnectProps {
  onWalletChange: (wallet: string | null) => void;
}

export default function WalletConnect({ onWalletChange }: WalletConnectProps) {
  const { wallet, connected, disconnect } = useWallet();
  const [walletName, setWalletName] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (connected && wallet) {
      const name = wallet.adapter.name;
      setWalletName(name);
      onWalletChange(name);
    } else {
      setWalletName(null);
      onWalletChange(null);
    }
  }, [connected, wallet, onWalletChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (connected && walletName) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 bg-gray-100 rounded-lg px-4 py-2.5 hover:bg-gray-200 transition-colors duration-200"
          style={{
            background: "#0b1022",
          }}
        >
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-white-700">
            {walletName}
          </span>
          <svg
            className={`w-4 h-4 text-white-500 transition-transform duration-200 ${
              showDropdown ? "rotate-180" : ""
            }`}
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
        </button>

        {showDropdown && (
          <div
            className="absolute right-0 mt-2 w-32  hover:bg-blue-500 rounded-lg shadow-lg border border-gray-200  py-1 z-10"
            style={{
              background: "#abc4ff80",
            }}
          >
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-2 text-sm text-white-700  transition-colors duration-200"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <WalletMultiButton
      className="bg-gray-100 hover:bg-gray-200 text-sm font-medium py-2.5 px-4 rounded-lg transition-colors duration-200"
      style={{
        background: "#0b1022",
        color: "white",
      }}
    />
  );
}

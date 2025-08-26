"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-3 text-white text-sm">Loading balances...</span>
  </div>
);

interface TokenBalance {
  mint: string;
  symbol: string;
  balance: number;
  decimals: number;
  mintAddress: string;
}

interface TokenBalancesProps {
  walletName: string | null;
  onBalanceUpdate?: (balances: TokenBalance[]) => void;
}

const TOKENS = [
  // Original tokens (may not exist on devnet)
  {
    mint: "BGySzmvQrR69thSD5iVhhBrQ1CLnFYKakszRFuzwb1yj",
    symbol: "IRMA",
  },
  {
    mint: "7zSzGfA7r8cxhGPyJUX2CJzViLS9FX7a2b3F94qcZLkU",
    symbol: "USDC",
  },
];

export default function TokenBalances({
  walletName,
  onBalanceUpdate,
}: TokenBalancesProps) {
  const { publicKey } = useWallet();
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Not tested");

  // Create connection with better configuration
  const createConnection = () => {
    // Try multiple RPC endpoints for better reliability
    const endpoints = [
      "https://api.devnet.solana.com",
      "https://solana-devnet.rpc.extrnode.com",
      "https://ssc-dao.genesysgo.net",
    ];

    // Use the first endpoint for now, but we can implement fallback logic
    const endpoint = endpoints[0];

    return new Connection(endpoint, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false,
      httpHeaders: {
        "User-Agent": "IRMA-Mint-App/1.0.0",
      },
    });
  };

  // Test connection and get working endpoint
  const getWorkingConnection = async () => {
    const endpoints = [
      "https://api.devnet.solana.com",
      "https://solana-devnet.rpc.extrnode.com",
      "https://ssc-dao.genesysgo.net",
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        const testConnection = new Connection(endpoint, {
          commitment: "confirmed",
          confirmTransactionInitialTimeout: 30000,
        });

        // Test with a simple call
        await testConnection.getSlot();
        console.log(`✅ Endpoint ${endpoint} is working`);
        return testConnection;
      } catch (error) {
        console.log(`❌ Endpoint ${endpoint} failed:`, error);
        continue;
      }
    }

    throw new Error("All RPC endpoints failed");
  };

  // Rate limiting to prevent 429 errors
  const rateLimiter = {
    lastRequestTime: 0,
    async throttle() {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const RATE_LIMIT_DELAY = 1000; // 1 second between requests

      if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
      this.lastRequestTime = Date.now();
    },
  };

  const fetchTokenBalances = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get a working connection first
      const connection = await getWorkingConnection();
      console.log("Fetching balances for wallet:", publicKey.toString());
      console.log("Connection endpoint:", connection.rpcEndpoint);

      const balances: TokenBalance[] = [];

      for (const token of TOKENS) {
        try {
          // Rate limit requests
          await rateLimiter.throttle();

          console.log(`Fetching balance for ${token.symbol} (${token.mint})`);
          const mintPubkey = new PublicKey(token.mint);

          // First, let's check if the mint exists
          try {
            const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
            console.log(
              `Mint info for ${token.symbol}:`,
              mintInfo.value ? "Exists" : "Does not exist"
            );
          } catch (mintError) {
            console.log(`Mint ${token.symbol} does not exist or is invalid`);
          }

          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { mint: mintPubkey }
          );

          console.log(
            `Found ${tokenAccounts.value.length} token accounts for ${token.symbol}`
          );

          let balance = 0;
          let decimals = 6; // Default decimals

          if (tokenAccounts.value.length > 0) {
            const account = tokenAccounts.value[0];
            const accountInfo = account.account.data.parsed.info;
            balance = accountInfo.tokenAmount.uiAmount || 0;
            decimals = accountInfo.tokenAmount.decimals || 6;
            console.log(
              `Balance for ${token.symbol}:`,
              balance,
              `(decimals: ${decimals})`
            );
          } else {
            console.log(`No token account found for ${token.symbol}`);
          }

          balances.push({
            mint: token.symbol,
            symbol: token.symbol,
            balance,
            decimals,
            mintAddress: token.mint,
          });
        } catch (error) {
          console.error(`Error fetching balance for ${token.symbol}:`, error);
          balances.push({
            mint: token.symbol,
            symbol: token.symbol,
            balance: 0,
            decimals: 6,
            mintAddress: token.mint,
          });
        }
      }

      console.log("Final balances:", balances);

      // If we didn't find any balances, try to get all token accounts for the wallet
      if (balances.every((b) => b.balance === 0)) {
        console.log(
          "No specific token balances found, trying to get all token accounts..."
        );
        try {
          const allTokenAccounts =
            await connection.getParsedTokenAccountsByOwner(publicKey, {
              programId: new PublicKey(
                "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
              ),
            });
          console.log(
            `Found ${allTokenAccounts.value.length} total token accounts for wallet`
          );

          if (allTokenAccounts.value.length > 0) {
            console.log(
              "Sample token accounts:",
              allTokenAccounts.value.slice(0, 3).map((acc) => ({
                mint: acc.account.data.parsed.info.mint,
                balance: acc.account.data.parsed.info.tokenAmount.uiAmount,
                symbol:
                  acc.account.data.parsed.info.tokenAmount.symbol || "Unknown",
              }))
            );
          }
        } catch (fallbackError) {
          console.error("Error fetching all token accounts:", fallbackError);
        }
      }

      setTokenBalances(balances);
      if (onBalanceUpdate) {
        onBalanceUpdate(balances);
      }
    } catch (error) {
      console.error("Error fetching token balances:", error);

      // Try to at least get SOL balance as a fallback
      try {
        console.log(
          "Token fetching failed, trying to get SOL balance as fallback..."
        );
        const connection = await getWorkingConnection();
        const solBalance = await connection.getBalance(publicKey);
        const solAmount = solBalance / 1e9;

        // Create a fallback balance display
        const fallbackBalances: TokenBalance[] = [
          {
            mint: "SOL",
            symbol: "SOL",
            balance: solAmount,
            decimals: 9,
            mintAddress: "Native SOL",
          },
        ];

        setTokenBalances(fallbackBalances);
        setError("Token fetching failed, showing SOL balance only");
        if (onBalanceUpdate) {
          onBalanceUpdate(fallbackBalances);
        }
      } catch (fallbackError) {
        console.error("Fallback SOL balance also failed:", fallbackError);
        setError("Failed to fetch any balances. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (publicKey && walletName) {
      fetchTokenBalances();
    } else {
      setTokenBalances([]);
    }
  }, [publicKey, walletName]);

  return (
    <div
      className="bg-gray-50 rounded-lg p-4"
      style={{
        background: "#1C243E",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-bold text-white">Token Balances</h1>
        <div className="flex space-x-2" style={{ visibility: "hidden" }}>
          <button
            onClick={fetchTokenBalances}
            disabled={isLoading}
            className="text-xs text-purple-600 hover:text-purple-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={async () => {
              try {
                const connection = createConnection();
                const balance = await connection.getBalance(publicKey!);
                const solBalance = balance / 1e9; // Convert lamports to SOL
                alert(`SOL Balance: ${solBalance.toFixed(4)} SOL`);
              } catch (error) {
                console.error("SOL balance check failed:", error);
                alert(`SOL balance check failed: ${error}`);
              }
            }}
            disabled={!publicKey}
            className="text-xs text-green-600 hover:text-green-700 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Check SOL
          </button>
          <button
            onClick={async () => {
              try {
                const connection = await getWorkingConnection();
                const slot = await connection.getSlot();
                const endpoint = connection.rpcEndpoint;
                console.log(
                  `✅ Endpoint ${endpoint} successful! Slot: ${slot}`
                );
                setConnectionStatus(`✅ ${endpoint} (Slot: ${slot})`);
                alert(
                  `Connection successful!\nEndpoint: ${endpoint}\nCurrent slot: ${slot}`
                );
              } catch (error) {
                console.error("All endpoints failed:", error);
                setConnectionStatus(`❌ All endpoints failed`);
                alert(`All endpoints failed. Last error: ${error}`);
              }
            }}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Test Connection
          </button>
          <button
            onClick={async () => {
              try {
                // Simple ping test
                const response = await fetch("https://api.devnet.solana.com", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getHealth",
                  }),
                });

                if (response.ok) {
                  const data = await response.json();
                  console.log("Health check response:", data);
                  alert("Basic connectivity test passed!");
                } else {
                  throw new Error(`HTTP ${response.status}`);
                }
              } catch (error) {
                console.error("Basic connectivity test failed:", error);
                alert(`Basic connectivity test failed: ${error}`);
              }
            }}
            className="text-xs text-orange-600 hover:text-orange-700"
          >
            Quick Test
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      {/* Show loading spinner when wallet is connected and balances are loading */}
      {publicKey && isLoading ? (
        <LoadingSpinner />
      ) : isLoading && tokenBalances.length === 0 ? (
        <LoadingSpinner />
      ) : tokenBalances.length === 0 ? (
        <div className="grid grid-cols-1 gap-3">
          <div
            className="bg-white rounded-lg p-3"
            style={{
              background: "#0b1022",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white-500 uppercase tracking-wide">
                  IRMA
                </div>
                <div className="text-lg font-semibold text-white">---</div>
              </div>
              <div className="text-right">
                <div
                  className="text-xs text-white-500 font-mono"
                  style={{
                    color: "#22D1F8",
                  }}
                >
                  ---
                </div>
              </div>
            </div>
          </div>
          <div
            className="bg-white rounded-lg p-3"
            style={{
              background: "#0b1022",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-white-500 uppercase tracking-wide">
                  USDC
                </div>
                <div className="text-lg font-semibold text-white">---</div>
              </div>
              <div className="text-right">
                <div
                  className="text-xs text-white-500 font-mono"
                  style={{
                    color: "#22D1F8",
                  }}
                >
                  ---
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {tokenBalances.map((token) => (
            <div
              key={token.mintAddress}
              className="bg-white rounded-lg p-3"
              style={{
                background: "#0b1022",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white-500 uppercase tracking-wide">
                    {token.symbol}
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {token.balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-xs text-white-500 font-mono"
                    style={{
                      color: "#22D1F8",
                    }}
                  >
                    {token.mintAddress.slice(0, 8)}...
                    {token.mintAddress.slice(-8)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

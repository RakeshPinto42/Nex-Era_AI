"use client";

// Minimal EIP-1193 wallet connection — no external libraries. Talks directly to
// an injected provider (MetaMask / Rabby / Coinbase Wallet) via window.ethereum.
// Wallet address acts as a decentralized identity for the Mesh network.

import { useCallback, useEffect, useState } from "react";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

const CHAINS: Record<string, string> = {
  "0x1": "Ethereum",
  "0x89": "Polygon",
  "0xa": "Optimism",
  "0xa4b1": "Arbitrum",
  "0x2105": "Base",
};

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    const eth = window.ethereum;
    setHasProvider(Boolean(eth));
    if (!eth) return;

    // Restore an existing authorization without prompting.
    eth
      .request({ method: "eth_accounts" })
      .then((acc) => {
        const a = (acc as string[])?.[0];
        if (a) setAddress(a);
      })
      .catch(() => {});
    eth
      .request({ method: "eth_chainId" })
      .then((c) => setChainId(c as string))
      .catch(() => {});

    const onAccounts = (...args: unknown[]) =>
      setAddress((args[0] as string[])?.[0] ?? null);
    const onChain = (...args: unknown[]) => setChainId(args[0] as string);
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setError("No wallet found — install MetaMask to join the mesh.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const acc = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAddress(acc?.[0] ?? null);
      const c = (await eth.request({ method: "eth_chainId" })) as string;
      setChainId(c);
    } catch (e) {
      setError((e as { message?: string })?.message || "Connection rejected");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;
  const network = chainId ? CHAINS[chainId] ?? "Unknown chain" : null;

  return { address, short, network, connect, disconnect, connecting, error, hasProvider };
}

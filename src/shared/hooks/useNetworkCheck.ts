import { useEffect, useState } from 'react';
import { ATOM_CONTRACT_CHAIN_ID } from '../../abi';

interface UseNetworkCheckProps {
  walletConnected?: any;
  publicClient?: any;
}

interface NetworkCheckResult {
  isCorrectNetwork: boolean;
  currentChainId: number | null;
  targetChainId: number;
  allowedChainIds: number[];
  switchNetwork: () => Promise<void>;
}

interface WalletError {
  code: number;
  message: string;
}

// Configuration pour Intuition Mainnet
const INTUITION_MAINNET_CONFIG = {
  chainId: 1155, // Chain ID d'Intuition mainnet
  chainName: 'Intuition Mainnet',
  nativeCurrency: {
    name: 'TRUST',
    symbol: 'TRUST',
    decimals: 18,
  },
  rpcUrls: [import.meta.env.VITE_INTUITION_RPC_URL],
  blockExplorerUrls: ['https://explorer.intuition.systems'],
};

export const useNetworkCheck = ({ walletConnected, publicClient: _publicClient }: UseNetworkCheckProps): NetworkCheckResult => {
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const allowedChainIds = [1155]; // Intuition Mainnet uniquement
  const targetChainId = Number(ATOM_CONTRACT_CHAIN_ID); // 1155 pour Intuition mainnet

  // publicClient is NOT a valid source for this: it's a fixed RPC client
  // bound to Intuition's own endpoint, so publicClient.getChainId() always
  // returns 1155 regardless of what chain the wallet is really on.
  //
  // walletConnected.chain is ALSO not reliable: it's a static field set once
  // when the client object was constructed, not guaranteed to update after
  // the user switches networks in their wallet — depends entirely on the
  // host re-creating the client, which we can't assume. The only way to get
  // the wallet's actual live chain is to ask its provider directly via the
  // raw EIP-1193 `eth_chainId` call, and re-ask whenever the provider fires
  // `chainChanged` — same event MetaMask/injected wallets use internally.
  useEffect(() => {
    let cancelled = false;

    const readChainId = async () => {
      try {
        const hex = await walletConnected?.request?.({ method: 'eth_chainId' });
        if (!cancelled) setCurrentChainId(hex != null ? Number(hex) : null);
      } catch (error) {
        console.error('Error checking network:', error);
        if (!cancelled) setCurrentChainId(null);
      }
    };

    readChainId();

    const provider = (typeof window !== 'undefined' ? (window as any).ethereum : undefined);
    provider?.on?.('chainChanged', readChainId);

    return () => {
      cancelled = true;
      provider?.removeListener?.('chainChanged', readChainId);
    };
  }, [walletConnected]);

  const switchNetwork = async () => {
    if (!walletConnected) return;

    try {
      await walletConnected.switchChain({ chainId: targetChainId });
    } catch (error) {
      console.error('Error switching network:', error);
      const walletError = error as WalletError;

      if (walletError.code === 4902) {
        try {
          await walletConnected.addChain(INTUITION_MAINNET_CONFIG);
          await walletConnected.switchChain({ chainId: targetChainId });
        } catch (addError) {
          console.error('Error adding Intuition network:', addError);
          throw new Error('Unable to add Intuition network to your wallet. Please add it manually.');
        }
      } else {
        throw new Error('Unable to switch network. Please check your wallet.');
      }
    }
  };

  return {
    isCorrectNetwork: currentChainId !== null && allowedChainIds.includes(currentChainId),
    currentChainId,
    targetChainId,
    allowedChainIds,
    switchNetwork
  };
};

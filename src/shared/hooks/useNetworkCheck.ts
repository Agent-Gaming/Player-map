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
  rpcUrls: ['https://rpc.intuition.systems'],
  blockExplorerUrls: ['https://explorer.intuition.systems'],
};

export const useNetworkCheck = ({ walletConnected, publicClient }: UseNetworkCheckProps): NetworkCheckResult => {
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const allowedChainIds = [1155]; // Intuition Mainnet uniquement
  const targetChainId = Number(ATOM_CONTRACT_CHAIN_ID); // 1155 pour Intuition mainnet

  useEffect(() => {
    const checkNetwork = async () => {
      if (!walletConnected || !publicClient) return;

      try {
        const chainId = await publicClient.getChainId();
        setCurrentChainId(Number(chainId));
      } catch (error) {
        console.error('Error checking network:', error);
        setCurrentChainId(null);
      }
    };

    checkNetwork();
  }, [walletConnected, publicClient]);

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
    allowedChainIds
  };
};

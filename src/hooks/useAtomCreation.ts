import { ATOM_CONTRACT_ADDRESS, VALUE_PER_ATOM, atomABI } from '../abi';
import { toHex, parseEventLogs } from 'viem';
import { hashDataToIPFS } from '../utils/ipfs-utils';
import { ipfsToHttpUrl, isIpfsUrl } from '../utils/pinata';

export type IpfsAtom = {
  '@context': string;
  '@type': string;
  name: string;
  description?: string;
  image?: string;
};

export type IpfsAtomInput = {
  name: string;
  description?: string;
  image?: string | undefined;
};

export interface UseAtomCreationProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
}

export const useAtomCreation = ({ walletConnected, walletAddress, publicClient }: UseAtomCreationProps) => {
  // Fonction pour créer un atome à partir des données utilisateur
  const createAtom = async (input: IpfsAtomInput): Promise<{ atomId: bigint; ipfsHash: string }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // 1. Formater les données selon le schéma (comme dans buildproof)
      const atomData: IpfsAtom = {
        '@context': 'https://schema.org/',
        '@type': 'Thing',
        ...input,
      };

      // Transformer les URL IPFS en URL HTTP pour les images
      if (atomData.image && isIpfsUrl(atomData.image)) {
        // Convertir l'URL IPFS en URL HTTP de façon asynchrone
        atomData.image = await ipfsToHttpUrl(atomData.image);
      }

      // 2. Convert JSON data to bytes for the contract (like the original backend)
      const jsonString = JSON.stringify(atomData);
      const dataBytes = toHex(jsonString);

      // 3. Upload to IPFS for reference (optional)
      const { ipfsHash } = await hashDataToIPFS(atomData);

      // 4. Use VALUE_PER_ATOM directly
      const requiredAmount = VALUE_PER_ATOM;

      // 5. Create the atom with createAtoms
      const txHash = await walletConnected.writeContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'createAtoms',
        args: [
          [dataBytes],
          [requiredAmount]
        ],
        value: requiredAmount,
        gas: 2000000n, // Limit gas to 2M to prevent MetaMask from using excessive values
      });

      // 6. Wait for transaction confirmation
      // Normalize txHash (can be a string or an object with hash)
      const normalizedTxHash = typeof txHash === 'string' ? txHash : txHash.hash || txHash;
      
      let receipt;
      // Try first with publicClient (Viem)
      if (publicClient && publicClient.waitForTransactionReceipt) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: normalizedTxHash });
      } 
      // Otherwise try with walletConnected
      else if (walletConnected.waitForTransactionReceipt) {
        receipt = await walletConnected.waitForTransactionReceipt({ hash: normalizedTxHash });
      } 
      // Otherwise try with txHash.wait (ethers.js)
      else if (txHash.wait) {
        receipt = await txHash.wait();
      } 
      // Last resort: use publicClient.getTransactionReceipt with polling
      else if (publicClient && publicClient.getTransactionReceipt) {
        // Manual polling to retrieve receipt
        const maxAttempts = 30; // 30 attempts
        const delay = 2000; // 2 seconds between each attempt
        for (let i = 0; i < maxAttempts; i++) {
          try {
            receipt = await publicClient.getTransactionReceipt({ hash: normalizedTxHash });
            if (receipt) break;
          } catch (error) {
            // Transaction not yet confirmed, continue waiting
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        if (!receipt) {
          throw new Error('Transaction receipt not found after waiting');
        }
      } 
      else {
        throw new Error('No method available to wait for transaction receipt. publicClient is required.');
      }

      // 7. Verify that receipt exists and check transaction status
      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      // Check if transaction was successful
      if (receipt.status === 'reverted' || receipt.status === 0) {
        throw new Error('Transaction reverted. The transaction may have failed due to insufficient gas or contract error.');
      }

      // Verify that receipt contains logs
      if (!receipt.logs || receipt.logs.length === 0) {
        throw new Error('Transaction receipt does not contain logs. Transaction may have been reverted.');
      }

      // 8. Decode events from receipt
      const events = parseEventLogs({
        abi: atomABI,
        logs: receipt.logs
      });

      // 9. Find AtomCreated event and extract real atomId (termId)
      const atomCreatedEvent = events.find((e: any) => e.eventName === 'AtomCreated') as any;
      
      if (!atomCreatedEvent || !atomCreatedEvent.args || !atomCreatedEvent.args.termId) {
        throw new Error('AtomCreated event not found in transaction receipt');
      }

      // 10. Extract real atomId from event
      const realAtomId = atomCreatedEvent.args.termId;

      return {
        atomId: BigInt(realAtomId),
        ipfsHash
      };
    } catch (error) {
      console.error('Error creating atom:', error);
      throw error;
    }
  };

  return {
    createAtom,
  };
}; 

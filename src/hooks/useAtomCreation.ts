import { ATOM_CONTRACT_ADDRESS, VALUE_PER_ATOM, atomABI } from '../abi';
import { toHex, parseEventLogs } from 'viem';
import { hashDataToIPFS } from '../utils/ipfsUtils'; // Importer depuis ipfsUtils
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

async function waitForAtomId(
  txHash: any,
  walletConnected: any,
  publicClient: any
): Promise<bigint> {
  // Normalize txHash
  const normalizedTxHash = typeof txHash === 'string' ? txHash : txHash.hash || txHash;

  let receipt: any;
  if (publicClient && publicClient.waitForTransactionReceipt) {
    receipt = await publicClient.waitForTransactionReceipt({ hash: normalizedTxHash });
  } else if (walletConnected.waitForTransactionReceipt) {
    receipt = await walletConnected.waitForTransactionReceipt({ hash: normalizedTxHash });
  } else if (txHash.wait) {
    receipt = await txHash.wait();
  } else if (publicClient && publicClient.getTransactionReceipt) {
    const maxAttempts = 30;
    const delay = 2000;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        receipt = await publicClient.getTransactionReceipt({ hash: normalizedTxHash });
        if (receipt) break;
      } catch (_) { /* not yet confirmed */ }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    if (!receipt) throw new Error('Transaction receipt not found after waiting');
  } else {
    throw new Error('No method available to wait for transaction receipt. publicClient is required.');
  }

  if (!receipt) throw new Error('Transaction receipt not found');
  if (receipt.status === 'reverted' || receipt.status === 0) {
    throw new Error('Transaction reverted. Check gas or contract error.');
  }
  if (!receipt.logs || receipt.logs.length === 0) {
    throw new Error('Transaction receipt contains no logs. Transaction may have been reverted.');
  }

  const events = parseEventLogs({ abi: atomABI, logs: receipt.logs });
  const atomCreatedEvent = events.find((e: any) => e.eventName === 'AtomCreated') as any;
  if (!atomCreatedEvent?.args?.termId) {
    throw new Error('AtomCreated event not found in transaction receipt');
  }
  return BigInt(atomCreatedEvent.args.termId);
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

      // 4. Fetch the minimum required amount from the contract.
      // VALUE_PER_ATOM (from env) is used as fallback when publicClient is unavailable.
      let requiredAmount = VALUE_PER_ATOM;
      console.log('[createAtom] publicClient type:', typeof publicClient, 'has readContract:', !!publicClient?.readContract);
      if (publicClient?.readContract) {
        try {
          const contractMin = await publicClient.readContract({
            address: ATOM_CONTRACT_ADDRESS,
            abi: atomABI,
            functionName: 'getAtomCreationCost',
          }) as bigint;
          console.log('[createAtom] getAtomCreationCost returned:', contractMin?.toString());
          if (contractMin > requiredAmount) requiredAmount = contractMin;
        } catch (e) {
          console.warn('[createAtom] getAtomCreationCost failed, using env value:', e);
        }
      } else {
        console.warn('[createAtom] publicClient.readContract unavailable — using env VALUE_PER_ATOM:', VALUE_PER_ATOM?.toString());
      }

      // 5. Simulate first to surface the actual revert reason, then write
      if (publicClient?.simulateContract) {
        try {
          await publicClient.simulateContract({
            address: ATOM_CONTRACT_ADDRESS,
            abi: atomABI,
            functionName: 'createAtoms',
            args: [[dataBytes], [requiredAmount]],
            value: requiredAmount,
            account: walletAddress as `0x${string}`,
          });
        } catch (simErr: any) {
          console.error('[createAtom] simulation raw error:', simErr);
          console.error('[createAtom] cause:', simErr?.cause);
          console.error('[createAtom] cause.data:', simErr?.cause?.data);
          console.error('[createAtom] args used:', {
            contract: ATOM_CONTRACT_ADDRESS,
            dataBytes,
            requiredAmount: requiredAmount?.toString(),
            value: requiredAmount?.toString(),
            account: walletAddress,
          });
          const reason = simErr?.cause?.data?.errorName
            || simErr?.cause?.reason
            || simErr?.shortMessage
            || simErr?.message
            || String(simErr);
          throw new Error(`createAtoms simulation failed: ${reason}`);
        }
      }

      const txHash = await walletConnected.writeContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'createAtoms',
        args: [
          [dataBytes],
          [requiredAmount]
        ],
        value: requiredAmount,
        gas: 2000000n,
      });

      const realAtomId = await waitForAtomId(txHash, walletConnected, publicClient);

      return {
        atomId: BigInt(realAtomId),
        ipfsHash
      };
    } catch (error) {
      console.error('Error creating atom:', error);
      throw error;
    }
  };

  // Creates a simple string atom (raw bytes, no JSON-LD or IPFS).
  // Used for alias pseudonyms and other raw-string atoms.
  const createStringAtom = async (str: string): Promise<{ atomId: bigint }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    try {
      // Encode string as raw UTF-8 bytes (no JSON-LD wrapper)
      const dataBytes = toHex(str);
      // Fetch minimum from contract; fall back to env value if unavailable
      let atomCost = VALUE_PER_ATOM;
      if (publicClient?.readContract) {
        try {
          const contractMin = await publicClient.readContract({
            address: ATOM_CONTRACT_ADDRESS,
            abi: atomABI,
            functionName: 'getAtomCreationCost',
          }) as bigint;
          if (contractMin > atomCost) atomCost = contractMin;
        } catch { /* fall back to env value */ }
      }
      const txHash = await walletConnected.writeContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'createAtoms',
        args: [[dataBytes], [atomCost]],
        value: atomCost,
        gas: 2000000n,
      });
      const realAtomId = await waitForAtomId(txHash, walletConnected, publicClient);
      return { atomId: realAtomId };
    } catch (error) {
      console.error('Error creating string atom:', error);
      throw error;
    }
  };

  return {
    createAtom,
    createStringAtom,
  };
};

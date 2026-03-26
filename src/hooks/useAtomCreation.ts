import {
  createAtomFromString,
  createAtomFromThing,
  createAtomFromEthereumAccount,
} from '@0xintuition/sdk';
import { ATOM_CONTRACT_ADDRESS, atomABI } from '../abi';
import { ipfsToHttpUrl, isIpfsUrl } from '../utils/pinata';
import type { Address } from 'viem';

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
  const writeConfig = {
    address: ATOM_CONTRACT_ADDRESS as Address,
    walletClient: walletConnected as any,
    publicClient,
  };

  /**
   * Creates a rich JSON-LD atom (name + optional image).
   * Converts IPFS image URLs to HTTP gateway URLs before storing.
   */
  const createAtom = async (input: IpfsAtomInput): Promise<{ atomId: bigint; ipfsHash: string }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    const imageUrl = input.image && isIpfsUrl(input.image)
      ? ipfsToHttpUrl(input.image)
      : input.image;

    console.log('[createAtom] ▶ name:', input.name, '| image:', imageUrl ?? '(none)');
    const result = await createAtomFromThing(writeConfig, {
      name: input.name,
      image: imageUrl,
      description: input.description,
    });
    console.log('[createAtom] ✓ atomId:', result.state.termId, '| ipfsHash:', result.uri);
    return {
      atomId: BigInt(result.state.termId),
      ipfsHash: result.uri ?? '',
    };
  };

  /**
   * Creates a plain UTF-8 string atom (pseudonym / username atoms without image).
   */
  const createStringAtom = async (str: string): Promise<{ atomId: bigint }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    console.log('[createStringAtom] ▶ str:', str);
    const result = await createAtomFromString(writeConfig, str);
    console.log('[createStringAtom] ✓ atomId:', result.state.termId);
    return { atomId: BigInt(result.state.termId) };
  };

  /**
   * Creates an Ethereum account atom for a wallet address.
   * The SDK encodes the address as toHex(getAddress(address)) — 20 bytes checksummed.
   * Replaces the rawHex=true path previously in createStringAtom.
   *
   * SDK signature: createAtomFromEthereumAccount(config, address, deposit?)
   * where deposit is ADDED to getAtomCost(). We fetch getAtomCost() ourselves so
   * total assets = max(getAtomCost(), VITE_VALUE_PER_ATOM), matching the contract minimum.
   */
  const createEthereumAccountAtom = async (address: string): Promise<{ atomId: bigint }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    console.log('[createEthereumAccountAtom] ▶ address to register:', address);
    console.log('[createEthereumAccountAtom] signer walletAddress:', walletAddress);
    console.log('[createEthereumAccountAtom] contract:', ATOM_CONTRACT_ADDRESS);
    console.log('[createEthereumAccountAtom] publicClient available:', !!publicClient);

    const envAtomCost = BigInt(import.meta.env.VITE_VALUE_PER_ATOM || '10000000000000000');
    console.log('[createEthereumAccountAtom] envAtomCost (VITE_VALUE_PER_ATOM):', envAtomCost.toString(), `(${Number(envAtomCost) / 1e18} ETH)`);

    const atomBaseCost: bigint = publicClient
      ? (await publicClient.readContract({
          address: ATOM_CONTRACT_ADDRESS as Address,
          abi: atomABI,
          functionName: 'getAtomCost',
        }) as bigint)
      : 0n;
    console.log('[createEthereumAccountAtom] contract getAtomCost():', atomBaseCost.toString(), `(${Number(atomBaseCost) / 1e18} ETH)`);

    const depositAmount = envAtomCost > atomBaseCost ? envAtomCost - atomBaseCost : 0n;
    console.log('[createEthereumAccountAtom] depositAmount (extra passed to SDK):', depositAmount.toString(), `(${Number(depositAmount) / 1e18} ETH)`);
    console.log('[createEthereumAccountAtom] total assets = getAtomCost + deposit =', (atomBaseCost + depositAmount).toString());

    const result = await createAtomFromEthereumAccount(writeConfig, address as Address, depositAmount as any);
    console.log('[createEthereumAccountAtom] ✓ full result:', result);
    console.log('[createEthereumAccountAtom] ✓ atomId:', result.state.termId);
    return { atomId: BigInt(result.state.termId) };
  };

  return {
    createAtom,
    createStringAtom,
    createEthereumAccountAtom,
  };
};

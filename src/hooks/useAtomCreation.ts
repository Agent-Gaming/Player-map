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

    const result = await createAtomFromThing(writeConfig, {
      name: input.name,
      image: imageUrl,
      description: input.description,
    });
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
    const result = await createAtomFromString(writeConfig, str);
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
    const envAtomCost = BigInt(import.meta.env.VITE_VALUE_PER_ATOM || '10000000000000000');
    const atomBaseCost: bigint = publicClient
      ? (await publicClient.readContract({
          address: ATOM_CONTRACT_ADDRESS as Address,
          abi: atomABI,
          functionName: 'getAtomCost',
        }) as bigint)
      : 0n;
    const depositAmount = envAtomCost > atomBaseCost ? envAtomCost - atomBaseCost : 0n;
    const result = await createAtomFromEthereumAccount(writeConfig, address as Address, depositAmount as any);
    return { atomId: BigInt(result.state.termId) };
  };

  return {
    createAtom,
    createStringAtom,
    createEthereumAccountAtom,
  };
};

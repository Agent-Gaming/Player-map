import {
  createAtomFromString,
  createAtomFromThing,
  createAtomFromEthereumAccount,
} from '@0xintuition/sdk';
import { ATOM_CONTRACT_ADDRESS } from '../abi';
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
   */
  const createEthereumAccountAtom = async (address: string): Promise<{ atomId: bigint }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    const result = await createAtomFromEthereumAccount(writeConfig, address as Address);
    return { atomId: BigInt(result.state.termId) };
  };

  return {
    createAtom,
    createStringAtom,
    createEthereumAccountAtom,
  };
};

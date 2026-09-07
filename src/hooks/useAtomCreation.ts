import {
  createAtomFromString,
  createAtomFromEthereumAccount,
  createAtomFromIpfsUpload,
} from '@0xintuition/sdk';
import { ATOM_CONTRACT_ADDRESS, atomABI } from '../abi';
import { isIpfsUrl, ipfsToHttpUrl } from '../utils/pinata';
import { getPinataConstants } from '../utils/globalConstants';
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
   *
   * Pins via Pinata directly (createAtomFromIpfsUpload) instead of the SDK's
   * createAtomFromThing/pinThing, which routes through Intuition's gated
   * pinning GraphQL mutation (requires an INTUITION_PIN_API_KEY we don't have).
   * The on-chain contract only stores the resulting ipfs:// URI — it doesn't
   * care which service pinned it — so a schema.org-shaped JSON-LD object
   * pinned through our own Pinata JWT is indistinguishable on-chain and to
   * the Intuition indexer/portal from one pinned via pinThing.
   */
  const createAtom = async (input: IpfsAtomInput): Promise<{ atomId: bigint; ipfsHash: string }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    const imageUrl = input.image && isIpfsUrl(input.image)
      ? ipfsToHttpUrl(input.image)
      : input.image;

    const pinataConstants = getPinataConstants();
    if (!pinataConstants?.PINATA_CONFIG?.JWT_KEY) {
      throw new Error('Pinata JWT not configured — call setPinataConstants() with PINATA_CONFIG');
    }
    const config = {
      ...writeConfig,
      pinataApiJWT: pinataConstants.PINATA_CONFIG.JWT_KEY as string,
    };
    const thingJson = {
      '@context': 'https://schema.org',
      '@type': 'Thing',
      name: input.name,
      description: input.description ?? '',
      image: imageUrl ?? '',
      url: '',
    };

    console.log('[createAtom] ▶ name:', input.name, '| image:', imageUrl ?? '(none)');
    const result = await createAtomFromIpfsUpload(config, thingJson);
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

  /**
   * Creates a consent atom by uploading a JSON object to IPFS via Pinata,
   * then creating an on-chain atom pointing to that IPFS URI.
   * Requires PINATA_CONFIG.JWT_KEY to be set via setPinataConstants().
   */
  const createConsentAtom = async (consentJson: object): Promise<{ atomId: bigint }> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }
    const pinataConstants = getPinataConstants();
    if (!pinataConstants?.PINATA_CONFIG?.JWT_KEY) {
      throw new Error('Pinata JWT not configured — call setPinataConstants() with PINATA_CONFIG');
    }
    const config = {
      ...writeConfig,
      pinataApiJWT: pinataConstants.PINATA_CONFIG.JWT_KEY as string,
    };
    console.log('[createConsentAtom] ▶ uploading consent JSON to IPFS');
    const result = await createAtomFromIpfsUpload(config, consentJson);
    console.log('[createConsentAtom] ✓ atomId:', result.state.termId, '| uri:', result.uri);
    return { atomId: BigInt(result.state.termId) };
  };

  return {
    createAtom,
    createStringAtom,
    createEthereumAccountAtom,
    createConsentAtom,
  };
};

import { batchCreateTripleStatements, calculateTripleId } from '@0xintuition/sdk';
import { toHex } from 'viem';
import { ATOM_CONTRACT_ADDRESS, atomABI } from '../abi';
import { DefaultPlayerMapConstants } from '../types/PlayerMapConfig';
import type { Address, Hex } from 'viem';

export interface TripleToCreate {
  subjectId: bigint;
  predicateId: bigint;
  objectId: bigint;
}

interface UseBatchCreateTripleProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  constants: DefaultPlayerMapConstants;
}

export const useBatchCreateTriple = ({ walletConnected, walletAddress, publicClient }: UseBatchCreateTripleProps) => {
  const writeConfig = {
    address: ATOM_CONTRACT_ADDRESS as Address,
    walletClient: walletConnected,
    publicClient,
  };

  /**
   * Check if a triple already exists on-chain.
   * calculateTripleId is pure (no RPC). isTriple is one readContract.
   */
  const checkTripleExists = async (
    subjectId: bigint,
    predicateId: bigint,
    objectId: bigint,
  ): Promise<boolean> => {
    try {
      const readClient = publicClient || walletConnected;
      if (!readClient?.readContract) return false;

      const termId = calculateTripleId(
        toHex(subjectId,   { size: 32 }),
        toHex(predicateId, { size: 32 }),
        toHex(objectId,    { size: 32 }),
      );

      const exists = await readClient.readContract({
        address: ATOM_CONTRACT_ADDRESS,
        abi: atomABI,
        functionName: 'isTriple',
        args: [termId],
      });

      return Boolean(exists);
    } catch (error) {
      console.error('Error checking if triple exists:', error);
      return false;
    }
  };

  /**
   * Create one or more triples in a single transaction.
   * The SDK fetches getTripleCost() automatically.
   * assets[i] = 0n (no extra per-triple vault deposit).
   */
  const batchCreateTriple = async (triples: TripleToCreate[]): Promise<any> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }

    const subjectIds   = triples.map(t => toHex(t.subjectId,   { size: 32 }) as Hex);
    const predicateIds = triples.map(t => toHex(t.predicateId, { size: 32 }) as Hex);
    const objectIds    = triples.map(t => toHex(t.objectId,    { size: 32 }) as Hex);
    const assets       = triples.map(() => 0n);

    const result = await batchCreateTripleStatements(
      writeConfig,
      [subjectIds, predicateIds, objectIds, assets] as any,
    );

    return { hash: result.transactionHash, state: result.state };
  };

  /**
   * Compute the vault termId of a triple deterministically.
   * Uses calculateTripleId from SDK — pure, no RPC.
   * Returns bigint for API compatibility with existing callers.
   */
  const computeTripleId = async (
    subjectId: bigint,
    predicateId: bigint,
    objectId: bigint,
  ): Promise<bigint> => {
    const termId = calculateTripleId(
      toHex(subjectId,   { size: 32 }),
      toHex(predicateId, { size: 32 }),
      toHex(objectId,    { size: 32 }),
    );
    return BigInt(termId);
  };

  return {
    checkTripleExists,
    batchCreateTriple,
    computeTripleId,
  };
};

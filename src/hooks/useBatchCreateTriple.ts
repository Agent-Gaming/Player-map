import { batchCreateTripleStatements, calculateTripleId } from '@0xintuition/sdk';
import { toHex } from 'viem';
import { ATOM_CONTRACT_ADDRESS, atomABI } from '../abi';
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
        functionName: 'isTermCreated',
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
   * assets[i] = getTripleCost() per triple — mirrors createAtomFromEthereumAccount
   * where assets[0] = getAtomCost(). Sending assets[i] = 0 causes
   * MultiVault_InsufficientBalance because the vault requires a minimum initial deposit.
   */
  const batchCreateTriple = async (triples: TripleToCreate[]): Promise<any> => {
    if (!walletConnected || !walletAddress) {
      throw new Error('Wallet not connected');
    }

    // Fetch the required vault deposit per triple (minimum = getTripleCost()).
    const tripleVaultDeposit: bigint = publicClient
      ? (await publicClient.readContract({
          address: ATOM_CONTRACT_ADDRESS,
          abi: atomABI,
          functionName: 'getTripleCost',
        }) as bigint)
      : BigInt(import.meta.env.VITE_VALUE_PER_TRIPLE || '10000000000000000');

    const subjectIds   = triples.map(t => toHex(t.subjectId,   { size: 32 }) as Hex);
    const predicateIds = triples.map(t => toHex(t.predicateId, { size: 32 }) as Hex);
    const objectIds    = triples.map(t => toHex(t.objectId,    { size: 32 }) as Hex);

    // Add 0.01 ETH on top of the minimum vault deposit to include an initial stake
    const depositPerTriple = tripleVaultDeposit + 10000000000000000n;
    const assets = triples.map(() => depositPerTriple);

    // SDK sends tripleVaultDeposit by default (1x minimum).
    // Total ETH needed = N * depositPerTriple
    // Extra to pass = N * depositPerTriple - tripleVaultDeposit
    const totalExtraDeposit = depositPerTriple * BigInt(triples.length) - tripleVaultDeposit;

    const result = await batchCreateTripleStatements(
      writeConfig,
      [subjectIds, predicateIds, objectIds, assets] as any,
      totalExtraDeposit > 0n ? (totalExtraDeposit as any) : undefined,
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

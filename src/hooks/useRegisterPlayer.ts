import { useState } from 'react';
import { getAddress } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { DefaultPlayerMapConstants } from '../types/PlayerMapConfig';
import { IdentityCreationState, IdentityCreationStep } from '../types/alias';
import { useAtomCreation } from './useAtomCreation';
import { useBatchCreateTriple } from './useBatchCreateTriple';
import { fetchAccountAtom } from '../api/fetchPlayerAliases';

interface UseRegisterPlayerProps {
  walletConnected?: any;
  walletAddress?: string;
  constants: DefaultPlayerMapConstants;
  publicClient?: any;
  network?: Network;
}

/**
 * Phase 1 registration hook.
 *
 * Creates the player's identity via three sequential on-chain operations:
 *   1. createStringAtom(pseudo)               → pseudoAtomId
 *   2. getOrCreate account atom(walletAddress) → accountAtomId
 *   3. createTriple([accountAtom, HAS_ALIAS, pseudoAtom])
 *
 * Retry-safe: pseudoAtomId and accountAtomId are preserved in state on error
 * so that a retry call to register(pseudo) skips already-completed steps.
 *
 * Call reset() only to explicitly cancel the flow (clears all preserved IDs).
 */
export const useRegisterPlayer = ({
  walletConnected,
  walletAddress,
  constants,
  publicClient,
  network,
}: UseRegisterPlayerProps) => {
  const [state, setState] = useState<IdentityCreationState>({ step: 'idle' });
  const queryClient = useQueryClient();

  const { createStringAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient });
  const { batchCreateTriple } = useBatchCreateTriple({
    walletConnected,
    walletAddress,
    publicClient,
    constants,
  });

  const register = async (pseudo: string) => {
    if (!walletConnected || !walletAddress || !pseudo.trim()) return;

    const predicateId = constants.HAS_ALIAS_PREDICATE_ID;
    if (!predicateId || predicateId.startsWith('<')) {
      setState({ step: 'error', error: 'HAS_ALIAS_PREDICATE_ID is not configured — set it in your PlayerMapConstants' });
      return;
    }

    try {
      // Step 1 — pseudo atom (skip if already created on a previous attempt)
      let pseudoAtomId = state.pseudoAtomId;
      if (!pseudoAtomId) {
        setState(s => ({ ...s, step: 'creating-pseudo-atom' }));
        const result = await createStringAtom(pseudo.trim());
        pseudoAtomId = `0x${result.atomId.toString(16)}`;
        setState(s => ({ ...s, pseudoAtomId }));
      }

      // Step 2 — account atom: reuse existing, create if absent
      let accountAtomId = state.accountAtomId;
      if (!accountAtomId) {
        setState(s => ({ ...s, step: 'fetching-account-atom' }));
        accountAtomId = await fetchAccountAtom(walletAddress, network);
        if (!accountAtomId) {
          setState(s => ({ ...s, step: 'creating-account-atom' }));
          const result = await createStringAtom(getAddress(walletAddress)); // EIP-55 checksummed + toHex() — matches @0xintuition/sdk createAtomFromEthereumAccount
          accountAtomId = `0x${result.atomId.toString(16)}`;
        }
        setState(s => ({ ...s, accountAtomId }));
      }

      // Step 3 — [accountAtom] [has alias] [pseudoAtom] triple
      setState(s => ({ ...s, step: 'creating-alias-triple' }));
      await batchCreateTriple([{
        subjectId: BigInt(accountAtomId),
        predicateId: BigInt(predicateId),
        objectId: BigInt(pseudoAtomId),
      }]);

      setState(s => ({ ...s, step: 'success' }));
      // Invalidate both account atom and alias queries so the read hooks refresh
      await queryClient.invalidateQueries({ queryKey: ['accountAtom'] });
      await queryClient.invalidateQueries({ queryKey: ['playerAliases'] });
    } catch (err) {
      setState(s => ({
        ...s,
        step: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  };

  // reset clears ALL state including preserved IDs.
  // Only call this on explicit cancel — not on retry.
  // For retry: call register(pseudo) directly; existing pseudoAtomId/accountAtomId are reused.
  const reset = () => setState({ step: 'idle' });

  const TERMINAL: IdentityCreationStep[] = ['idle', 'success', 'error'];

  return {
    register,
    reset,
    step: state.step,
    isRegistering: !TERMINAL.includes(state.step),
    error: state.error,
    pseudoAtomId: state.pseudoAtomId,
    accountAtomId: state.accountAtomId,
  };
};

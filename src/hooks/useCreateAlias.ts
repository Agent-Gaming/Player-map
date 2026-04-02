import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultPlayerMapConstants } from '../types/PlayerMapConfig';
import { AliasCreationState, AliasCreationStep } from '../types/alias';
import { useAtomCreation } from './useAtomCreation';
import { useBatchCreateTriple } from './useBatchCreateTriple';

interface UseCreateAliasProps {
  walletConnected?: any;
  walletAddress?: string;
  constants: DefaultPlayerMapConstants;
  publicClient?: any;
  // The player's existing atom term_id — subject of the [has alias] triple.
  // Obtain from usePlayerAliases().playerAtomId.
  playerAtomId: string | null;
}

export const useCreateAlias = ({
  walletConnected,
  walletAddress,
  constants,
  publicClient,
  playerAtomId,
}: UseCreateAliasProps) => {
  const [state, setState] = useState<AliasCreationState>({ step: 'idle' });
  const queryClient = useQueryClient();
  const { createStringAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient });
  const { batchCreateTriple } = useBatchCreateTriple({
    walletConnected,
    walletAddress,
    publicClient,
    constants,
  });

  const createAlias = async (pseudo: string) => {
    if (!walletConnected || !walletAddress || !playerAtomId) return;
    if (!pseudo.trim()) return;

    const predicateId = constants.HAS_ALIAS_PREDICATE_ID;
    if (!predicateId || predicateId.startsWith('<')) {
      setState({ step: 'error', error: 'HAS_ALIAS_PREDICATE_ID is not configured — set it in your PlayerMapConstants' });
      return;
    }

    try {
      // Step 1 — create pseudo atom
      // Skip if pseudoAtomId already exists (retry path: atom was created but triple failed)
      let pseudoAtomId = state.pseudoAtomId;
      if (!pseudoAtomId) {
        setState({ step: 'creating-pseudo-atom' });
        const result = await createStringAtom(pseudo.trim());
        // Store as hex string to match term_id format (0x...) used throughout the codebase
        pseudoAtomId = `0x${result.atomId.toString(16)}`;
        setState(s => ({ ...s, pseudoAtomId }));
      }

      // Step 2 — create the [playerAtom] [has alias] [pseudoAtom] triple
      setState(s => ({ ...s, step: 'creating-triple' as AliasCreationStep }));
      await batchCreateTriple([
        {
          subjectId: BigInt(playerAtomId),
          predicateId: BigInt(predicateId),
          objectId: BigInt(pseudoAtomId),
        },
      ]);

      setState({ step: 'success', pseudoAtomId });
      // Invalidate both alias queries so the list refreshes
      await queryClient.invalidateQueries({ queryKey: ['playerAliases'] });
    } catch (err: any) {
      console.error('[useCreateAlias] Error creating alias:', err);

      const isRejected =
        err?.name === 'UserRejectedRequestError' ||
        (err?.message ?? '').toLowerCase().includes('user rejected') ||
        (err?.shortMessage ?? '').toLowerCase().includes('user rejected');

      setState(s => ({
        ...s,
        step: 'error',
        error: isRejected ? 'User rejected the request.' : (err?.shortMessage ?? err?.message ?? String(err)),
      }));
    }
  };

  // reset clears ALL state including pseudoAtomId.
  // Call this only when the user explicitly cancels the flow.
  // For "Réessayer" (retry after error): call createAlias(pseudo) directly — this preserves
  // pseudoAtomId in state so atom creation is skipped and only the triple is retried.
  const reset = () => setState({ step: 'idle' });

  return {
    createAlias,
    reset,
    step: state.step,
    isCreating: !(['idle', 'success', 'error'] as AliasCreationStep[]).includes(state.step),
    error: state.error,
    pseudoAtomId: state.pseudoAtomId,
  };
};

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { DefaultPlayerMapConstants } from '../types/PlayerMapConfig';
import { IdentityCreationState, IdentityCreationStep } from '../types/alias';
import { useAtomCreation } from './useAtomCreation';
import { useBatchCreateTriple } from './useBatchCreateTriple';
import { fetchAccountAtom } from '../api/fetchPlayerAliases';
import { uploadToPinata } from '../utils/pinata';
import { ATOM_CONTRACT_ADDRESS, atomABI } from '../abi';
import { calculateAtomId } from '@0xintuition/sdk';
import { toHex, getAddress } from 'viem';

interface UseRegisterPlayerProps {
  walletConnected?: any;
  walletAddress?: string;
  constants: DefaultPlayerMapConstants;
  publicClient?: any;
  network?: Network;
  guildId?: string;              // hex ID of selected guild atom; if set, creates nested guild triple in step 4
  existingAccountAtomId?: string; // if already known (returning user), skip fetch/create entirely
}

/**
 * Phase 1 registration hook.
 *
 * Creates the player's identity via up to four sequential on-chain operations:
 *   1. createStringAtom(pseudo)               → pseudoAtomId
 *   2. getOrCreate account atom(walletAddress) → accountAtomId
 *   3. createTriple([accountAtom, HAS_ALIAS, pseudoAtom]) → aliasTripleId
 *   4. (if guildId) createTriple([aliasTripleId, IS_MEMBER_OF, guildAtomId])
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
  guildId,
  existingAccountAtomId,
}: UseRegisterPlayerProps) => {
  const [state, setState] = useState<IdentityCreationState>({ step: 'idle' });
  const queryClient = useQueryClient();

  const { createAtom, createStringAtom, createEthereumAccountAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient });
  const { batchCreateTriple, computeTripleId } = useBatchCreateTriple({
    walletConnected,
    walletAddress,
    publicClient,
    constants,
  });

  const register = async (pseudo: string, imageFile?: File) => {
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
        if (imageFile) {
          const imageUrl = await uploadToPinata(imageFile);
          const result = await createAtom({ name: pseudo.trim(), image: imageUrl });
          pseudoAtomId = `0x${result.atomId.toString(16)}`;
        } else {
          const result = await createStringAtom(pseudo.trim());
          pseudoAtomId = `0x${result.atomId.toString(16)}`;
        }
        setState(s => ({ ...s, pseudoAtomId }));
      }

      // Step 2 — account atom: use known ID (returning user) → fetch → create
      let accountAtomId = state.accountAtomId ?? existingAccountAtomId;
      console.log('[useRegisterPlayer] Step 2 — account atom | walletAddress:', walletAddress);
      console.log('[useRegisterPlayer] existingAccountAtomId (prop):', existingAccountAtomId ?? '(none)');
      console.log('[useRegisterPlayer] state.accountAtomId (retry cache):', state.accountAtomId ?? '(none)');
      if (!accountAtomId) {
        setState(s => ({ ...s, step: 'fetching-account-atom' }));
        console.log('[useRegisterPlayer] → fetching account atom from indexer...');
        const fetchedAccountAtomId = await fetchAccountAtom(walletAddress, network);
        console.log('[useRegisterPlayer] fetchAccountAtom result:', fetchedAccountAtomId ?? '(not found)');
        if (fetchedAccountAtomId) accountAtomId = fetchedAccountAtomId;

        // On-chain fallback: only check SDK format (checksummed address via createAtomFromEthereumAccount).
        // The legacy lowercase format is intentionally excluded — it incorrectly matches old string atoms
        // that have the same computed ID but are not proper Ethereum Account type atoms.
        if (!accountAtomId && publicClient?.readContract) {
          console.log('[useRegisterPlayer] → on-chain fallback (indexer miss), SDK format only');
          try {
            const sdkAtomData = toHex(getAddress(walletAddress));
            const computedId = calculateAtomId(sdkAtomData);
            console.log(`[useRegisterPlayer]   sdkAtomData="${sdkAtomData}" → computedId=${computedId}`);
            const exists = await publicClient.readContract({
              address: ATOM_CONTRACT_ADDRESS,
              abi: atomABI,
              functionName: 'isAtom',
              args: [computedId],
            }) as boolean;
            console.log(`[useRegisterPlayer]   isAtom(${computedId}):`, exists);
            if (exists) {
              console.log('[useRegisterPlayer] ✓ account atom found on-chain (SDK format):', computedId);
              accountAtomId = computedId;
            } else {
              console.log('[useRegisterPlayer] on-chain fallback: no SDK-format atom found → will create');
            }
          } catch (e) {
            console.warn('[useRegisterPlayer] on-chain atom lookup failed:', e);
          }
        }

        if (!accountAtomId) {
          console.log('[useRegisterPlayer] → creating new account atom for:', walletAddress);
          setState(s => ({ ...s, step: 'creating-account-atom' }));
          const result = await createEthereumAccountAtom(walletAddress);
          accountAtomId = `0x${result.atomId.toString(16)}`;
          console.log('[useRegisterPlayer] ✓ account atom created, id:', accountAtomId);
        }
        setState(s => ({ ...s, accountAtomId }));
      } else {
        console.log('[useRegisterPlayer] ✓ account atom already known, skipping fetch/create:', accountAtomId);
      }

      // Step 3 — [accountAtom] [has alias] [pseudoAtom] triple
      setState(s => ({ ...s, step: 'creating-alias-triple' }));
      await batchCreateTriple([{
        subjectId: BigInt(accountAtomId),
        predicateId: BigInt(predicateId),
        objectId: BigInt(pseudoAtomId),
      }]);

      // Compute the alias triple vault ID (pure contract read — no gas)
      const aliasTripleVaultId = await computeTripleId(
        BigInt(accountAtomId),
        BigInt(predicateId),
        BigInt(pseudoAtomId),
      );
      const aliasTripleIdStr = `0x${aliasTripleVaultId.toString(16)}`;
      setState(s => ({ ...s, aliasTripleId: aliasTripleIdStr }));

      // Step 4 — nested guild triple: [aliasTriple] [IS_MEMBER_OF] [guild] (optional)
      if (guildId && guildId.trim()) {
        const isMemberOfId = constants.COMMON_IDS.IS_MEMBER_OF;
        if (!isMemberOfId || isMemberOfId.startsWith('<')) {
          throw new Error('IS_MEMBER_OF predicate ID is not configured');
        }
        setState(s => ({ ...s, step: 'creating-guild-membership' }));
        await batchCreateTriple([{
          subjectId: aliasTripleVaultId,
          predicateId: BigInt(isMemberOfId),
          objectId: BigInt(guildId),
        }]);
      }

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
    aliasTripleId: state.aliasTripleId,
  };
};

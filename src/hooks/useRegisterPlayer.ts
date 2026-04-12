import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { IdentityCreationState, IdentityCreationStep } from '../types/alias';
import { useAtomCreation } from './useAtomCreation';
import { useBatchCreateTriple } from './useBatchCreateTriple';
import { fetchAccountAtom } from '../api/fetchPlayerAliases';
import { uploadToPinata } from '../utils/pinata';
import { ATOM_CONTRACT_ADDRESS, atomABI } from '../abi';
import { calculateAtomId } from '@0xintuition/sdk';
import { toHex, getAddress, keccak256, toBytes } from 'viem';
import { PREDICATES } from '../utils/constants';

interface UseRegisterPlayerProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  network?: Network;
  guildId?: string;               // hex ID of selected guild atom; if set, creates nested guild triple in step 4
  existingAccountAtomId?: string; // if already known (returning user), skip fetch/create entirely
  existingPseudoAtomId?: string;  // if set, skip pseudo atom creation (reusing existing alias)
  existingAliasTripleId?: string; // if set, skip alias triple + guild triple creation (handled in Phase 2)
  consentAlreadyAccepted?: boolean  // if true, skip signing-consent, creating-consent-atom, creating-accepted-triple
  chainId?: number                   // for the EIP-712 domain
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
  publicClient,
  network,
  guildId,
  existingAccountAtomId,
  existingPseudoAtomId,
  existingAliasTripleId,
  consentAlreadyAccepted,
  chainId,
}: UseRegisterPlayerProps) => {
  const [state, setState] = useState<IdentityCreationState>({ step: 'idle' });
  const queryClient = useQueryClient();

  const { createAtom, createStringAtom, createEthereumAccountAtom, createConsentAtom } = useAtomCreation({ walletConnected, walletAddress, publicClient });
  const { batchCreateTriple, computeTripleId, checkTripleExists } = useBatchCreateTriple({
    walletConnected,
    walletAddress,
    publicClient,
  });

  const register = async (pseudo: string, imageFile?: File) => {
    if (!walletConnected || !walletAddress || !pseudo.trim()) return;

    const predicateId = PREDICATES.HAS_ALIAS;

    try {
      // Step 0 — EIP-712 consent signature (off-chain, free — popup 1)
      let signature = state.signature;
      let consentAtomId = state.consentAtomId;
      let consentMessage: Record<string, string> | undefined;

      if (!consentAlreadyAccepted && !signature) {
        setState(s => ({ ...s, step: 'signing-consent' }));

        const activeChainId = walletConnected?.chain?.id ?? chainId ?? publicClient?.chain?.id ?? 1;
        const domain = { name: 'Player Map', version: '1', chainId: activeChainId };
        const types = {
          TermsAcceptance: [
            { name: 'wallet',       type: 'address' },
            { name: 'termsVersion', type: 'string' },
            { name: 'termsURI',     type: 'string' },
            { name: 'privacyURI',   type: 'string' },
            { name: 'timestamp',    type: 'string' },
            { name: 'statement',    type: 'string' },
          ],
        } as const;

        const message = {
          wallet: walletAddress as `0x${string}`,
          termsVersion: 'v1.0',
          termsURI: 'https://playermap.box/terms-of-service/',
          privacyURI: 'https://playermap.box/privacy-policy/',
          timestamp: new Date().toISOString(),
          statement: 'I confirm that I have read and agree to the Terms of Service and Privacy Policy. I understand that blockchain records are permanent and that I am solely responsible for content I publish through this interface.',
        };

        signature = await walletConnected.signTypedData({
          domain,
          types,
          primaryType: 'TermsAcceptance',
          message,
        });
        consentMessage = message as unknown as Record<string, string>;
        setState(s => ({ ...s, signature, _consentMessage: consentMessage }));
      } else if (state._consentMessage) {
        consentMessage = state._consentMessage;
      }

      // Step 1 — create consent atom on-chain (popup 2 begins here)
      if (!consentAlreadyAccepted && !consentAtomId && consentMessage) {
        setState(s => ({ ...s, step: 'creating-consent-atom' }));
        const messageHash = keccak256(toBytes(JSON.stringify(consentMessage)));
        const consentJson = {
          type: 'terms_acceptance',
          schema_version: '1.0',
          accepted_at: consentMessage.timestamp,
          terms_version: consentMessage.termsVersion,
          terms_uri: consentMessage.termsURI,
          privacy_uri: consentMessage.privacyURI,
          message_hash: messageHash,
          signature,
        };
        const result = await createConsentAtom(consentJson);
        consentAtomId = `0x${result.atomId.toString(16)}`;
        setState(s => ({ ...s, consentAtomId }));
      }

      // Step 1 — pseudo atom (skip if already created on a previous attempt, or if an existing atom is provided)
      let pseudoAtomId = state.pseudoAtomId ?? existingPseudoAtomId;
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
      // Skip if an existing alias triple is provided (reusing alias — triple already on-chain)
      let aliasTripleIdStr = existingAliasTripleId ?? state.aliasTripleId;
      if (!aliasTripleIdStr) {
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
        aliasTripleIdStr = `0x${aliasTripleVaultId.toString(16)}`;
        setState(s => ({ ...s, aliasTripleId: aliasTripleIdStr }));
      }

      // Step — [Account] — [accepted] — [Consent Atom] (skip if consent already accepted)
      if (!consentAlreadyAccepted && consentAtomId) {
        const acceptedPredicateId = PREDICATES.ACCEPTED;
        setState(s => ({ ...s, step: 'creating-accepted-triple' }));

        // Idempotent: check if triple already exists before creating
        const alreadyExists = await checkTripleExists(
          BigInt(accountAtomId),
          BigInt(acceptedPredicateId),
          BigInt(consentAtomId),
        );
        if (!alreadyExists) {
          await batchCreateTriple([{
            subjectId: BigInt(accountAtomId),
            predicateId: BigInt(acceptedPredicateId),
            objectId: BigInt(consentAtomId),
          }]);
        }
      }

      // Step 4 — nested guild triple: [aliasTriple] [IS_MEMBER_OF] [guild] (optional)
      // Skip if existingAliasTripleId is set — guild membership is handled in Phase 2
      if (!existingAliasTripleId && guildId && guildId.trim()) {
        const isMemberOfId = PREDICATES.IS_MEMBER_OF;
        setState(s => ({ ...s, step: 'creating-guild-membership' }));
        await batchCreateTriple([{
          subjectId: BigInt(aliasTripleIdStr),
          predicateId: BigInt(isMemberOfId),
          objectId: BigInt(guildId),
        }]);
      }

      setState(s => ({ ...s, step: 'success' }));
      // Invalidate alias query so the read hooks refresh after registration
      await queryClient.invalidateQueries({ queryKey: ['aliasesByPosition'] });
    } catch (err: any) {
      console.error('[useRegisterPlayer] Registration error:', err);

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
    pseudoAtomId: state.pseudoAtomId ?? existingPseudoAtomId,
    accountAtomId: state.accountAtomId,
    aliasTripleId: state.aliasTripleId ?? existingAliasTripleId,
  };
};

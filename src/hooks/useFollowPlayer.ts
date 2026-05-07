import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Network, API_URLS } from './useAtomData';
import { useBatchCreateTriple } from './useBatchCreateTriple';
import { useRedeemBatch } from './useRedeemBatch';
import { ATOM_CONTRACT_ADDRESS, atomABI } from '../abi';
import { PREDICATES } from '../utils/constants';
import { apiCache } from '../utils/apiCache';

export type FollowState = 'idle' | 'loading' | 'not-following' | 'following';

interface UseFollowPlayerProps {
  walletConnected?: any;
  walletAddress?: string;
  publicClient?: any;
  myAccountAtomId: string | null;
  otherAccountAtomId: string | null;
  network?: Network;
}

interface UseFollowPlayerResult {
  followState: FollowState;
  tripleId: string | null;
  userShares: bigint;
  txLoading: boolean;
  error: string | null;
  follow: () => Promise<void>;
  unfollow: () => Promise<void>;
}

export const useFollowPlayer = ({
  walletConnected,
  walletAddress,
  publicClient,
  myAccountAtomId,
  otherAccountAtomId,
  network = Network.MAINNET,
}: UseFollowPlayerProps): UseFollowPlayerResult => {
  const [followState, setFollowState] = useState<FollowState>('idle');
  const [tripleId, setTripleId] = useState<string | null>(null);
  const [userShares, setUserShares] = useState<bigint>(0n);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { batchCreateTriple } = useBatchCreateTriple({ walletConnected, walletAddress, publicClient });
  const { redeemBatch } = useRedeemBatch({ walletConnected, walletAddress });

  // Check current follow state via GraphQL
  const checkFollowState = useCallback(async () => {
    if (!myAccountAtomId || !otherAccountAtomId || !walletAddress) {
      setFollowState('idle');
      return;
    }
    setFollowState('loading');
    try {
      const apiUrl = API_URLS[network];
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query CheckFollow($subject: String!, $predicate: String!, $object: String!, $wallet: String!) {
              triples(where: {
                subject_id: { _eq: $subject },
                predicate_id: { _eq: $predicate },
                object_id: { _eq: $object }
              }, limit: 1) {
                term_id
                positions(where: { account_id: { _ilike: $wallet }, shares: { _gt: "0" } }) {
                  shares
                }
              }
            }
          `,
          variables: {
            subject: myAccountAtomId,
            predicate: PREDICATES.FOLLOWS,
            object: otherAccountAtomId,
            wallet: walletAddress.toLowerCase(),
          },
        }),
      });

      const data = await response.json();
      const triples = data.data?.triples || [];

      if (triples.length === 0) {
        setTripleId(null);
        setUserShares(0n);
        setFollowState('not-following');
      } else {
        const triple = triples[0];
        setTripleId(triple.term_id);
        const positions = triple.positions || [];
        if (positions.length > 0) {
          setUserShares(BigInt(positions[0].shares));
          setFollowState('following');
        } else {
          setUserShares(0n);
          setFollowState('not-following');
        }
      }
    } catch (err) {
      console.error('[useFollowPlayer] checkFollowState error:', err);
      setFollowState('not-following');
    }
  }, [myAccountAtomId, otherAccountAtomId, walletAddress, network]);

  useEffect(() => { checkFollowState(); }, [checkFollowState]);

  const follow = async () => {
    if (!myAccountAtomId || !otherAccountAtomId || !walletAddress || !walletConnected) return;
    setTxLoading(true);
    setError(null);
    try {
      if (!tripleId) {
        // Triple doesn't exist — create it (includes initial deposit)
        await batchCreateTriple([{
          subjectId: BigInt(myAccountAtomId),
          predicateId: BigInt(PREDICATES.FOLLOWS),
          objectId: BigInt(otherAccountAtomId),
        }]);
      } else {
        // Triple exists — deposit into it
        const depositAmount = BigInt(import.meta.env.VITE_VALUE_PER_TRIPLE || '10000000000000000');
        await walletConnected.writeContract({
          address: ATOM_CONTRACT_ADDRESS,
          abi: atomABI,
          functionName: 'depositBatch',
          args: [
            walletAddress as `0x${string}`,
            [tripleId as `0x${string}`],
            [1n],
            [depositAmount],
            [0n],
          ],
          value: depositAmount,
          gas: 500000n,
        });
      }
      apiCache.clear();
      await queryClient.invalidateQueries({ queryKey: ['positions'] });
      // Re-check state to get new tripleId + shares
      await checkFollowState();
    } catch (err: any) {
      console.error('[useFollowPlayer] follow error:', err);
      const isRejected =
        err?.name === 'UserRejectedRequestError' ||
        (err?.message ?? '').toLowerCase().includes('user rejected');
      setError(isRejected ? 'User rejected the request.' : (err?.shortMessage ?? err?.message ?? String(err)));
    } finally {
      setTxLoading(false);
    }
  };

  const unfollow = async () => {
    if (!tripleId || !walletAddress || !walletConnected || userShares === 0n) return;
    setTxLoading(true);
    setError(null);
    try {
      await redeemBatch({
        receiver: walletAddress as `0x${string}`,
        termIds: [tripleId as `0x${string}`],
        curveIds: [1n],
        shares: [userShares],
        minAssets: [0n],
      });
      apiCache.clear();
      await queryClient.invalidateQueries({ queryKey: ['positions'] });
      await checkFollowState();
    } catch (err: any) {
      console.error('[useFollowPlayer] unfollow error:', err);
      const isRejected =
        err?.name === 'UserRejectedRequestError' ||
        (err?.message ?? '').toLowerCase().includes('user rejected');
      setError(isRejected ? 'User rejected the request.' : (err?.shortMessage ?? err?.message ?? String(err)));
    } finally {
      setTxLoading(false);
    }
  };

  return { followState, tripleId, userShares, txLoading, error, follow, unfollow };
};

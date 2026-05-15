import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network, API_URLS } from './useAtomData';
import { usePositions } from './usePositions';
import { fetchAtomDetails } from '../api/fetchAtomDetails';
import { fetchTriplesByTermIds } from '../api/fetchTriplesByTermIds';
import { PREDICATES, ATOMS } from '../utils/constants';

interface OtherPlayerProfile {
  atomDetails: { term_id: string; label: string; image: string } | null;
  walletAddress: string | null;
  positions: any[];
  activities: any[];
  connections: { followingCount: number; followersCount: number };
  loading: boolean;
  error: string | null;
}

// Triple structure: (I, follow, accountAtomId)
// following = positions held by player's wallet in (I, follow, *) triples
// followers = positions by anyone in (I, follow, playerAccountAtomId) triple
const fetchFollowCounts = async (
  accountAtomId: string,
  walletAddress: string | null,
  network: Network
) => {
  const apiUrl = API_URLS[network];
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query FollowCounts($iAtom: String!, $predicate: String!, $objectId: String!, $wallet: String!) {
          followers: positions_aggregate(where: {
            shares: { _gt: "0" }
            vault: { term: { triple: {
              subject_id: { _eq: $iAtom }
              predicate_id: { _eq: $predicate }
              object_id: { _eq: $objectId }
            }}}
          }) {
            aggregate { count }
          }
          following: positions_aggregate(where: {
            account_id: { _ilike: $wallet }
            shares: { _gt: "0" }
            vault: { term: { triple: {
              subject_id: { _eq: $iAtom }
              predicate_id: { _eq: $predicate }
            }}}
          }) {
            aggregate { count }
          }
        }
      `,
      variables: {
        iAtom: ATOMS.I,
        predicate: PREDICATES.FOLLOWS,
        objectId: accountAtomId,
        wallet: walletAddress?.toLowerCase() ?? '',
      },
    }),
  });
  const data = await res.json();
  return {
    followingCount: data.data?.following?.aggregate?.count ?? 0,
    followersCount: data.data?.followers?.aggregate?.count ?? 0,
  };
};

export const useOtherPlayerProfile = (
  accountAtomId: string | null,
  pseudoLabel: string,
  pseudoImage: string,
  network: Network = Network.MAINNET
): OtherPlayerProfile => {
  const { data: accountAtom, isLoading: atomLoading } = useQuery({
    queryKey: ['otherPlayerAccountAtom', accountAtomId, network],
    queryFn: () => fetchAtomDetails(accountAtomId!, network),
    enabled: Boolean(accountAtomId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const walletAddress = accountAtom?.creator_id ?? null;

  const atomDetails = useMemo(() => {
    if (!accountAtomId) return null;
    return {
      term_id: accountAtomId,
      label: pseudoLabel,
      image: pseudoImage,
    };
  }, [accountAtomId, pseudoLabel, pseudoImage]);

  const { data: followCounts } = useQuery({
    queryKey: ['otherPlayerFollowCounts', accountAtomId, walletAddress, network],
    queryFn: () => fetchFollowCounts(accountAtomId!, walletAddress, network),
    enabled: Boolean(accountAtomId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const connections = useMemo(() => ({
    followingCount: followCounts?.followingCount ?? 0,
    followersCount: followCounts?.followersCount ?? 0,
  }), [followCounts]);

  const { positions, loading: positionsLoading, error: positionsError } = usePositions(
    walletAddress ?? undefined,
    network
  );

  const inSubjectIds = useMemo(() => {
    return positions
      .filter(p => p.term?.triple?.predicate_id === PREDICATES.IN)
      .map(p => p.term.triple.subject_id as string)
      .filter(Boolean);
  }, [positions]);

  const { data: qualityTriples } = useQuery({
    queryKey: ['otherPlayerQualityTriples', inSubjectIds, network],
    queryFn: () => fetchTriplesByTermIds(inSubjectIds, network),
    enabled: inSubjectIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const qualityBySubjectIdRaw = useMemo(() => {
    const map = new Map<string, { term_id: string; label: string; image?: string }>();
    for (const t of qualityTriples ?? []) {
      if (t.object) map.set(t.term_id, t.object);
    }
    return map;
  }, [qualityTriples]);

  // Stable ref — never resets to empty while a previous non-empty map exists.
  // Prevents IN-predicate claims from briefly losing their quality object during refetch.
  const stableQualityRef = useRef(qualityBySubjectIdRaw);
  if (qualityBySubjectIdRaw.size > 0) stableQualityRef.current = qualityBySubjectIdRaw;
  const qualityBySubjectId = stableQualityRef.current;

  const activities = useMemo(() => {
    const relevantPredicates = new Set([
      PREDICATES.IS_PLAYER_OF,
      PREDICATES.IS_MEMBER_OF,
      PREDICATES.IS,
      PREDICATES.IN,
    ]);
    const seen = new Set<string>();
    return positions
      .filter(p => {
        const triple = p.term?.triple;
        if (!triple || !relevantPredicates.has(triple.predicate_id)) return false;
        if (triple.predicate_id === PREDICATES.IS && accountAtomId) {
          return triple.subject_id === accountAtomId;
        }
        return true;
      })
      .filter(p => {
        const termId = p.term.triple.term_id;
        if (seen.has(termId)) return false;
        seen.add(termId);
        return true;
      })
      .map(p => {
        const triple = p.term.triple;
        if (triple.predicate_id === PREDICATES.IN) {
          const qualityObject = qualityBySubjectId.get(triple.subject_id) ?? null;
          return {
            term_id: triple.term_id,
            predicate_id: PREDICATES.IS,
            object_id: qualityObject?.term_id ?? triple.subject_id,
            object: qualityObject,
            term: p.term,
            counter_term: triple.counter_term,
            context_game_id: triple.object_id,
          };
        }
        return {
          term_id: triple.term_id,
          predicate_id: triple.predicate_id,
          object_id: triple.object_id,
          object: triple.object,
          term: p.term,
          counter_term: triple.counter_term,
        };
      })
      .filter(a => a.object != null);
  }, [positions, qualityBySubjectId, accountAtomId]);

  return {
    atomDetails,
    walletAddress,
    positions,
    activities,
    connections,
    loading: atomLoading || positionsLoading,
    error: positionsError ? (positionsError as Error).message : null,
  };
};

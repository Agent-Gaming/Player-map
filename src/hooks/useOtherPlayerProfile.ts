import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { usePositions } from './usePositions';
import { fetchAtomDetails } from '../api/fetchAtomDetails';
import { fetchTriplesByTermIds } from '../api/fetchTriplesByTermIds';
import { PREDICATES } from '../utils/constants';

interface OtherPlayerProfile {
  atomDetails: { term_id: string; label: string; image: string } | null;
  walletAddress: string | null;
  positions: any[];
  activities: any[];
  loading: boolean;
  error: string | null;
}

export const useOtherPlayerProfile = (
  accountAtomId: string | null,
  pseudoLabel: string,
  pseudoImage: string,
  network: Network = Network.MAINNET
): OtherPlayerProfile => {
  // Fetch account atom to get the wallet address (creator_id)
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

  const { positions, loading: positionsLoading, error: positionsError } = usePositions(
    walletAddress ?? undefined,
    network
  );

  // Resolve IS triples nested in IN positions (same logic as useSidebarData)
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

  const qualityBySubjectId = useMemo(() => {
    const map = new Map<string, { term_id: string; label: string; image?: string }>();
    for (const t of qualityTriples ?? []) {
      if (t.object) map.set(t.term_id, t.object);
    }
    return map;
  }, [qualityTriples]);

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
    loading: atomLoading || positionsLoading,
    error: positionsError ? (positionsError as Error).message : null,
  };
};

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { fetchTriplesForAgent, fetchFollowsAndFollowers } from '../api/sidebarQueries';
import { usePlayerAliases } from './usePlayerAliases';
import { usePositions } from './usePositions';
import { fetchTriplesByTermIds } from '../api/fetchTriplesByTermIds';
import { DefaultPlayerMapConstants } from '../types/PlayerMapConfig';

interface SidebarData {
  atomDetails: any | null;
  triples: any[];
  positions: any[];
  activities: any[];
  connections: {
    follows: any[];
    followers: any[];
  };
  loading: boolean;
  error: string | null;
}

export const useSidebarData = (
  walletAddress: string | undefined,
  network: Network = Network.MAINNET,
  constants: DefaultPlayerMapConstants
): SidebarData => {
  const [triples, setTriples] = useState<any[]>([]);
  const [connections, setConnections] = useState<{ follows: any[]; followers: any[] }>({
    follows: [],
    followers: []
  });

  const { COMMON_IDS } = constants;

  // Récupère les alias du joueur — le primary alias donne le pseudo + image
  // playerAtomId est le term_id de l'account atom (sujet du triple has alias)
  const { aliases, playerAtomId, isLoading: aliasesLoading } = usePlayerAliases({
    walletAddress,
    constants,
    network,
  });

  // atomDetails construit depuis le primary alias :
  // - term_id = playerAtomId (account atom)
  // - label   = pseudo de l'alias primaire
  // - image   = image de l'alias primaire
  const atomDetails = useMemo(() => {
    if (!playerAtomId) return null;
    const primary = aliases.find(a => a.isPrimary) ?? aliases[0] ?? null;
    let pseudoLabel = primary?.pseudo ?? '';
    try { pseudoLabel = JSON.parse(pseudoLabel).name || pseudoLabel; } catch { /* use raw */ }
    return {
      term_id: playerAtomId,
      label: pseudoLabel,
      image: primary?.image ?? '',
    };
  }, [playerAtomId, aliases]);

  const { positions, loading: positionsLoading, error: positionsError } = usePositions(
    walletAddress,
    network
  );

  // Collect subject_ids of IN-predicate positions to resolve their quality atoms
  const inSubjectIds = useMemo(() => {
    return positions
      .filter(p => p.term?.triple?.predicate_id === COMMON_IDS.IN)
      .map(p => p.term.triple.subject_id as string)
      .filter(Boolean);
  }, [positions, COMMON_IDS.IN]);

  const { data: qualityTriples } = useQuery({
    queryKey: ['triplesByTermIds', inSubjectIds, network],
    queryFn: () => fetchTriplesByTermIds(inSubjectIds, network),
    enabled: inSubjectIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Map: subject_id (IS triple term_id) → quality atom { label, image }
  const qualityBySubjectId = useMemo(() => {
    const map = new Map<string, { term_id: string; label: string; image?: string }>();
    for (const t of qualityTriples ?? []) {
      if (t.object) map.set(t.term_id, t.object);
    }
    return map;
  }, [qualityTriples]);

  // Derive attestation activities from positions:
  // - IS_PLAYER_OF → games
  // - IS_MEMBER_OF → guilds (nested triple subject)
  // - IS → player qualities (direct)
  // - IN  → player qualities nested in context: [[X][IS][quality]] [IN] [bossfighters]
  //         resolved via second fetch of the IS triple
  const activities = useMemo(() => {
    const relevantPredicates = new Set([
      COMMON_IDS.IS_PLAYER_OF,
      COMMON_IDS.IS_MEMBER_OF,
      COMMON_IDS.IS,
      COMMON_IDS.IN,
    ]);
    const seen = new Set<string>();
    return positions
      .filter(p => {
        const triple = p.term?.triple;
        if (!triple || !relevantPredicates.has(triple.predicate_id)) return false;
        // For IS predicate, only include triples where the user's account atom is the subject
        // (own quality attestations), not triples from voting on other players' qualities
        if (triple.predicate_id === COMMON_IDS.IS && playerAtomId) {
          return triple.subject_id === playerAtomId;
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

        // Nested quality: [[X][IS][quality]] [IN] [context]
        // Resolve quality atom from the fetched IS triple
        if (triple.predicate_id === COMMON_IDS.IN) {
          const qualityObject = qualityBySubjectId.get(triple.subject_id) ?? null;
          return {
            term_id: triple.term_id,
            predicate_id: COMMON_IDS.IS,
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
  }, [positions, COMMON_IDS, qualityBySubjectId, playerAtomId]);

  const { data: triplesData } = useQuery({
    queryKey: ['triplesForAgent', walletAddress, network],
    queryFn: () => fetchTriplesForAgent(walletAddress!, network),
    enabled: Boolean(walletAddress),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: connectionsData } = useQuery({
    queryKey: ['followsAndFollowers', COMMON_IDS.FOLLOWS, walletAddress, network],
    queryFn: () => fetchFollowsAndFollowers(COMMON_IDS.FOLLOWS, walletAddress!, network),
    enabled: Boolean(walletAddress),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (triplesData) setTriples(triplesData);
  }, [triplesData]);

  useEffect(() => {
    if (connectionsData) setConnections(connectionsData);
  }, [connectionsData]);

  const combinedLoading = aliasesLoading || positionsLoading;
  const combinedError = positionsError;

  return {
    atomDetails,
    triples,
    positions,
    activities,
    connections,
    loading: combinedLoading,
    error: combinedError ? (typeof combinedError === 'string' ? combinedError : combinedError.message) : null
  };
};

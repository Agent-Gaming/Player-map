import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { fetchTriplesForAgent, fetchFollowsAndFollowers } from '../api/sidebarQueries';
import { usePlayerAliases } from './usePlayerAliases';
import { usePositions } from './usePositions';
import { fetchTriplesByTermIds } from '../api/fetchTriplesByTermIds';
import { PREDICATES } from '../utils/constants';

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
  network: Network = Network.MAINNET
): SidebarData => {
  const [triples, setTriples] = useState<any[]>([]);
  const [connections, setConnections] = useState<{ follows: any[]; followers: any[] }>({
    follows: [],
    followers: []
  });

  // Récupère les alias du joueur — le primary alias donne le pseudo + image
  // playerAtomId est le term_id de l'account atom (sujet du triple has alias)
  const { aliases, playerAtomId, isLoading: aliasesLoading } = usePlayerAliases({
    walletAddress,
    network,
  });

  // atomDetails construit depuis le primary alias :
  // - term_id = playerAtomId (account atom)
  // - label   = pseudo de l'alias primaire
  // - image   = image de l'alias primaire
  const atomDetails = useMemo(() => {
    console.log('[DIAG][useSidebarData] walletAddress:', walletAddress);
    console.log('[DIAG][useSidebarData] aliasesLoading:', aliasesLoading);
    console.log('[DIAG][useSidebarData] playerAtomId:', playerAtomId);
    console.log('[DIAG][useSidebarData] aliases count:', aliases.length, aliases);
    if (!playerAtomId) {
      console.warn('[DIAG][useSidebarData] ⚠️ playerAtomId is null — HAS_ALIAS triple not found for this wallet');
      return null;
    }
    const primary = aliases.find(a => a.isPrimary) ?? aliases[0] ?? null;
    let pseudoLabel = primary?.pseudo ?? '';
    try { pseudoLabel = JSON.parse(pseudoLabel).name || pseudoLabel; } catch { /* use raw */ }
    const result = {
      term_id: playerAtomId,
      label: pseudoLabel,
      image: primary?.image ?? '',
    };
    console.log('[DIAG][useSidebarData] atomDetails resolved:', result);
    return result;
  }, [playerAtomId, aliases, walletAddress, aliasesLoading]);

  const { positions, loading: positionsLoading, error: positionsError } = usePositions(
    walletAddress,
    network
  );

  // Collect subject_ids of IN-predicate positions to resolve their quality atoms
  const inSubjectIds = useMemo(() => {
    return positions
      .filter(p => p.term?.triple?.predicate_id === PREDICATES.IN)
      .map(p => p.term.triple.subject_id as string)
      .filter(Boolean);
  }, [positions, PREDICATES.IN]);

  const { data: qualityTriples } = useQuery({
    queryKey: ['triplesByTermIds', inSubjectIds, network],
    queryFn: () => fetchTriplesByTermIds(inSubjectIds, network),
    enabled: inSubjectIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Map: IS_triple_term_id → quality atom { label, image }
  // Map: IS_triple_term_id → subject_id (player atom) — for IN-predicate ownership check
  const qualityBySubjectIdRaw = useMemo(() => {
    const map = new Map<string, { term_id: string; label: string; image?: string }>();
    for (const t of qualityTriples ?? []) {
      if (t.object) map.set(t.term_id, t.object);
    }
    return map;
  }, [qualityTriples]);

  const qualityOwnerByTermId = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of qualityTriples ?? []) {
      if (t.subject_id) map.set(t.term_id, t.subject_id);
    }
    return map;
  }, [qualityTriples]);

  const stableQualityRef = useRef(qualityBySubjectIdRaw);
  if (qualityBySubjectIdRaw.size > 0) stableQualityRef.current = qualityBySubjectIdRaw;
  const qualityBySubjectId = stableQualityRef.current;

  // Derive attestation activities from positions:
  // - IS_PLAYER_OF → games
  // - IS_MEMBER_OF → guilds (nested triple subject)
  // - IS → player qualities (direct)
  // - IN  → player qualities nested in context: [[X][IS][quality]] [IN] [bossfighters]
  //         resolved via second fetch of the IS triple
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
        // For IS predicate, only include triples where the user's account atom is the subject
        // (own quality attestations), not triples from voting on other players' qualities
        if (triple.predicate_id === PREDICATES.IS && playerAtomId) {
          return triple.subject_id === playerAtomId;
        }
        // IS_PLAYER_OF and IS_MEMBER_OF: nested triple pattern.
        // Inner subject (player atom) must match current user.
        if (
          (triple.predicate_id === PREDICATES.IS_PLAYER_OF ||
            triple.predicate_id === PREDICATES.IS_MEMBER_OF) &&
          playerAtomId
        ) {
          const innerSubjectId = triple._innerTriple?.subject?.term_id;
          return innerSubjectId === playerAtomId;
        }
        // IN predicate: [[playerAtom, IS, quality], IN, context].
        // Verify the IS triple's subject is the current user.
        if (triple.predicate_id === PREDICATES.IN && playerAtomId) {
          const isTripleSubject = qualityOwnerByTermId.get(triple.subject_id);
          if (isTripleSubject) return isTripleSubject === playerAtomId;
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
  }, [positions, qualityBySubjectId, qualityOwnerByTermId, playerAtomId]);

  const { data: triplesData } = useQuery({
    queryKey: ['triplesForAgent', walletAddress, network],
    queryFn: () => fetchTriplesForAgent(walletAddress!, network),
    enabled: Boolean(walletAddress),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: connectionsData } = useQuery({
    queryKey: ['followsAndFollowers', PREDICATES.FOLLOWS, walletAddress, playerAtomId, network],
    queryFn: () => fetchFollowsAndFollowers(PREDICATES.FOLLOWS, walletAddress!, network, playerAtomId ?? undefined),
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

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { fetchTriplesForAgent, fetchFollowsAndFollowers } from '../api/sidebarQueries';
import { usePlayerAliases } from './usePlayerAliases';
import { usePositions } from './usePositions';
import { useClaimsBySubject } from './useClaimsBySubject';
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
  // - term_id = playerAtomId (account atom, utilisé pour useClaimsBySubject)
  // - label   = pseudo de l'alias primaire
  // - image   = image de l'alias primaire
  const atomDetails = useMemo(() => {
    if (!playerAtomId) return null;
    const primary = aliases.find(a => a.isPrimary) ?? aliases[0] ?? null;
    return {
      term_id: playerAtomId,
      label: primary?.pseudo ?? '',
      image: primary?.image ?? '',
    };
  }, [playerAtomId, aliases]);

  const { positions, loading: positionsLoading, error: positionsError } = usePositions(
    walletAddress,
    network
  );

  const { claims: activities, loading: claimsLoading, error: claimsError } = useClaimsBySubject(
    atomDetails?.term_id,
    network
  );

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

  const combinedLoading = aliasesLoading || positionsLoading || claimsLoading;
  const combinedError = positionsError || claimsError;

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

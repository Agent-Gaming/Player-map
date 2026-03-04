import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network } from './useAtomData';
import { fetchTriplesForAgent, fetchFollowsAndFollowers } from '../api/sidebarQueries';
import { useTripleByCreator } from './useTripleByCreator';
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
  const [error, setError] = useState<string | null>(null);

  // Utiliser les constantes passées en paramètre
  const { COMMON_IDS } = constants;

  // Utiliser useTripleByCreator pour récupérer les triples du joueur
  const { triples: playerTriples, loading: triplesLoading, error: triplesError } = useTripleByCreator(
    walletAddress || '',
    constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId,
    constants.PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId,
    network
  );

  // L'atom du joueur est le sujet du premier triple trouvé
  const atomDetails = playerTriples.length > 0 ? playerTriples[0].subject : null;

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
    if (triplesData) {
      setTriples(triplesData);
    }
  }, [triplesData]);

  useEffect(() => {
    if (connectionsData) {
      setConnections(connectionsData);
    }
  }, [connectionsData]);

  // Agréger les erreurs
  const combinedError = triplesError || positionsError || claimsError || error;
  const combinedLoading = triplesLoading || positionsLoading || claimsLoading;

  console.log("useSidebarData - positions loaded:", {
    count: positions.length,
    loading: positionsLoading,
    error: positionsError,
    walletAddress,
    firstPosition: positions[0]
  });

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

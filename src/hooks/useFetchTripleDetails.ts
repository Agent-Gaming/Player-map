import { useQuery } from "@tanstack/react-query";
import { Network, API_URLS } from "./useAtomData";
import { convertIpfsUrlsInObject } from "../utils/ipfsUtils";

// Interface for triple details returned from GraphQL v2
export interface TripleDetails {
  id: string;
  subject?: {
    term_id: string;
    label: string;
    image?: string;
  };
  predicate?: {
    term_id: string;
    label: string;
  };
  object?: {
    term_id: string;
    label: string;
  };
  term_id?: string;
  term_position_count?: number;
  counter_term_id?: string;
  counter_term_position_count?: number;
}

interface UseFetchTripleDetailsProps {
  network?: Network;
  onError?: (message: string) => void;
}

const fetchTripleDetailsUnified = async (
  tripleId: string,
  network: Network
): Promise<TripleDetails | null> => {
  try {
    const apiUrl = API_URLS[network];
    
    // ✅ 1 SEULE REQUÊTE avec toutes les relations Hasura
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query Triple($tripleId: String!) {
            triple(term_id: $tripleId) {
              term_id
              subject_id
              predicate_id
              object_id
              counter_term_id
              subject {
                term_id
                label
                image
              }
              predicate {
                term_id
                label
              }
              object {
                term_id
                label
              }
              term {
                id
                total_market_cap
                total_assets
                positions_aggregate(where: { shares: { _gt: 0 } }) {
                  aggregate {
                    count
                  }
                }
              }
              counter_term {
                id
                total_market_cap
                total_assets
                positions_aggregate(where: { shares: { _gt: 0 } }) {
                  aggregate {
                    count
                  }
                }
              }
            }
          }
        `,
        variables: { tripleId: tripleId.toString() },
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    if (!result.data?.triple) {
      return null;
    }

    const triple = result.data.triple;
    
    // Convertir les URLs IPFS en HTTP pour les images
    const enrichedTriple = convertIpfsUrlsInObject(triple);

    return {
      id: String(tripleId),
      subject: enrichedTriple.subject || { term_id: enrichedTriple.subject_id, label: '' },
      predicate: enrichedTriple.predicate || { term_id: enrichedTriple.predicate_id, label: '' },
      object: enrichedTriple.object || { term_id: enrichedTriple.object_id, label: '' },
      term_id: enrichedTriple.term_id,
      counter_term_id: enrichedTriple.counter_term_id,
      term_position_count: enrichedTriple.term?.positions_aggregate?.aggregate?.count || 0,
      counter_term_position_count: enrichedTriple.counter_term?.positions_aggregate?.aggregate?.count || 0
    };
  } catch (error) {
    console.error(`Error fetching details for triple ${tripleId}:`, error);
    throw error;
  }
};

// ✅ Hook React Query pour cache et déduplication
export const useFetchTripleDetails = ({
  network = Network.MAINNET,
  onError
}: UseFetchTripleDetailsProps = {}) => {
  
  // Fonction wrappée pour utiliser avec React Query
  const fetchTripleDetails = async (tripleId: string): Promise<TripleDetails | null> => {
    try {
      return await fetchTripleDetailsUnified(tripleId, network);
    } catch (error) {
      if (onError) {
        onError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      return null;
    }
  };

  return {
    fetchTripleDetails,
    isLoading: false // Compatibilité avec l'ancienne API
  };
};

// ✅ Hook React Query direct (optionnel, pour usage avec cache automatique)
export const useTripleDetails = (
  tripleId: string | undefined,
  network: Network = Network.MAINNET
) => {
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['tripleDetails', tripleId, network],
    queryFn: () => fetchTripleDetailsUnified(tripleId!, network),
    enabled: Boolean(tripleId),
    staleTime: 2 * 60 * 1000, // Cache 2 minutes
    gcTime: 5 * 60 * 1000,    // Garde en mémoire 5 minutes
    retry: 1,
  });

  return {
    tripleDetails: data || null,
    loading: isLoading,
    error: isError ? (error as Error) : null,
  };
};
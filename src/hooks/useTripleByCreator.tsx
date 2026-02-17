import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Network, API_URLS } from "./useAtomData";
import { DefaultPlayerMapConstants } from "../types/PlayerMapConfig";
import { apiCache } from "../utils/apiCache";
import { convertIpfsUrlsInObject } from "../utils/ipfsUtils";

export interface Triple {
  term_id: string; // ← Changé de 'id' à 'term_id'
  subject_id: string;
  predicate_id: string;
  object_id: string;
  subject: {
    term_id: string; // ← Changé de 'id' à 'term_id'
    label: string;
    type: string;
    creator_id: string;
    image?: string;
    value?: {
      person?: {
        description: string;
      };
      organization?: {
        description: string;
      };
      thing?: {
        description: string;
      };
      book?: {
        description: string;
      };
    };
  };
  predicate: {
    term_id: string; // ← Changé de 'id' à 'term_id'
    label: string;
    type: string;
  };
  object: {
    term_id: string; // ← Changé de 'id' à 'term_id'
    label: string;
    type: string;
  };
  block_number: number;
  created_at: string; // ← Changé de 'block_timestamp' à 'created_at'
  transaction_hash: string;
}

export interface TriplesByCreatorResponse {
  triples: Triple[];
}

export const fetchTriplesByCreator = async (
  creatorId: string,
  predicateId: string,
  objectId: string,
  network: Network = Network.MAINNET
): Promise<TriplesByCreatorResponse> => {
  const cacheKey = `triples_by_creator_${creatorId}_${predicateId}_${objectId}_${network}`;
  
  return apiCache.withCache(
    cacheKey,
    { creatorId, predicateId, objectId, network },
    async () => {
      const url = API_URLS[network];

      try {
        const triplesQuery = `
          query GetTriplesByCreator($creatorId: String!, $predicateId: String!, $objectId: String!) {
            triples(where: {
              subject: { creator_id: { _eq: $creatorId } },
              predicate_id: { _eq: $predicateId },
              object_id: { _eq: $objectId }
            }) {
              term_id
              subject_id
              predicate_id
              object_id
              block_number
              created_at
              transaction_hash
              subject {
                term_id
                label
                type
                creator_id
                image
                value {
                  person {
                    description
                  }
                  organization {
                    description
                  }
                  thing {
                    description
                  }
                  book {
                    description
                  }
                }
              }
              predicate {
                term_id
                label
                type
              }
              object {
                term_id
                label
                type
              }
            }
          }
        `;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: triplesQuery,
            variables: {
              creatorId,
              predicateId,
              objectId,
            },
          }),
        });

        const result = await response.json();

        if (result.errors) {
          console.error(
            `[fetchTriplesByCreator] Erreurs GraphQL:`,
            result.errors
          );
          throw new Error(
            result.errors[0]?.message || "Erreur GraphQL inconnue"
          );
        }

        const triples = result.data?.triples || [];

        // Convertir les URLs IPFS en HTTP pour les images
        const enrichedTriples: Triple[] = convertIpfsUrlsInObject(triples);

        return { triples: enrichedTriples };
      } catch (error) {
        console.error(
          `[fetchTriplesByCreator] Erreur lors de la requête vers ${url}:`,
          error
        );
        throw error;
      }
    },
    3 * 60 * 1000 // TTL de 3 minutes
  );
};

// Hook pour récupérer les triples avec des conditions spécifiques
export const useTripleByCreator = (
  creatorId: string,
  predicateId?: string,
  objectId?: string,
  network: Network = Network.MAINNET,
  constants?: DefaultPlayerMapConstants // Constantes optionnelles
) => {
  // Utiliser les constantes passées en paramètre ou les valeurs par défaut
  const { PLAYER_TRIPLE_TYPES } = constants || {
    PLAYER_TRIPLE_TYPES: { PLAYER_GAME: { predicateId: "", objectId: "" } },
  };

  // Utiliser les valeurs par défaut si non fournies
  const finalPredicateId =
    predicateId || PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId;
  const finalObjectId = objectId || PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId;

  // Avantage: déduplication automatique des requêtes simultanées
  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['triplesByCreator', creatorId, finalPredicateId, finalObjectId, network],
    queryFn: () => fetchTriplesByCreator(creatorId, finalPredicateId, finalObjectId, network),
    enabled: Boolean(creatorId), // Ne fetch que si creatorId existe
    staleTime: 2 * 60 * 1000, // Cache 2 minutes (même TTL que apiCache)
    gcTime: 5 * 60 * 1000,    // Garde en mémoire 5 minutes
    retry: 1,
  });

  const triples = data?.triples || [];

  return {
    loading: isLoading,
    error: isError ? (error as Error) : null,
    triples,
    network,
    rawData: data,
  };
};

export default useTripleByCreator;

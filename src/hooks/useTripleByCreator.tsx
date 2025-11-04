import { useState, useEffect } from "react";
import { Network, API_URLS } from "./useAtomData";
import { DefaultPlayerMapConstants } from "../types/PlayerMapConfig";

export interface Triple {
  term_id: string;  // ← Changé de 'id' à 'term_id'
  subject_id: string;
  predicate_id: string;
  object_id: string;
  subject: {
    term_id: string;  // ← Changé de 'id' à 'term_id'
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
    term_id: string;  // ← Changé de 'id' à 'term_id'
    label: string;
    type: string;
  };
  object: {
    term_id: string;  // ← Changé de 'id' à 'term_id'
    label: string;
    type: string;
  };
  block_number: number;
  created_at: string;  // ← Changé de 'block_timestamp' à 'created_at'
  transaction_hash: string;
}

export interface TriplesByCreatorResponse {
  triples: Triple[];
}

// Fonction qui récupère les triples où le sujet a été créé par une adresse spécifique
// et avec un prédicat et un objet spécifiques
export const fetchTriplesByCreator = async (
  creatorId: string,
  predicateId: string,
  objectId: string,
  network: Network = Network.MAINNET
): Promise<TriplesByCreatorResponse> => {
  const url = API_URLS[network];
  
  // Construire la condition where pour filtrer par creator_id, predicate_id et object_id
  const variables = {
    where: {
      subject: { 
        creator_id: { "_eq": creatorId }
      },
      predicate_id: { 
        "_eq": predicateId
      },
      object_id: { 
        "_eq": objectId
      }
    }
  };

  // Remplacer la requête GraphQL par celle qui fonctionne :
  const query = `
    query GetTriples($where: triples_bool_exp) {
      triples(where: $where) {
        term_id
        subject_id
        predicate_id
        object_id
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
        block_number
        created_at
        transaction_hash
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,  // ← Utiliser la requête directe
        variables,
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error(`la Erreurs GraphQL:`, result.errors);
      throw new Error(result.errors[0]?.message || "Erreur GraphQL inconnue");
    }

    return result.data as TriplesByCreatorResponse;
  } catch (error) {
    console.error(
      `[fetchTriplesByCreator] Erreur lors de la requête directe vers ${url}:`,
      error
    );
    throw error;
  }
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
  const { PLAYER_TRIPLE_TYPES } = constants || { PLAYER_TRIPLE_TYPES: { PLAYER_GAME: { predicateId: "", objectId: "" } } };
  
  // Utiliser les valeurs par défaut si non fournies
  const finalPredicateId = predicateId || PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId;
  const finalObjectId = objectId || PLAYER_TRIPLE_TYPES.PLAYER_GAME.objectId;
  const [data, setData] = useState<TriplesByCreatorResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!creatorId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetchTriplesByCreator(
          creatorId,
          finalPredicateId,
          finalObjectId,
          network
        );
        setData(response);
      } catch (err) {
        console.error(
          `[${network}] Erreur lors de la récupération des triples:`,
          err
        );
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [creatorId, predicateId, objectId, network]);

  const triples = data?.triples || [];

  return {
    loading,
    error,
    triples,
    network,
    rawData: data,
  };
};

export default useTripleByCreator;

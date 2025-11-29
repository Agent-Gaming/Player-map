import { useState, useEffect } from "react";
import { Network, API_URLS } from "./useAtomData";
import { DefaultPlayerMapConstants } from "../types/PlayerMapConfig";

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

// Fonction qui récupère les triples où le sujet a été créé par une adresse spécifique
// et avec un prédicat et un objet spécifiques
// Solution en 2 étapes : récupérer d'abord les atoms par creator_id, puis utiliser leurs term_id comme subject_id
export const fetchTriplesByCreator = async (
  creatorId: string,
  predicateId: string,
  objectId: string,
  network: Network = Network.MAINNET
): Promise<TriplesByCreatorResponse> => {
  const url = API_URLS[network];

  try {
    // Étape 1: Récupérer les atoms créés par cette adresse avec tous leurs détails
    const atomsQuery = `
      query GetAtoms($creatorId: String!) {
        atoms(where: { creator_id: { _eq: $creatorId } }) {
          term_id
          label
          type
          creator_id
          image
        }
      }
    `;

    const atomsResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: atomsQuery,
        variables: { creatorId },
      }),
    });

    const atomsResult = await atomsResponse.json();

    if (atomsResult.errors) {
      console.error(
        `[fetchTriplesByCreator] Erreurs lors de la récupération des atoms:`,
        atomsResult.errors
      );
      throw new Error(
        atomsResult.errors[0]?.message ||
          "Erreur GraphQL lors de la récupération des atoms"
      );
    }

    // Extraire les term_ids des atoms et créer un map pour les détails
    const atoms = atomsResult.data?.atoms || [];
    const subjectIds = atoms.map((atom: { term_id: string }) => atom.term_id);
    const atomsMap = new Map(atoms.map((atom: any) => [atom.term_id, atom]));

    // Si aucun atom trouvé, retourner un tableau vide
    if (subjectIds.length === 0) {
      return { triples: [] };
    }

    // Étape 2: Utiliser les subject_ids pour filtrer les triples (sans demander subject dans la requête)
    const triplesQuery = `
      query GetTriples($where: triples_bool_exp) {
        triples(where: $where) {
          term_id
          subject_id
          predicate_id
          object_id
          block_number
          created_at
          transaction_hash
        }
      }
    `;

    const triplesVariables = {
      where: {
        subject_id: {
          _in: subjectIds,
        },
        predicate_id: {
          _eq: predicateId,
        },
        object_id: {
          _eq: objectId,
        },
      },
    };

    const triplesResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: triplesQuery,
        variables: triplesVariables,
      }),
    });

    const triplesResult = await triplesResponse.json();

    if (triplesResult.errors) {
      console.error(
        `[fetchTriplesByCreator] Erreurs GraphQL:`,
        triplesResult.errors
      );
      throw new Error(
        triplesResult.errors[0]?.message || "Erreur GraphQL inconnue"
      );
    }

    // Étape 3: Récupérer les détails des predicates et objects
    const triples = triplesResult.data?.triples || [];

    // Récupérer les IDs uniques de predicates et objects
    const predicateIds = [...new Set(triples.map((t: any) => t.predicate_id))];
    const objectIds = [...new Set(triples.map((t: any) => t.object_id))];

    // Récupérer les détails des predicates et objects
    const termsQuery = `
      query GetTerms($predicateIds: [String!]!, $objectIds: [String!]!) {
        predicates: atoms(where: { term_id: { _in: $predicateIds } }) {
          term_id
          label
          type
        }
        objects: atoms(where: { term_id: { _in: $objectIds } }) {
          term_id
          label
          type
        }
      }
    `;

    const termsResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: termsQuery,
        variables: {
          predicateIds,
          objectIds,
        },
      }),
    });

    const termsResult = await termsResponse.json();

    if (termsResult.errors) {
      console.error(
        `[fetchTriplesByCreator] Erreurs lors de la récupération des terms:`,
        termsResult.errors
      );
      // Continuer même si on ne peut pas récupérer les détails des terms
    }

    const predicatesMap = new Map(
      (termsResult.data?.predicates || []).map((p: any) => [p.term_id, p])
    );
    const objectsMap = new Map(
      (termsResult.data?.objects || []).map((o: any) => [o.term_id, o])
    );

    // Combiner les données : ajouter subject, predicate et object aux triples
    const enrichedTriples: Triple[] = triples.map((triple: any) => ({
      ...triple,
      subject: atomsMap.get(triple.subject_id) || {
        term_id: triple.subject_id,
        label: "",
        type: "",
        creator_id: creatorId,
      },
      predicate: predicatesMap.get(triple.predicate_id) || {
        term_id: triple.predicate_id,
        label: "",
        type: "",
      },
      object: objectsMap.get(triple.object_id) || {
        term_id: triple.object_id,
        label: "",
        type: "",
      },
    }));

    return { triples: enrichedTriples };
  } catch (error) {
    console.error(
      `[fetchTriplesByCreator] Erreur lors de la requête vers ${url}:`,
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
  const { PLAYER_TRIPLE_TYPES } = constants || {
    PLAYER_TRIPLE_TYPES: { PLAYER_GAME: { predicateId: "", objectId: "" } },
  };

  // Utiliser les valeurs par défaut si non fournies
  const finalPredicateId =
    predicateId || PLAYER_TRIPLE_TYPES.PLAYER_GAME.predicateId;
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

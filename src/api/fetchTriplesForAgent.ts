import { Network, API_URLS } from '../hooks/useAtomData';

// Fetch Triples filtered for Agent view
export const fetchTriplesForAgent = async (
  objectId: string,
  network: Network = Network.MAINNET,
  batchSize = 1000
) => {
  try {
    const apiUrl = API_URLS[network];
    
    // Étape 1: Récupérer les triples avec seulement les IDs (sans relations subject/predicate/object)
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query Triples_for_Agent($objectId: String!, $batchSize: Int!) {
            triples(limit: $batchSize, where: { object_id: { _eq: $objectId } }) {
              term_id
              subject_id
              predicate_id
              object_id
            }
          }
        `,
        variables: { objectId, batchSize }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors[0]?.message || 'GraphQL error');
    }

    const triples = data.data?.triples || [];
    
    if (triples.length === 0) {
      return [];
    }

    // Étape 2: Récupérer les détails des subjects, predicates et objects
    const subjectIds = [...new Set(triples.map((t: any) => t.subject_id).filter(Boolean))];
    const predicateIds = [...new Set(triples.map((t: any) => t.predicate_id).filter(Boolean))];
    const objectIds = [...new Set(triples.map((t: any) => t.object_id).filter(Boolean))];

    const atomsQuery = `
      query GetAtoms($subjectIds: [String!]!, $predicateIds: [String!]!, $objectIds: [String!]!) {
        subjects: atoms(where: { term_id: { _in: $subjectIds } }) {
          term_id
          label
          type
          image
        }
        predicates: atoms(where: { term_id: { _in: $predicateIds } }) {
          term_id
          label
          type
          image
        }
        objects: atoms(where: { term_id: { _in: $objectIds } }) {
          term_id
          label
          type
          image
        }
      }
    `;

    const atomsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: atomsQuery,
        variables: { subjectIds, predicateIds, objectIds }
      })
    });

    const atomsData = await atomsResponse.json();

    if (atomsData.errors) {
      console.error('Error fetching atoms details:', atomsData.errors);
      // Continuer même si on ne peut pas récupérer les détails
    }

    const subjectsMap = new Map(
      (atomsData.data?.subjects || []).map((a: any) => [a.term_id, a])
    );
    const predicatesMap = new Map(
      (atomsData.data?.predicates || []).map((a: any) => [a.term_id, a])
    );
    const objectsMap = new Map(
      (atomsData.data?.objects || []).map((a: any) => [a.term_id, a])
    );

    // Étape 3: Enrichir les triples avec les détails
    const enrichedTriples = triples.map((triple: any) => ({
      ...triple,
      subject: subjectsMap.get(triple.subject_id) || {
        term_id: triple.subject_id,
        label: '',
        type: '',
      },
      predicate: predicatesMap.get(triple.predicate_id) || {
        term_id: triple.predicate_id,
        label: '',
        type: '',
      },
      object: objectsMap.get(triple.object_id) || {
        term_id: triple.object_id,
        label: '',
        type: '',
      },
    }));

    return enrichedTriples;
  } catch (error) {
    console.error('Error fetching triples for agent:', error);
    return [];
  }
};





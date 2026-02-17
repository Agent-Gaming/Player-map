import { Network, API_URLS } from '../hooks/useAtomData';
import { convertIpfsUrlsInObject } from '../utils/ipfsUtils';

export const fetchTriplesForAgent = async (
  objectId: string,
  network: Network = Network.MAINNET,
  batchSize = 1000
) => {
  try {
    const apiUrl = API_URLS[network];
    
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
              subject {
                term_id
                label
                type
                image
              }
              predicate {
                term_id
                label
                type
                image
              }
              object {
                term_id
                label
                type
                image
              }
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
    
    // Convertir les URLs IPFS en HTTP pour les images
    const enrichedTriples = convertIpfsUrlsInObject(triples);

    return enrichedTriples;
  } catch (error) {
    console.error('Error fetching triples for agent:', error);
    return [];
  }
};





import { Network, API_URLS } from '../hooks/useAtomData';
import { convertIpfsUrlsInObject } from '../utils/ipfsUtils';

export const fetchClaimsBySubject = async (
  subjectId: string,
  network = Network.MAINNET
) => {
  try {
    const apiUrl = API_URLS[network];
    const allTriples: any[] = [];
    const batchSize = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query ClaimsBySubject($subjectId: String!, $limit: Int!, $offset: Int!) {
              triples(
                limit: $limit,
                offset: $offset,
                where: { subject_id: { _eq: $subjectId } }
              ) {
                term_id
                subject_id
                predicate_id
                object_id
                counter_term_id
                subject {
                  term_id
                  label
                  type
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
                  image
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
          variables: { subjectId, limit: batchSize, offset }
        })
      });

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(data.errors[0]?.message || 'GraphQL error');
      }

      const triples = data.data?.triples || [];
      
      if (triples.length === 0) {
        hasMore = false;
      } else {
        // Convertir les URLs IPFS en HTTP pour les images
        const enrichedTriples = convertIpfsUrlsInObject(triples);
        allTriples.push(...enrichedTriples);
        
        // Si on a reçu moins de batchSize résultats, c'est la dernière page
        if (triples.length < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
        }
      }
    }

    return allTriples;
  } catch (error) {
    console.error('Error fetching claims by subject:', error);
    return [];
  }
};

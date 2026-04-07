import { Network, API_URLS } from '../hooks/useAtomData';
import { apiCache } from '../utils/apiCache';

// Helper pour ajouter un délai entre les requêtes (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchPositions = async (
  accountId: string,
  network: Network = Network.MAINNET
) => {
  const cacheKey = `positions_${accountId}_${network}`; 
  return apiCache.withCache(
    cacheKey,
    { accountId, network },
    async () => {
      try {
        const apiUrl = API_URLS[network];
        const allPositions: any[] = [];
        const batchSize = 200;
        const maxBatches = 3;
        let offset = 0;
        let hasMore = true;
        let batchCount = 0;

        while (hasMore && batchCount < maxBatches) {
          batchCount++;
          
          if (batchCount > 1) {
            await delay(100);
          }
          
          // Une seule requête avec toutes les relations imbriquées
          const query = `query GetActivePositions($accountId: String!, $limit: Int!, $offset: Int!) {
            positions(where: { account_id: { _ilike: $accountId }, shares: { _gt: 0 } }, limit: $limit, offset: $offset) {
              id
              shares
              curve_id
              account_id
              term_id
              vault {
                deposits {
                  vault_type
                }
                redemptions {
                  vault_type
                }
              }
              account {
                id
                label
                image
              }
              term {
                id
                total_market_cap
                total_assets
                atom_id
                triple_id
                positions_aggregate(where: { shares: { _gt: 0 } }) {
                  aggregate { count }
                }
                atom {
                  term_id
                  label
                  image
                }
                triple {
                  term_id
                  subject_id
                  predicate_id
                  object_id
                  counter_term_id
                  subject {
                    term_id
                    label
                  }
                  subject_term {
                    id
                    triple {
                      subject { label term_id }
                      predicate { label }
                      object { label image term_id }
                    }
                  }
                  predicate {
                    term_id
                    label
                  }
                  object {
                    term_id
                    label
                    image
                  }
                  counter_term {
                    id
                    total_market_cap
                    total_assets
                    positions_aggregate(where: { shares: { _gt: 0 } }) {
                      aggregate { count }
                    }
                  }
                }
              }
            }
          }`;

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              variables: { accountId, limit: batchSize, offset }
            })
          });

          const data = await response.json();
          
          if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            throw new Error(data.errors[0]?.message || 'GraphQL error');
          }

          const positions = data.data?.positions || [];

          if (positions.length === 0) {
            hasMore = false;
          } else {
            // Remap: attach _innerTriple when subject.label is empty (nested triple)
            const remapped = positions.map((p: any) => {
              const triple = p.term?.triple;
              if (!triple || triple.subject?.label) return p;
              const innerTriple = triple.subject_term?.triple ?? null;
              if (!innerTriple) return p;
              return {
                ...p,
                term: {
                  ...p.term,
                  triple: { ...triple, _innerTriple: innerTriple },
                },
              };
            });
            allPositions.push(...remapped);
            
            if (positions.length < batchSize) {
              hasMore = false;
            } else {
              offset += batchSize;
            }
          }
          
          // Sécurité : éviter les boucles infinies
          if (offset > 5000) {
            console.warn('Limite de positions atteinte (5000)');
            hasMore = false;
          }
        }

    return allPositions;
      } catch (error) {
        console.error('Error fetching active positions:', error);
        return [];
      }
    },
    2 * 60 * 1000 // TTL de 2 minutes
  );
};

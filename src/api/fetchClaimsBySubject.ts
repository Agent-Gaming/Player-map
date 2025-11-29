import { Network, API_URLS } from '../hooks/useAtomData';

// Fetch Claims by Subject (atom as subject)
// Récupère toutes les claims par batch de 100 pour éviter la limite
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
      // Étape 1: Récupérer les triples avec seulement les IDs (sans relations)
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
        // Étape 2: Récupérer les détails des predicates et objects pour ce batch
        const predicateIds = [...new Set(triples.map((t: any) => t.predicate_id).filter(Boolean))];
        const objectIds = [...new Set(triples.map((t: any) => t.object_id).filter(Boolean))];

        if (predicateIds.length > 0 || objectIds.length > 0) {
          const atomsQuery = `
            query GetAtoms($predicateIds: [String!]!, $objectIds: [String!]!) {
              predicates: atoms(where: { term_id: { _in: $predicateIds } }) {
                term_id
                label
                type
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
              variables: { predicateIds, objectIds }
            })
          });

          const atomsData = await atomsResponse.json();

          if (!atomsData.errors && atomsData.data) {
            const predicatesMap = new Map(
              (atomsData.data.predicates || []).map((a: any) => [a.term_id, a])
            );
            const objectsMap = new Map(
              (atomsData.data.objects || []).map((a: any) => [a.term_id, a])
            );

            // Étape 3: Récupérer les détails des terms (term_id et counter_term_id)
            const allTermIds = [...new Set(
              triples.flatMap((t: any) => [t.term_id, t.counter_term_id]).filter(Boolean)
            )];

            let termsMap = new Map();
            let positionsCountMap = new Map<string, number>();

            if (allTermIds.length > 0) {
              // Fetch terms details
              const termsResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: `
                    query GetTerms($termIds: [String!]!) {
                      terms(where: { id: { _in: $termIds } }) {
                        id
                        total_market_cap
                        total_assets
                      }
                    }
                  `,
                  variables: { termIds: allTermIds }
                })
              });

              const termsData = await termsResponse.json();
              if (!termsData.errors) {
                termsMap = new Map(
                  (termsData.data?.terms || []).map((term: any) => [term.id, term])
                );

                // Fetch positions count for each term
                const positionPromises = allTermIds.map(async (termId: string): Promise<{ termId: string; count: number }> => {
                  const posResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      query: `
                        query GetPositionsCount($termId: String!) {
                          positions_aggregate(where: { term_id: { _eq: $termId }, shares: { _gt: 0 } }) {
                            aggregate {
                              count
                            }
                          }
                        }
                      `,
                      variables: { termId }
                    })
                  });
                  const posData = await posResponse.json();
                  return {
                    termId,
                    count: posData.data?.positions_aggregate?.aggregate?.count || 0
                  };
                });

                const positionResults = await Promise.all(positionPromises);
                positionResults.forEach((result) => {
                  positionsCountMap.set(result.termId, result.count);
                });
              }
            }

            // Enrichir les triples avec les détails
            const enrichedTriples = triples.map((triple: any) => {
              const term = termsMap.get(triple.term_id);
              const counterTerm = termsMap.get(triple.counter_term_id);

              return {
                ...triple,
                subject: {
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
                term: term ? {
                  ...term,
                  positions_aggregate: {
                    aggregate: {
                      count: positionsCountMap.get(triple.term_id) || 0
                    }
                  }
                } : null,
                counter_term: counterTerm ? {
                  ...counterTerm,
                  positions_aggregate: {
                    aggregate: {
                      count: positionsCountMap.get(triple.counter_term_id) || 0
                    }
                  }
                } : null,
              };
            });

            allTriples.push(...enrichedTriples);
          } else {
            // Si erreur, ajouter les triples sans détails
            allTriples.push(...triples);
          }
        } else {
          allTriples.push(...triples);
        }
        
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

import { useState, useEffect } from 'react';
import { Network, API_URLS } from './useAtomData';

// Hook personnalisé pour récupérer les triples avec les positions (GraphQL v2)
export const useDisplayTriplesWithPosition = (walletAddress: string) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!walletAddress) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Requête GraphQL v2 directe qui conserve la logique métier
        const query = `
          query GetTriplesWithPositions {
            triples {
              term_id
              counter_term_id
              subject_id
              predicate_id
              object_id
            }
          }
        `;

        const response = await fetch(API_URLS[Network.MAINNET], {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: {}
          })
        });

        const result = await response.json();

        if (result.errors) {
          console.error("GraphQL Errors:", result.errors);
          throw new Error(result.errors[0].message);
        }

        const triples = result.data.triples || [];
        const termIds = [...new Set(triples.flatMap((t: any) => [t.term_id, t.counter_term_id]).filter(Boolean))];

        // Fetch positions for all terms
        let positionsMap = new Map();
        if (termIds.length > 0) {
          const positionsQuery = `
            query GetPositions($termIds: [String!]!, $accountId: String!) {
              positions(where: { 
                term_id: { _in: $termIds },
                account_id: { _eq: $accountId }
              }) {
                account_id
                term_id
                shares
              }
            }
          `;

          const positionsResponse = await fetch(API_URLS[Network.MAINNET], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: positionsQuery,
              variables: { termIds, accountId: walletAddress }
            })
          });

          const positionsResult = await positionsResponse.json();
          if (!positionsResult.errors) {
            (positionsResult.data?.positions || []).forEach((pos: any) => {
              if (!positionsMap.has(pos.term_id)) {
                positionsMap.set(pos.term_id, []);
              }
              positionsMap.get(pos.term_id).push(pos);
            });
          }
        }

        // Fetch term details
        let termsMap = new Map();
        if (termIds.length > 0) {
          const termsQuery = `
            query GetTerms($termIds: [String!]!) {
              terms(where: { id: { _in: $termIds } }) {
                id
                total_market_cap
                total_assets
              }
            }
          `;

          const termsResponse = await fetch(API_URLS[Network.MAINNET], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: termsQuery,
              variables: { termIds }
            })
          });

          const termsResult = await termsResponse.json();
          if (!termsResult.errors) {
          termsMap = new Map(
            (termsResult.data?.terms || []).map((term: any) => [term.id, term])
          );
          }
        }

        // Enrich triples with term details and positions
        const enrichedTriples = triples.map((triple: any) => ({
          ...triple,
          term: termsMap.get(triple.term_id) ? {
            id: triple.term_id,
            ...termsMap.get(triple.term_id),
            positions: positionsMap.get(triple.term_id) || []
          } : null,
          counter_term: termsMap.get(triple.counter_term_id) ? {
            id: triple.counter_term_id,
            ...termsMap.get(triple.counter_term_id),
            positions: positionsMap.get(triple.counter_term_id) || []
          } : null
        }));

        const transformedData = {
          triples: enrichedTriples,
          positions: Array.from(positionsMap.values()).flat()
        };
        setData(transformedData);
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors de la récupération des triples:", err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchData();
  }, [walletAddress]);

  return { data, loading, error };
};
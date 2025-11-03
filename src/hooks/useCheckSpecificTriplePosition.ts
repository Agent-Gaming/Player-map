import { useState, useEffect } from 'react';
import { Network, API_URLS } from "./useAtomData";

interface UseCheckSpecificTriplePositionProps {
  walletAddress: string;
  tripleId: string | number;
  network?: Network;
}

export const useCheckSpecificTriplePosition = ({
  walletAddress,
  tripleId,
  network = Network.MAINNET
}: UseCheckSpecificTriplePositionProps) => {
  const [hasPosition, setHasPosition] = useState<boolean>(false);
  const [isFor, setIsFor] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [termPositionCount, setTermPositionCount] = useState<number>(0);
  const [counterTermPositionCount, setCounterTermPositionCount] = useState<number>(0);
  useEffect(() => {
    const fetchData = async () => {
      if (!walletAddress || !tripleId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
          const apiUrl = API_URLS[network];

          // Directly query the current user's position on the specific triple
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                query GetTripleUserPosition($tripleId: String!, $walletAddress: String!) {
                  # Get the triple with vault information
                  triple(term_id: $tripleId) {
                    term_id
                    subject {
                      label
                    }
                    predicate {
                      label
                    }
                    object {
                      label
                    }
                    term_id
                    counter_term_id
                    
                    # Get vault positions (user only)
                    term {
                      id
                      positions_aggregate(where: {account: {id: {_ilike: $walletAddress}}, shares: {_gt: 0}}) {
                        aggregate {
                          count
                        }
                        nodes {
                          id
                        }
                      }
                    }
                    
                    # Get counter vault positions (user only)
                    counter_term {
                      id
                      positions_aggregate(where: {account: {id: {_ilike: $walletAddress}}, shares: {_gt: 0}}) {
                        aggregate {
                          count
                        }
                        nodes {
                          id
                        }
                      }
                    }
                  }
                }
              `,
              variables: {
                tripleId: String(tripleId),
                walletAddress: walletAddress.toLowerCase()
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`GraphQL request failed with status ${response.status}`);
          }

          const result = await response.json();

          if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
          }

          // Check if user has a position in any of the queried places
          const tripleInfo = result.data?.triple;
          if (!tripleInfo) {
          setHasPosition(false);
          setIsFor(null);
          setLoading(false);
          return;
          }

          const hasTermPositions = tripleInfo.term?.positions_aggregate?.aggregate?.count > 0 || tripleInfo.term?.positions_aggregate?.nodes?.length > 0;
          const hasCounterTermPositions = tripleInfo.counter_term?.positions_aggregate?.aggregate?.count > 0 || tripleInfo.counter_term?.positions_aggregate?.nodes?.length > 0;
        setTermPositionCount(tripleInfo.term?.positions_aggregate?.aggregate?.count || 0);
        setCounterTermPositionCount(tripleInfo.counter_term?.positions_aggregate?.aggregate?.count || 0);

          // Set states based on position findings
          const foundPosition = hasTermPositions || hasCounterTermPositions;
          
        setHasPosition(foundPosition);

        if (foundPosition) {
          setIsFor(hasTermPositions);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error checking triple position:", err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchData();
  }, [walletAddress, tripleId, network]);

  return { hasPosition, isFor, loading, error, termPositionCount, counterTermPositionCount };
}; 
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
                  triple(term_id: $tripleId) {
                    term_id
                    subject_id
                    predicate_id
                    object_id
                    counter_term_id
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

          const tripleInfo = result.data?.triple;
          if (!tripleInfo || !tripleInfo.term_id) {
            setHasPosition(false);
            setIsFor(null);
            setLoading(false);
            return;
          }

          // Fetch term and counter_term positions separately
          const termId = tripleInfo.term_id;
          const counterTermId = tripleInfo.counter_term_id;

          const [termResponse, counterTermResponse] = await Promise.all([
            termId ? fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `
                  query GetTermPositions($termId: String!, $walletAddress: String!) {
                    positions(where: { term_id: { _eq: $termId }, account_id: { _ilike: $walletAddress }, shares: { _gt: 0 } }) {
                      id
                    }
                  }
                `,
                variables: {
                  termId,
                  walletAddress: walletAddress.toLowerCase()
                },
              }),
            }) : Promise.resolve(null),
            counterTermId ? fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `
                  query GetCounterTermPositions($termId: String!, $walletAddress: String!) {
                    positions(where: { term_id: { _eq: $termId }, account_id: { _ilike: $walletAddress }, shares: { _gt: 0 } }) {
                      id
                    }
                  }
                `,
                variables: {
                  termId: counterTermId,
                  walletAddress: walletAddress.toLowerCase()
                },
              }),
            }) : Promise.resolve(null),
          ]);

          const termData = termResponse ? await termResponse.json() : { data: { positions: [] } };
          const counterTermData = counterTermResponse ? await counterTermResponse.json() : { data: { positions: [] } };

          const termPositionsCount = termData.data?.positions?.length || 0;
          const counterTermPositionsCount = counterTermData.data?.positions?.length || 0;

          const hasTermPositions = termPositionsCount > 0;
          const hasCounterTermPositions = counterTermPositionsCount > 0;
          
          setTermPositionCount(termPositionsCount);
          setCounterTermPositionCount(counterTermPositionsCount);

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
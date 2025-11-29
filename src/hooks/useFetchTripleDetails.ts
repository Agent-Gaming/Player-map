import { useState } from "react";
import { Network, API_URLS } from "./useAtomData";
import { GetTripleDocument, fetcher } from '@0xintuition/graphql';

// Interface for triple details returned from GraphQL v2
export interface TripleDetails {
  id: string;
  subject?: {
    label: string;
  };
  predicate?: {
    label: string;
  };
  object?: {
    label: string;
  };
  term_id?: string;
  term_position_count?: number;
  counter_term_id?: string;
  counter_term_position_count?: number;
}

interface UseFetchTripleDetailsProps {
  network?: Network;
  onError?: (message: string) => void;
}

export const useFetchTripleDetails = ({
  network = Network.MAINNET,
  onError
}: UseFetchTripleDetailsProps = {}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch triple details via GraphQL v2
  const fetchTripleDetails = async (tripleId: string): Promise<TripleDetails | null> => {
    setIsLoading(true);

    try {
      // Utiliser le package @0xintuition/graphql pour v2
      const apiUrl = API_URLS[network];
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
          query Triple($tripleId: String!) {
            triple(term_id: $tripleId) {
              term_id
              subject_id
              predicate_id
              object_id
              counter_term_id
            }
          }
        `,

          variables: { tripleId: tripleId.toString() },
        }),
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      if (!result.data?.triple) {
        if (onError) {
          onError(`Triple with ID ${tripleId} not found`);
        }
        setIsLoading(false);
        return null;
      }

      const triple = result.data.triple;
      const { subject_id, predicate_id, object_id, term_id, counter_term_id } = triple;

      // Fetch subject, predicate, object details
      const atomsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetAtoms($termIds: [String!]!) {
              atoms(where: { term_id: { _in: $termIds } }) {
                term_id
                label
              }
            }
          `,
          variables: { termIds: [subject_id, predicate_id, object_id].filter(Boolean) }
        }),
      });

      const atomsData = await atomsResponse.json();
      const atomsMap = new Map(
        (atomsData.data?.atoms || []).map((atom: any) => [atom.term_id, atom])
      );

      // Fetch term and counter_term details
      const termIds = [term_id, counter_term_id].filter(Boolean);
      let termDetailsMap = new Map();
      
      if (termIds.length > 0) {
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
            variables: { termIds }
          }),
        });

        const termsData = await termsResponse.json();
        termDetailsMap = new Map(
          (termsData.data?.terms || []).map((term: any) => [term.id, term])
        );
      }

      const termDetails = termDetailsMap.get(term_id);
      const counterTermDetails = termDetailsMap.get(counter_term_id);

      // Fetch positions count separately
      const [termPositionsResponse, counterTermPositionsResponse] = await Promise.all([
        term_id ? fetch(apiUrl, {
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
            variables: { termId: term_id }
          })
        }) : Promise.resolve(null),
        counter_term_id ? fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetCounterPositionsCount($termId: String!) {
                positions_aggregate(where: { term_id: { _eq: $termId }, shares: { _gt: 0 } }) {
                  aggregate {
                    count
                  }
                }
              }
            `,
            variables: { termId: counter_term_id }
          })
        }) : Promise.resolve(null),
      ]);

      const termPositionsData = termPositionsResponse ? await termPositionsResponse.json() : { data: { positions_aggregate: { aggregate: { count: 0 } } } };
      const counterTermPositionsData = counterTermPositionsResponse ? await counterTermPositionsResponse.json() : { data: { positions_aggregate: { aggregate: { count: 0 } } } };

      setIsLoading(false);
      return {
        id: String(tripleId),
        subject: atomsMap.get(subject_id) || { term_id: subject_id, label: '' },
        predicate: atomsMap.get(predicate_id) || { term_id: predicate_id, label: '' },
        object: atomsMap.get(object_id) || { term_id: object_id, label: '' },
        term_id: term_id,
        counter_term_id: counter_term_id,
        term_position_count: termPositionsData.data?.positions_aggregate?.aggregate?.count || 0,
        counter_term_position_count: counterTermPositionsData.data?.positions_aggregate?.aggregate?.count || 0
      };
    } catch (error) {

      if (onError) {
        onError(`Error fetching details for triple ${tripleId}: ${error instanceof Error ? error.message : String(error)}`);
      }
      setIsLoading(false);
      return null;
    }
  };

  return {
    fetchTripleDetails,
    isLoading
  };
};
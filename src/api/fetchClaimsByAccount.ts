// THIS QUERY IS NOT USED ACTUALLY

import { Network, API_URLS } from '../hooks/useAtomData';

// Fetch Claims by Account
export const fetchClaimsByAccount = async (
  accountId: string,
  network = Network.MAINNET
) => {
  try {
    const apiUrl = API_URLS[network];
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
        query ClaimsByAccount($accountId: String!) {
          triples(where: { creator_id: { _eq: $accountId } }) {
            term_id
            subject_id
            predicate_id
            object_id
            counter_term_id
          }
        }
      `,
        variables: { accountId }
      })
    });

    const data = await response.json();
    const triples = data.data?.triples || [];

    if (triples.length === 0) {
      return [];
    }

    // Fetch atoms details
    const allAtomIds = [...new Set(
      triples.flatMap((t: any) => [t.subject_id, t.predicate_id, t.object_id]).filter(Boolean)
    )];

    let atomsMap = new Map();
    if (allAtomIds.length > 0) {
      const atomsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetAtoms($termIds: [String!]!) {
              atoms(where: { term_id: { _in: $termIds } }) {
                term_id
                label
                type
                image
              }
            }
          `,
          variables: { termIds: allAtomIds }
        })
      });

      const atomsData = await atomsResponse.json();
      if (!atomsData.errors) {
        atomsMap = new Map(
          (atomsData.data?.atoms || []).map((atom: any) => [atom.term_id, atom])
        );
      }
    }

    // Fetch terms details
    const allTermIds = [...new Set(
      triples.flatMap((t: any) => [t.term_id, t.counter_term_id]).filter(Boolean)
    )];

    let termsMap = new Map();
    if (allTermIds.length > 0) {
      const termsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetTerms($termIds: [String!]!) {
              terms(where: { id: { _in: $termIds } }) {
                id
                total_market_cap
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
      }
    }

    // Fetch positions count for all terms
    const positionsResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetPositionsCount($termIds: [String!]!) {
            positions_aggregate(where: { term_id: { _in: $termIds }, shares: { _gt: 0 } }) {
              aggregate {
                count
              }
            }
          }
        `,
        variables: { termIds: allTermIds }
      })
    });

    const positionsData = await positionsResponse.json();
    const positionsCountMap = new Map();
    if (!positionsData.errors && positionsData.data?.positions_aggregate) {
      // Note: positions_aggregate retourne un seul résultat pour tous les termIds
      // Il faudrait faire une requête par term_id pour avoir le détail
      // Pour l'instant, on met 0 par défaut
      allTermIds.forEach((termId) => {
        positionsCountMap.set(termId, 0);
      });
    }

    // Enrich triples
    return triples.map((triple: any) => ({
      ...triple,
      subject: atomsMap.get(triple.subject_id) || { term_id: triple.subject_id, label: '', type: '', image: null },
      predicate: atomsMap.get(triple.predicate_id) || { term_id: triple.predicate_id, label: '', type: '' },
      object: atomsMap.get(triple.object_id) || { term_id: triple.object_id, label: '', type: '', image: null },
      term: termsMap.get(triple.term_id) ? {
        ...termsMap.get(triple.term_id),
        positions_aggregate: { aggregate: { count: positionsCountMap.get(triple.term_id) || 0 } }
      } : { id: triple.term_id, total_market_cap: 0, positions_aggregate: { aggregate: { count: 0 } } },
      counter_term: termsMap.get(triple.counter_term_id) ? {
        ...termsMap.get(triple.counter_term_id),
        positions_aggregate: { aggregate: { count: positionsCountMap.get(triple.counter_term_id) || 0 } }
      } : { id: triple.counter_term_id, total_market_cap: 0, positions_aggregate: { aggregate: { count: 0 } } }
    }));
  } catch (error) {
    console.error('Error fetching claims by account:', error);
    return [];
  }
};





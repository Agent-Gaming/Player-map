import { Network, API_URLS } from '../hooks/useAtomData';
import { apiCache } from '../utils/apiCache';
import { filterAtomImage, filterTripleImages } from '../config/atomFiltering';

// Helper pour ajouter un délai entre les requêtes
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to fetch all data from a query with pagination
const fetchAllWithPagination = async (
  apiUrl: string,
  query: string,
  variables: any,
  dataPath: string,
  batchSize: number = 50 // Réduit à 50
): Promise<any[]> => {
  const allResults: any[] = [];
  let offset = 0;
  let hasMore = true;
  const maxBatches = 5; // Limite à 5 batches (250 résultats max)
  let batchCount = 0;

  while (hasMore && batchCount < maxBatches) {
    batchCount++;
    
    // Délai entre les batches
    if (batchCount > 1) {
      await delay(200);
    }
    
    const response = await fetch(apiUrl, { // Utiliser apiUrl au lieu de import.meta.env
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { ...variables, limit: batchSize, offset }
      })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors[0]?.message || 'GraphQL error');
    }

    const results = data.data?.[dataPath] || [];
    
    if (results.length === 0) {
      hasMore = false;
    } else {
      allResults.push(...results);
      
      // Si on a reçu moins de batchSize résultats, c'est la dernière page
      if (results.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    }
  }

  return allResults;
};

// Fetch Activity History by Account (all deposits and redemptions)
// Récupère toutes les activités par batch de 50 pour éviter la limite
export const fetchActivityHistory = async (
  accountId: string,
  network: Network = Network.MAINNET
) => {
  const cacheKey = `activity_${accountId}_${network}`;
  
  return apiCache.withCache(
    cacheKey,
    { accountId, network },
    async () => {
      try {
        const apiUrl = API_URLS[network];
        const batchSize = 50; // Réduit à 50

    // Query pour deposits
    const depositsQuery = `
      query GetDeposits($accountId: String!, $limit: Int!, $offset: Int!) {
        deposits(
          limit: $limit,
          offset: $offset,
          where: { sender_id: { _eq: $accountId } }
        ) {
          id
          shares
          assets_after_fees
          created_at
          vault_type
          term_id
        }
      }
    `;

    // Query pour redemptions
    const redemptionsQuery = `
      query GetRedemptions($accountId: String!, $limit: Int!, $offset: Int!) {
        redemptions(
          limit: $limit,
          offset: $offset,
          where: { sender_id: { _eq: $accountId } }
        ) {
          id
          shares
          assets
          created_at
          vault_type
          term_id
        }
      }
    `;

    // Récupérer deposits et redemptions en parallèle
    const [deposits, redemptions] = await Promise.all([
      fetchAllWithPagination(apiUrl, depositsQuery, { accountId }, 'deposits', batchSize),
      fetchAllWithPagination(apiUrl, redemptionsQuery, { accountId }, 'redemptions', batchSize)
    ]);

    // Fetch term details for all activities
    const allTermIds = [...new Set([
      ...deposits.map((d: any) => d.term_id),
      ...redemptions.map((r: any) => r.term_id)
    ].filter(Boolean))];

    let termsMap = new Map();
    let triplesMap = new Map();
    let atomsMap = new Map();
    
    if (allTermIds.length > 0) {
      // Délai avant la requête des terms
      await delay(100);
      
      // Fetch terms
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
                atom_id
                triple_id
                positions_aggregate(where: { shares: { _gt: 0 } }) {
                  aggregate { count }
                }
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

        // Fetch triples
        const tripleIds = [...new Set((termsData.data?.terms || []).map((t: any) => t.triple_id).filter(Boolean))];
        if (tripleIds.length > 0) {
          await delay(100); // Délai avant la requête des triples
          const triplesResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                query GetTriples($tripleIds: [String!]!) {
                  triples(where: { term_id: { _in: $tripleIds } }) {
                    term_id
                    subject_id
                    predicate_id
                    object_id
                    counter_term_id                    subject { term_id label image }
                    predicate { term_id label }
                    object { term_id label image }
                    counter_term {
                      id
                      positions_aggregate(where: { shares: { _gt: 0 } }) {
                        aggregate { count }
                      }
                    }                  }
                }
              `,
              variables: { tripleIds }
            })
          });

          const triplesData = await triplesResponse.json();
          if (!triplesData.errors) {
            // Appliquer le filtre de vérification aux triples
            const filteredTriples = (triplesData.data?.triples || []).map((triple: any) => filterTripleImages(triple));
            
            triplesMap = new Map(
              filteredTriples.map((triple: any) => [triple.term_id, triple])
            );
            // atoms already embedded in triples (subject/predicate/object)
            filteredTriples.forEach((triple: any) => {
              if (triple.subject) atomsMap.set(triple.subject_id, triple.subject);
              if (triple.predicate) atomsMap.set(triple.predicate_id, triple.predicate);
              if (triple.object) atomsMap.set(triple.object_id, triple.object);
            });
          }
        }

        // Fetch atoms for terms
        const atomIds = [...new Set((termsData.data?.terms || []).map((t: any) => t.atom_id).filter(Boolean))];
        if (atomIds.length > 0) {
          await delay(100); // Délai avant la requête des atoms
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
              variables: { termIds: atomIds }
            })
          });

          const atomsData = await atomsResponse.json();
          if (!atomsData.errors) {
            (atomsData.data?.atoms || []).forEach((atom: any) => {
              if (!atomsMap.has(atom.term_id)) {
                atomsMap.set(atom.term_id, atom);
              }
            });
          }
        }
      }
    }

    // Enrich activities with term details
    const enrichActivity = (activity: any) => {
      const term = termsMap.get(activity.term_id);
      if (!term) return { ...activity, term: null };

      const triple = triplesMap.get(term.triple_id);
      const atom = atomsMap.get(term.atom_id);

      let enrichedTerm: any = {
        id: term.id,
        total_market_cap: term.total_market_cap,
        total_assets: term.total_assets,
        atom: atom ? { label: atom.label } : null,
        triple: null
      };

      if (triple) {
        const counterTerm = triple.counter_term || null;
        enrichedTerm.triple = {
          subject: triple.subject || atomsMap.get(triple.subject_id) || { label: '' },
          predicate: triple.predicate || atomsMap.get(triple.predicate_id) || { label: '' },
          object: triple.object || atomsMap.get(triple.object_id) || { label: '' },
          counter_term: counterTerm ? {
            id: counterTerm.id,
            positions_aggregate: counterTerm.positions_aggregate || null,
          } : null
        };
        enrichedTerm.positions_aggregate = term.positions_aggregate || null;
      }

      return { ...activity, term: enrichedTerm };
    };

    // Add type field to distinguish between deposits and redemptions
    const activities = [
      ...deposits.map((deposit: any) => enrichActivity({ ...deposit, activity_type: 'deposit' })),
      ...redemptions.map((redemption: any) => enrichActivity({ ...redemption, activity_type: 'redemption' }))
    ];

    // Sort by created_at (most recent first)
    return activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } catch (error) {
        console.error('Error fetching activity history:', error);
        return [];
      }
    },
    2 * 60 * 1000 // TTL de 2 minutes
  );
};
